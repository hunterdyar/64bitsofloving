import { NodeType, pointer, bitValue, treeNode, Ops } from "./ast";
import {Environment} from "./environment"
function Execute(node: treeNode, env: Environment): void{
    if(node.type == NodeType.Program){
        EvaluateNode(node, env);
    }else{
        console.error("Can't evaluate non-root node.")
    }

}
type runtimeType = treeNode | pointer | bitValue | undefined
function EvaluateNode(node: treeNode, env: Environment) : runtimeType {
    console.log("Evaluating "+NodeType[node.type]+" node");
    switch(node.type){
        case NodeType.Program:
            node.children.forEach(element => {
                EvaluateNode(element, env);    
            });
            break
        case NodeType.Range:
            //parsed into a pointer at the AST.
            return node.children[0]
            break;
        case NodeType.Identifier:
            var range = env.GetRangeFromIdent(node.source);
            if(range){
                return range;
            }
            throw new Error("Unknown identifier "+node.source);
        case NodeType.Assign:
            let valueOrRange = EvaluateNode(node.children[1],env)
            let pointerNode = node.children[0]?.children[0];

            if(pointerNode instanceof pointer){
                //convert to pointer.
                if(pointerNode instanceof pointer){
                    if(valueOrRange instanceof pointer){
                        env.Copy(valueOrRange, pointerNode)
                    }else if(valueOrRange instanceof bitValue){
                        env.Set(pointerNode, valueOrRange)
                    }
                }else{
                    throw new Error("uh oh!");
                }
            }

            //todo: move up into that if.
            let assigneeString = node.children[0].source
            let assignee = env.GetRangeFromIdent(assigneeString)
            
            //if it is a range, update or set assignee.
            if(valueOrRange instanceof pointer){
                console.log("setting "+assigneeString+" to ",valueOrRange)
                env.SetOrAssign(assigneeString, valueOrRange)
            }
            //if valueOrRange is value, set range to it.
            if(valueOrRange instanceof bitValue){
                console.log("setting "+assigneeString+" to ",valueOrRange)
                if(assignee == undefined){
                    throw new Error("unknown identifier: "+assigneeString+". To declare variable, assign to a range first.")
                }
                env.Set(assignee, valueOrRange)
            }
            break;
        case NodeType.Literal:
            //[number.sourceString,suffix.sourceString]
            let suffix = node.children[1];
            if(suffix == "u" || suffix == "" || suffix == undefined){
                let num = parseInt(node.children[0])
                var v = new bitValue();
                v.SetByUint(num);
                return v;
            }else if(suffix == "s"){
                throw new Error("signed integers not yet supported.");
            }else if(suffix =="f"){
                throw new Error("floating point integers not yet supported.");
            }
            break;
        case NodeType.UnaryOp:
            let operand = EvaluateNode(node.children[1], env)
            return DoUnary(node.children[0], operand, env)
            break;
        case NodeType.BinaryOp:
            let left = EvaluateNode(node.children[1], env)
            let right = EvaluateNode(node.children[2], env)
            return DoBinary(node.children[0], left, right, env);

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
export {Execute}