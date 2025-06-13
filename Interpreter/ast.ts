import type { Interval, Node } from "ohm-js";


enum NodeType {
    Program,
    Assign,
    Literal,
    Identifier,
    Range,
    UnaryOp,
    BinaryOp
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
        this.val = value ? [] : [false]
        let b = value
        if(length >0){
            for(let i = 0;i<length;i++) {
                this.val.push((b & 1) === 1)
                b >>= 1
            }
        }else{
            while(b) {
                this.val.push((b & 1) === 1)
                b >>= 1
            }
        }
    }
    GetAsUint(){
        let a = this.val;
        //todo:
        //@ts-ignore
        let n = a.reduce((res, x) => res << 1 | x)
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

}

class pointer {
    start: number
    length: number
    range: RangeType

    constructor(start: number, length: number){
        this.start = start
        this.length = length
        this.range = RangeType.Clamp
    }
}

export { treeNode, pointer, bitValue, RangeType, NodeType, Ops }