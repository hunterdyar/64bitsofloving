import type { Interval } from "ohm-js";


enum NodeType {
    Program,
    Assign,
    Number,
    Identifier,
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
    id: string
    children: any[]
    sourceInterval: Interval 

    constructor(ns: NodeType, id: string,childs: any[], interval: Interval)
    {
        this.type = ns
        this.id = id
        this.children = childs
        this.sourceInterval = interval
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

export { treeNode, pointer, RangeType, NodeType }