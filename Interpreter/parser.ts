import "ohm-js"
import { bitsGrammar }from "../gram/bitsoflove.ohm"
import { grammar } from "ohm-js";
import {treeNode, NodeType, pointer, Ops} from "./ast"
import { Environment } from "./environment";
import { Execute } from "./interpreter";

const g = grammar(bitsGrammar);
const s = g.createSemantics()

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

        }
    },
    literal(number, suffix){
        //combine intervals.
        return new treeNode(NodeType.Literal, this,[number.sourceString,suffix.sourceString])
    },
    ident(source, _){
        return new treeNode(NodeType.Identifier, this, [])
    }
});


//environment object todo
function ParseAndRun(input: string, env: Environment){
    performance.mark("parse-start");
    let lex = g.match(input);
    if(lex.succeeded())
    {
        let ast = s(lex).toTree();
        performance.mark("parse-end");
        env.clear();
        Execute(ast, env)
        // return compileAndRun(canvas, ast);
    }else{
        throw new SyntaxError(lex.message)
    }
}

export {ParseAndRun}
