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
                env.SetOrAssign(assigneeString, valueOrRange)
            }
            //if valueOrRange is value, set range to it.
            if(valueOrRange instanceof bitValue){
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
            let operand = EvaluateNode(node.children[1],env)
            DoUnary(node.children[0], operand)
            
            break;
    }
}

function DoUnary(op: Ops, operand: runtimeType, env: Environment){
    if(operand === undefined){
        throw new Error("uh oh")
    }
    switch (op){
                case Ops.Not:
                    if(operand instanceof pointer){
                        for(let i = operand.start; i<operand.start+operand.length;i++){
                            var b = env.GetBit(i);
                            env.SetBit(i, !b)
                        }
                    }else if(operand instanceof bitValue){
                        for(let i  = 0;i<operand.val.length;i++){
                            operand.val[i] = !operand.val[i];
                        }
                    }else if(operand instanceof treeNode){
                        throw new Error("treenode should not be here.")
                    }
            }
                 
}
export {Execute}