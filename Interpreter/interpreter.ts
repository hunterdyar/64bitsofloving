import { NodeType, pointer, bitValue, treeNode, Ops, type runtimeType } from "./ast";
import {Environment} from "./environment"


function* EvaluateNode(node: treeNode, env: Environment):Generator<treeNode> {
    switch(node.type){
        case NodeType.Program:
            for(let i = 0; i<node.children.length;i++){
                yield* EvaluateNode(node.children[i],env)
            }
            env.running = false
            break
        case NodeType.Range:
            //parsed into a pointer at the AST.
            env.push(node.children[0])
            yield node
            break;
        case NodeType.Identifier:
            var range = env.GetRangeFromIdent(node.source);
            if(range){
                env.push(range);
                yield node
            }
            throw new Error("Unknown identifier "+node.source);
        case NodeType.Assign:
            yield* EvaluateNode(node.children[1],env)
            let valueOrRange = env.pop();
            let pointerNode = node.children[0]?.children[0];

            if(pointerNode instanceof pointer){
                //convert to pointer.
                if(pointerNode instanceof pointer){
                    if(valueOrRange instanceof pointer){
                        env.Copy(valueOrRange, pointerNode)
                        yield node
                    }else if(valueOrRange instanceof bitValue){
                        env.Set(pointerNode, valueOrRange)
                        yield node
                    }
                }else{
                    throw new Error("uh oh!");
                }
                return
            }

            //todo: move up into that if.
            let assigneeString = node.children[0].source
            let assignee = env.GetRangeFromIdent(assigneeString)
            
            //if it is a range, update or set assignee.
            if(valueOrRange instanceof pointer){
                env.SetOrAssign(assigneeString, valueOrRange)
                yield node
                return
            }
            //if valueOrRange is value, set range to it.
            if(valueOrRange instanceof bitValue){
                if(assignee == undefined){
                    throw new Error("unknown identifier: "+assigneeString+". To declare variable, assign to a range first.")
                }
                env.Set(assignee, valueOrRange)
                yield node
                return
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
    }
}

function DoBinary(op: Ops, left: runtimeType, right: runtimeType, env: Environment){
    //todo: create an interface that allows pointers and values to avoid a nested nightmare of if/elses for getting/setting bits. 
    return undefined
}

function DoUnary(op: Ops, operand: runtimeType, env: Environment): runtimeType{
    if(operand === undefined){
        throw new Error("uh oh")
    }
    console.log("op: "+ Ops[op])
    switch (op){
        case Ops.Not:
            if(operand instanceof pointer){
                for(let i = operand.start; i<operand.start+operand.length;i++){
                    var b = env.GetBit(i);
                    env.SetBit(i, !b)
                }
                return operand
            }else if(operand instanceof bitValue){
                for(let i  = 0;i<operand.val.length;i++){
                    operand.val[i] = !operand.val[i];
                }
                return operand
            }else if(operand instanceof treeNode){
                throw Error("uh?");
            }
            break
        default:
            throw Error("unexpected op: "+op);
        case Ops.ShiftLeft:
            if(operand instanceof pointer){
                            console.log("shifting pointer left", operand.start, operand.length);
                for(let i = operand.start+operand.length-1; i>=operand.start+1;i--){
                    var b = env.GetBit(i-1);
                    env.SetBit(i, b)
                }
                env.SetBit(operand.start, false)
                return operand
            }else if(operand instanceof bitValue){
                            console.log("shifting value left");
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
                            console.log("shifting pointer left", operand.start, operand.length);
                for(let i = operand.start; i<operand.start+operand.length-1;i++){
                    var b = env.GetBit(i+1);
                    env.SetBit(i, b)
                }
                env.SetBit(operand.start+operand.length, false)
                return operand
            }else if(operand instanceof bitValue){
                            console.log("shifting value left");
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
    }
                 
}
export {EvaluateNode}