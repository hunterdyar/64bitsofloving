import "ohm-js"
import { bitsGrammar }from "../gram/bitsoflove.ohm"
import { grammar } from "ohm-js";
import {treeNode, NodeType, pointer, Ops} from "./ast"
import { Environment } from "./environment";

const g = grammar(bitsGrammar);
const s = g.createSemantics()

s.addOperation("toTreeArray",{
    ArgList(first, sep, exprs){
        let r = [first.toTree()]
        exprs.children.forEach(x=>r.push(x.toTree()))
        return r
    }
});


s.addOperation("toTree",{
    //@ts-ignore
    Program(s) {return new treeNode(NodeType.Program, "program", s.children.map(x=>x.toTree()))},
    //@ts-ignore
    Assign(left,w,expr) {
         return new treeNode(NodeType.Assign,this, [left.toTree(), expr.toTree()])
    },
    Range(open, start, colon, end,close){
        let s = Number(start.sourceString)
        let e = Number(end.sourceString)
        return new treeNode(NodeType.Range, this,[new pointer(s,e)])
    },
    UnrOp(op,expr){
        switch(op.sourceString){
            case "~":
                return new treeNode(NodeType.UnaryOp, this, [Ops.Not, expr.toTree()])
            case "<<":
                return new treeNode(NodeType.UnaryOp, this, [Ops.ShiftLeft, expr.toTree()])
            case ">>":
                return new treeNode(NodeType.UnaryOp, this, [Ops.ShiftRight, expr.toTree()])
            case "--":
                return new treeNode(NodeType.UnaryOp, this, [Ops.Dec, expr.toTree()])
            case "++":
                return new treeNode(NodeType.UnaryOp, this, [Ops.Inc, expr.toTree()])

        }
    },
    BinOp(left,op,right){
        switch(op.sourceString){
            case "|":
                return new treeNode(NodeType.BinaryOp, this, [Ops.Or, left.toTree(), right.toTree()])
            case "&":
                return new treeNode(NodeType.BinaryOp, this, [Ops.And, left.toTree(), right.toTree()])
            case "^":
                return new treeNode(NodeType.BinaryOp, this, [Ops.Xor, left.toTree(), right.toTree()])
            case "+":
                return new treeNode(NodeType.BinaryOp, this, [Ops.Plus, left.toTree(), right.toTree()])
            case "-":
                return new treeNode(NodeType.BinaryOp, this, [Ops.Minus, left.toTree(), right.toTree()])

        }
    },
    Call(ident,join,arglist){
        //arglist returns an array.
        return new treeNode(NodeType.Call, this, [ident.toTree(),arglist.toTreeArray()])
    },
    //@ts-ignore
   
    literal(number, suffix){
        //combine intervals.
        return new treeNode(NodeType.Literal, this,[number.sourceString,suffix.sourceString])
    },
    ident(source, _){
        return new treeNode(NodeType.Identifier, this, [])
    }
});



//environment object todo
function Parse(input: string): treeNode{
    performance.mark("parse-start");
    let lex = g.match(input);
    if(lex.succeeded())
    {
        let ast = s(lex).toTree();
        performance.mark("parse-end");
        return ast;
    }else{
        throw new SyntaxError(lex.message)
    }
}

export {Parse}
