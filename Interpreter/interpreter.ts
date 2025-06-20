import { NodeType, pointer, bitValue, treeNode, Ops, type runtimeType } from "./ast";
import {Environment} from "./environment"
import { Reverse } from "./utility";


function* EvaluateNode(node: treeNode, env: Environment):Generator<treeNode> {
    switch(node.type){
        case NodeType.Program:
            for(let i = 0; i<node.children.length;i++){
                if(node.children[i] != undefined){
                    performance.mark("step-root-node")
                    yield* EvaluateNode(node.children[i],env)
                }
            }
            env.running = false
            break
        case NodeType.Range:
            //parsed into a pointer at the AST.
            yield* EvaluateNode(node.children[0],env)
            let s = env.pop()?.AsUInt()
            yield* EvaluateNode(node.children[1],env)
            let l = env.pop()?.AsUInt();
    
            if(s == undefined){
                throw new Error("oopsie, bad thingy in the pointer.")
            }else if (l == undefined){
                 throw new Error("oopsie. so length in the range is supposed to be optional but that's not supported yet.")
            }
            let ploc = s % 64
            let p =new pointer(ploc,l, env)
            env.push(p)
            yield node
            break;
        case NodeType.Identifier:
            var range = env.GetRangeFromIdent(node.source);
            if(range){
                env.push(range);
                yield node
                return
            }
            throw new Error("Unknown identifier "+node.source);
                
            case NodeType.ProcCall:
            let id = node.children[0].source.trim()
            if(id in env.procedures){
                let body = env.procedures[id]
                if(body != undefined){
                    yield node
                    for(let i = 0; i<body.length;i++){
                        let n = body[i];
                        if(n != undefined){
                            yield* EvaluateNode(n,env)
                        }else{
                            throw new Error("undefined body item in procedure.")
                        }
                    }
                    return
                }
                return;
            }else{
                throw new Error("Unknown procedure name "+id);
            }
            
            break
        case NodeType.Declare:
            yield* EvaluateNode(node.children[1],env)
            let decPointerTo = env.pop();
            if(node.children[0].type == NodeType.Identifier){
                let assigneeString = node.children[0].source
                //if it is a range, update or set assignee.
                if(decPointerTo instanceof pointer){
                    console.log("dec", assigneeString, decPointerTo)
                    env.SetOrAssign(assigneeString, decPointerTo)
                    yield node
                    return
                }else{ 
                    throw new Error("Can only declare a pointer to an identity.");
                }
            }
            break;
        case NodeType.Assign:
            //Assign is two nodes, assignment (pointer = value) and declaration (unseen id = value)

            yield* EvaluateNode(node.children[1],env)
            let valueOrRange = env.pop();
            //Let's check if we are assigning to an identifier.
            if(node.children[0].type == NodeType.Identifier){
                let assigneeString = node.children[0].source
                //if it is a range, update or set assignee.
                if(valueOrRange instanceof pointer){

                    var assignee = env.GetRangeFromIdent(assigneeString)
                    console.log("assign to", valueOrRange, assignee, assigneeString)

                    if(assignee != undefined){
                        env.Copy(valueOrRange, assignee);
                    }else{
                        throw new Error("Unknown identifier "+assigneeString+". Variables need to be declared with the ':=' operator.")
                    }
                    yield node
                    return
                }
                //todo: this can, i think, be handled by the below case?
                if(valueOrRange instanceof bitValue){
                    var assignee = env.GetRangeFromIdent(assigneeString)
                    if(assignee == undefined){
                        throw new Error("unknown identifier: "+assigneeString+". To declare variable, use the ':=' operator.")
                    }
                    env.Set(assignee, valueOrRange)
                    yield node
                    return
                }
                throw new Error("this case should be handled");

            }

            yield* EvaluateNode(node.children[0], env)
            let pointerNode = env.pop();           
           
            if(pointerNode != undefined){
                if(pointerNode instanceof pointer){
                    if(valueOrRange instanceof pointer){
                        env.Copy(valueOrRange, pointerNode)
                        yield node
                        return
                    }else if(valueOrRange instanceof bitValue){
                        env.Set(pointerNode, valueOrRange)
                        yield node
                        return
                    }
                }
                throw new Error("this case should be handled, sorry");
            }
            
            
            break;
        case NodeType.Literal:
            //[number.sourceString,suffix.sourceString]
            let suffix = node.children[1];
            if(suffix == "u" || suffix == "" || suffix == undefined){
                let num = parseInt(node.children[0])
                var v = new bitValue();
                v.SetByUint(num);
                env.push(v);
                yield node
            }else if(suffix == "s"){
                throw new Error("signed integers not yet supported.");
            }else if(suffix =="f"){
                throw new Error("floating point integers not yet supported.");
            }
            break;
        case NodeType.UnaryOp:
            yield* EvaluateNode(node.children[1], env)
            let operand = env.pop();
            let unary = DoUnary(node.children[0], operand, env)
            env.push(unary);
            yield node
            break;
        case NodeType.BinaryOp:
            yield* EvaluateNode(node.children[1], env)
            let left = env.pop();
            yield* EvaluateNode(node.children[2], env)
            let right = env.pop();
            let binary = DoBinary(node.children[0], left, right, env);
            env.push(binary);
            yield node
            break
        case NodeType.Call:
            //just get the fname without evaluating the identity.
            let fname = node.children[0].source
            let args = []
            let argNodes = node.children[1]
            for(let i =0;i< argNodes.length;i++){
                yield* EvaluateNode(argNodes[i],env)
                args.push(env.pop())
            }
            DoCall(fname, args, env);
            yield node
            break;
        case NodeType.While:
            yield* EvaluateNode(node.children[0], env)
            let whilebreakcounter = 0
            while(Truthy(env.pop())){
                //do body
                for(let i = 0; i<node.children[1].length;i++){
                    yield* EvaluateNode(node.children[1][i],env)
                }
                //back to top. now reevaluate node.
                whilebreakcounter++
                if(whilebreakcounter > 1024){
                    throw new Error("Loop overflow exception! 1024 is max loop count.")
                }
                yield* EvaluateNode(node.children[0],env)
            }
            //yield node
            break
        case NodeType.For:
             if(node.children[0].type === NodeType.Literal){
                //todo: move this logic to parser, by changing expression to range or identifier only, no literals.
                throw new Error("Invalid argument for for loop.")        
            }
            yield* EvaluateNode(node.children[0], env)
            let forbreakcounter = 0
            //while
            while(Truthy(env.pop())){
                
                //do body
                for(let i = 0; i<node.children[1].length;i++){
                    yield* EvaluateNode(node.children[1][i],env)
                }
                //back to top. now reevaluate node.
                forbreakcounter++
                if(forbreakcounter > 1024){
                    throw new Error("Loop overflow exception! 1024 is max loop count.")
                }
                //for is the same as while, but we automatically do a decrement.
                //this is super broken if we give it something other than a pointer.
                yield* EvaluateNode(node.children[0],env)
               
                var x = DoUnary(Ops.Dec, env.pop(),env);
                env.push(x)
            }
            yield node
            break
        case NodeType.If:
                yield* EvaluateNode(node.children[0], env)
                if(Truthy(env.pop())){
                    //do body
                    for(let i = 0; i<node.children[1].length;i++){
                        yield* EvaluateNode(node.children[1][i],env)
                    }
                }else{
                    //do else/alternative.
                    if(node.children.length == 3){
                        for(let i = 0; i<node.children[2].length;i++){
                            yield* EvaluateNode(node.children[2][i],env)
                        }
                    }
                }
                //yield node
            break
        case NodeType.IfZ:
                yield* EvaluateNode(node.children[0], env)
                if(!Truthy(env.pop())){
                    //do body
                    for(let i = 0; i<node.children[1].length;i++){
                        yield* EvaluateNode(node.children[1][i],env)
                    }
                }else{
                    //do else/alternative.
                    if(node.children.length == 3){
                        for(let i = 0; i<node.children[2].length;i++){
                            yield* EvaluateNode(node.children[2][i],env)
                        }
                    }
                }
                //yield node
            break
    }
}
function Truthy(element: runtimeType): boolean{
    if(element instanceof pointer){
        return element.AsUInt() != 0
    }
    if(element instanceof bitValue){
        return element.AsUInt() != 0
    }
    throw new Error("uh oh");}

function DoCall(fname: string, args: runtimeType[], env: Environment){
    switch(fname){
        case "pc":
        case "printchar":
        case "putchar":
            CheckArgumentCount(fname, args, 1);
            let out = args[0]
            if(out instanceof treeNode){
                throw Error("Invalid Argument.");
            }
            if(out instanceof pointer){
                env.Print(out.AsChar())
                return;
            }
            if(out instanceof bitValue){
                env.Print(out.AsChar())
            }
            
        break;
        case "pi":
        case "print":
        case "printint":
        case "putint":
            CheckArgumentCount(fname, args, 1);
            let intout = args[0]
            if(intout instanceof treeNode){
                throw Error("Invalid Argument.");
            }
            if(intout instanceof pointer){
                env.Print(intout.AsUInt().toString())
                return;
            }
            if(intout instanceof bitValue){
                env.Print(intout.AsUInt().toString())
            }
        break;
        case "putbin":
        case "pb":
        case "printbin":
        case "printbinary":
        case "putbin":
        case "putbinary":
            CheckArgumentCount(fname, args, 1);
            let binout = args[0]
            if(binout instanceof treeNode){
                throw Error("Invalid Argument.");
            }
            if(binout instanceof pointer){
                env.Print(binout.AsBin())
                return;
            }
            if(binout instanceof bitValue){
                env.Print(binout.AsBin())
            }
        break;
        case "pixel":
        case "px":
        case "setpixel":
            if(args.length == 2){
                CheckArgumentCount(fname, args, 2);
                let i = args[0]?.AsUInt()
                let c = args[1]?.AsUInt()
                if(i == undefined || c == undefined){
                    throw console.error(("Bad argument"));
                }
                env.SetPixel(i,c)
            }else if(args.length == 3){
                CheckArgumentCount(fname, args, 3)
                let x = args[0]?.AsUInt()
                let y = args[1]?.AsUInt()
                let c = args[2]?.AsUInt()

                if(x == undefined || y == undefined || c == undefined){
                    throw console.error(("Bad argument"));
                }
                env.SetPixel(y*(env.displaySize)+x,c)
            }
    }
}

function DoBinary(op: Ops, left: runtimeType, right: runtimeType, env: Environment){
    if(left == undefined){
        throw Error("uh?");
    }
    if(right == undefined){
        throw Error("uh?");
    }
    switch(op){
        case Ops.And:
            var l = Math.max(left.length, right.length)
            for(var i = 0;i<l;i++){
                left.SetBit(i, left.GetBit(i) && right.GetBit(i))
            }
            return left;
        break
        case Ops.Or:
            var l = Math.max(left.length, right.length)
            for(var i = 0;i<l;i++){
                left.SetBit(i, left.GetBit(i) || right.GetBit(i))
            }
            return left;
        break
        case Ops.Xor:
            var l = Math.max(left.length, right.length)
            for(var i = 0;i<l;i++){
                left.SetBit(i, left.GetBit(i) !== right.GetBit(i))
            }
            return left;
        break
        case Ops.Plus:
            var l = Math.max(left.length, right.length)
            var carryin = false;
            for(var i = 0;i<l;i++){
                var lb = left.GetBit(i);
                var rb = right.GetBit(i); 
                let suma = lb !== rb;
                let sumb = suma !== carryin
                carryin = lb && rb || carryin && suma;
                left.SetBit(i, sumb)
            }
            return left;
        break
        case Ops.ShiftRight:
            let timesRight = right.AsUInt()
            if(timesRight< 0)
            {
                throw new Error("invalid operand for CycleRight")
            }
            for(var i = 0;i<timesRight;i++){
                left = DoUnary(Ops.ShiftRight, left, env)
            }
            break
        case Ops.ShiftLeft:
            let timesLeft = right.AsUInt()
            if(timesLeft< 0)
            {
                throw new Error("invalid operand for CycleRight")
            }
            for(var i = 0;i<timesLeft;i++){
                left = DoUnary(Ops.ShiftLeft, left, env)
            }
            break
        case Ops.CycleLeft:
            let cltimes = right.AsUInt();
            cltimes = cltimes % left.length;
  
            let temparr = left.GetDataCopy(); 
            // Reverse the entire array
            temparr.reverse();
        
            // Reverse the first d elements
            Reverse(temparr, 0, cltimes - 1);

            // Reverse the remaining n-d elements
            Reverse(temparr, cltimes, left.length - 1);

            for(var i = 0;i<left.length;i++){
                let b = temparr[i]
                if(b != undefined){
                    left.SetBit(i, b)
                }
            }
            break
        case Ops.CycleRight:
            let crtimes = right.AsUInt();
            crtimes = crtimes % left.length;
  
            let temparr2 = left.GetDataCopy(); 
    
        
            // Reverse the first d elements
            Reverse(temparr2, 0, crtimes - 1);

            // Reverse the remaining n-d elements
            Reverse(temparr2, crtimes, left.length - 1);

            // Reverse the entire array
            temparr2.reverse();

            for(var i = 0;i<left.length;i++){
                let b = temparr2[i]
                if(b != undefined){
                    left.SetBit(i, b)
                }
            }
            break
        default:
            throw new Error("binary op "+Ops[op]+ " not (yet?) supported")
    }
    //todo: create an interface that allows pointers and values to avoid a nested nightmare of if/elses for getting/setting bits. 
    return undefined
}

function DoUnary(op: Ops, operand: runtimeType, env: Environment): runtimeType{
    if(operand === undefined){
        throw new Error("uh oh")
    }
    switch (op){
        case Ops.Not:
            for(let i  = 0;i<operand.length;i++){
                    operand.SetBit(i, !operand.GetBit(i));
                }
                return operand
                break
        default:
            throw Error("unexpected op: "+op);
            //so we got rid of shiftLeft and shiftright unary ops, but the binary implementation just calls these so im not refactoring them over yet.
            //because i dont feel like it right now. (e.g. not convinced we wont have both when i implement grouping to disambiguate)
        case Ops.ShiftLeft:
            if(operand instanceof pointer){
                for(let i = operand.start+operand.length-1; i>=operand.start+1;i--){
                    var b = env.GetBit(i-1);
                    env.SetBit(i, b)
                }
                env.SetBit(operand.start, false)
                return operand
            }else if(operand instanceof bitValue){
                for(let i  = operand.val.length-1;i>0;i--){
                    let n = operand.val[i-1]
                    if(n != undefined){
                        operand.val[i] = n;
                    }else{
                        operand.val[i] = false
                    }
                    operand.val[0] = false
                }
                return operand
            }else if(operand instanceof treeNode){
                throw Error("uh?");
            }
            break
         case Ops.ShiftRight:
            if(operand instanceof pointer){
                for(let i = operand.start; i<operand.start+operand.length-1;i++){
                    var b = env.GetBit(i+1);
                    env.SetBit(i, b)
                }
                env.SetBit(operand.start+operand.length, false)
                return operand
            }else if(operand instanceof bitValue){
                for(let i = 0; i<operand.val.length-1;i++){
                    let n = operand.val[i-1]
                    if(n != undefined){
                        operand.val[i] = n;
                    }else{
                        operand.val[i] = false
                    }
                    operand.val[operand.val.length-1] = false
                }
                return operand
            }else if(operand instanceof treeNode){
                throw Error("uh?");
            }
            break
        case Ops.Dec:
            if(operand instanceof pointer){
                operand.DeltaUnsigned(-1);
                return operand
            }else if(operand instanceof bitValue){
                operand.DeltaUnsigned(-1)
                return operand
            }else if(operand instanceof treeNode){
                throw Error("uh?");
            }
            break
        case Ops.Inc:
            if(operand instanceof pointer){
                operand.DeltaUnsigned(1);
                return operand
            }else if(operand instanceof bitValue){
                operand.DeltaUnsigned(1)
                return operand
            }else if(operand instanceof treeNode){
                throw Error("uh?");
            }
    }
                 
}

function CheckArgumentCount(fname: string, args: runtimeType[], expectedCount: number){
    if(args == undefined){
        throw new Error("Unexpected arguments for "+fname+". Expected none")
    }
    if(args.length != expectedCount){
        throw new Error("Unexpected number of arguments for "+fname+". Expected "+expectedCount+", got "+args.length)
    }
    args.forEach(element => {
        if(element == undefined){
            throw new Error("Invalid argument.")
        }
    });
}
export {EvaluateNode}