import type { Interval, Node } from "ohm-js";
import { GetAsBinary, GetAsCharacter, GetAsUInt, UintToBoolArray } from "./utility";
import type { Environment } from "./environment";
import type { Env } from "bun";


enum NodeType {
    Program,
    Assign,
    Literal,
    Identifier,
    Range,
    UnaryOp,
    BinaryOp,
    Call,
    If,
    While,
    For,
}
enum Ops{
    Not,
    ShiftRight,
    ShiftLeft,
    Or,
    And,
    Xor,
    Plus,
    Minus,
    Dec,
    Inc
}
enum RangeType{
    Clamp = 0,
    Ignore = 1,//unconstrained
    Zeros = 2,
    Ones = 3,
    WrapRange = 4,
}

class treeNode {
    type: NodeType
    source: string
    children: any[]
    sourceInterval: Interval 

    constructor(ns: NodeType, node: Node, children: any[])
    {
        this.type = ns
        this.source = node.sourceString
        this.children = children
        this.sourceInterval = node.source
    }
}

class bitValue {
    val: boolean[] = new Array<boolean>
    
    ///Sets value to boolean array. if length>0, value will clamp at length. otherwise, will be minimum size with no padded 0's.
    SetByUint(value: number, length: number = 0){
        this.val = UintToBoolArray(value, length);
    }
    AsChar(): string{
        return GetAsCharacter(this.val)
    }
    AsUint(){
        return GetAsUInt(this.val)
    }
    AsBin():string{
        return GetAsBinary(this.val)
    }
    GetBit(i: number): boolean{
        if(i>=0 || i<this.val.length){
            let r = this.val[i];
            if(r != undefined){
                return r;
            }else{
                return false
            }
        }
        throw new Error("can't get bit value outside of pointer length." + i + " and " + this.val.length)
    }
    DeltaUnsigned(delta: number){
        let x = this.AsUint();
        x += delta;
        let b = UintToBoolArray(x, this.val.length);
        for(let i = 0;i<this.val.length;i++){
            let bx = b[i]
            if(bx != undefined){
                this.val[i] = bx
            }
        }
    }
}

class pointer {
    start: number
    length: number
    range: RangeType
    env: Environment
    
    constructor(start: number, length: number, env: Environment){
        this.start = start
        this.length = length
        this.range = RangeType.Clamp
        this.env = env
    }
    value(): boolean[]{
        return this.env.memory.slice(this.start,this.start+this.length)
    }
    AsChar(): string{
        return GetAsCharacter(this.value())
    }
    AsUInt(): number{
        return GetAsUInt(this.value())
    }
    AsBin():string{
        return GetAsBinary(this.value())
    }
    DeltaUnsigned(delta: number){
        let x = this.AsUInt();
        x += delta;
        let b = UintToBoolArray(x, this.length);
        for(let i = 0;i<this.length;i++){
            let bx = b[i]
            if(bx != undefined){
                this.env.SetBit(this.start+i,bx)
            }
        }
    }
}

type runtimeType = treeNode | pointer | bitValue | undefined


export { treeNode, pointer, bitValue, RangeType, NodeType, Ops, type runtimeType }