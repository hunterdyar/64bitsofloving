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
         return new treeNode(NodeType.Assign,this, [left.toTree(), expr.toTree()])
    },
    Range(open, start, colon, end,close){
        let s = Number(start.sourceString)
        let e = Number(end.sourceString)
        return new treeNode(NodeType.Range, this,[new pointer(s,e)])
    },
    UnrOp(op,expr){
        let uop: Ops 
        switch(op.sourceString){
            case "~":
               uop = Ops.Not
               break
            case "<<":
                uop = Ops.ShiftLeft
               break
            case ">>":
                uop = Ops.ShiftRight
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
        }
        return new treeNode(NodeType.BinaryOp, this, [bop, left.toTree(), right.toTree()])

    },
    BinAssign(left, op, assign, right){
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
            default:
                throw new Error("invalid block call identifier "+ident.sourceString+".")
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
