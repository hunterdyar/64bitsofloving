import "ohm-js"
import { bitsGrammar }from "../gram/bitsoflove.ohm"
import { grammar } from "ohm-js";
import {treeNode, NodeType} from "./ast"

const g = grammar(bitsGrammar);
const s = g.createSemantics()

s.addOperation("toTree",{
    //@ts-ignore
    Program(s,_) {return new treeNode(NodeType.Program, "program",s.children.map(x=>x.toTree()))},
    //@ts-ignore
    assignStatement(ident,w,expr) {
        // return new treeNode(NodeType.Assign,ident.sourceString, ident.source)
    },
});
