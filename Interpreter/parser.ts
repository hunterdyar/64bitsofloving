import "ohm-js"
import { bitsGrammar }from "../gram/bitsoflove.ohm"
import { grammar } from "ohm-js";
import {treeNode, NodeType, pointer, Ops} from "./ast"
import { Environment } from "./environment";

const g = grammar(bitsGrammar);
const s = g.createSemantics()
//@ts-ignore
let env: Environment = undefined
let tokenCount = 0

s.addOperation("toTreeArray",{
    ArgList(first, sep, exprs){
        let r = [first.toTree()]
        exprs.children.forEach(x=>r.push(x.toTree()))
        return r
    },
    Block(div, stmnts, close){
        return stmnts.children.map(x=>x.toTree())
    }

});


s.addOperation("toTree",{
    //@ts-ignore
    Program(s) {return new treeNode(NodeType.Program, "program", s.children.map(x=>x.toTree()))},
    //@ts-ignore
    Assign(left,w,expr) {
        tokenCount++
         return new treeNode(NodeType.Assign,this, [left.toTree(), expr.toTree()])
    },
    Range(open, start, colon, end,close){
        tokenCount+=2
        let s = start.toTree()
        let e = end.child(0).toTree()
        return new treeNode(NodeType.Range, this,[s,e])
    },
    UnrOp(op,expr){
        tokenCount++
        let uop: Ops 
        switch(op.sourceString){
            case "~":
               uop = Ops.Not
               break
            case "<<":
                uop = Ops.ShiftLeft
               break
            case "<<<":
                uop = Ops.CycleLeft
                break
            case ">>":
                uop = Ops.ShiftRight
               break
            case ">>>":
                uop = Ops.CycleRight
                break
            case "--":
                uop = Ops.Dec
               break
            case "++":
                uop = Ops.Inc
                break
            default:
                throw new Error("bad unary op");

        }
        return new treeNode(NodeType.UnaryOp, this, [uop, expr.toTree()])
    },
    BinOp(left,op,right){
        tokenCount ++
        let bop: Ops = Ops.And
        switch(op.sourceString){
            case "|":
                bop = Ops.Or;
                break
            case "^":
                bop = Ops.Xor;
                break
            case "+":
                bop = Ops.Plus;
                break
            case "-":
                bop = Ops.Minus;
                break
            case "&":
                bop = Ops.And;
                break
            case ">>":
                bop = Ops.ShiftRight
                break
            case ">>>":
                bop = Ops.CycleRight
                break;
                break
            case "<<":
                bop = Ops.ShiftLeft
                break
            case "<<<":
                bop = Ops.CycleLeft
                break;

        }
        return new treeNode(NodeType.BinaryOp, this, [bop, left.toTree(), right.toTree()])

    },
    BinAssign(left, op, assign, right){
        tokenCount ++
        let bin = this.BinOp(left, op, right);
        console.log("binassign", left, bin)
        return new treeNode(NodeType.Assign,this, [left.toTree(), bin])
    },
    BlockCall(ident, join, expr, block){
        switch(ident.sourceString){
            case "if":
                return new treeNode(NodeType.If, this, [expr.toTree(), block.toTreeArray()])
            case "while":
            case "wh":
            case "w":
                return new treeNode(NodeType.While, this, [expr.toTree(), block.toTreeArray()])
            case "for":
            case "f":
                return new treeNode(NodeType.For, this, [expr.toTree(), block.toTreeArray()])
            case "procedure":
            case "proc":
            case "fn":
                var id = expr.toTree();
                //register procedure in a dictionary in environment.
                if(id.type != NodeType.Identifier){
                    throw new Error("Procedure must be followed by identifier.")
                }
                var nodes = block.toTreeArray()

                env.addProcedure(id.sourceString,nodes)
                //no 
                return undefined
            break;
                default:
                throw new Error("invalid block call identifier "+ident.sourceString+".")
            
        }
    },
    Call(ident,join,arglist){
        //arglist returns an array.
        tokenCount++
        return new treeNode(NodeType.Call, this, [ident.toTree(),arglist.toTreeArray()])
    },
    //@ts-ignore
    
    numLiteral(number, suffix){
        //combine intervals.
        tokenCount++
        return new treeNode(NodeType.Literal, this,[number.sourceString,suffix.sourceString])
    },
    charLiteral(a,c,b){
        tokenCount++
        var n = c.sourceString.charCodeAt(0)
        return new treeNode(NodeType.Literal, this,[n,""])
    },
    ident(source, _){
        tokenCount++
        return new treeNode(NodeType.Identifier, this, [])
    }
});



//environment object todo
function Parse(input: string, e: Environment): treeNode{
    tokenCount = 0
    env = e;
    performance.mark("parse-start");
    let lex = g.match(input);
    if(lex.succeeded())
    {
        let ast = s(lex).toTree();
        e.programData.SetParseData(input.length, tokenCount)
        e.programData.setError(false)
        performance.mark("parse-end");
        return ast;
    }else{
        e.programData.SetParseData(input.length, tokenCount)
        //not setting error data here because eval has another thing to run.
        //uhg should just move this function into environment, really.
        //e.programData.setError(true, new SyntaxError(lex.message))
        throw new SyntaxError(lex.message)
    }
}

export {Parse}
