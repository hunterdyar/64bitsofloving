import { bitValue, pointer, treeNode, type runtimeType } from "./ast";
import { EvaluateNode } from "./interpreter";
import { Parse } from "./parser";
import { UintToBoolArray } from "./utility";
class Environment{
    memory: boolean[]
    stack: runtimeType[]
    program: Generator<treeNode> | undefined
    running: boolean
    compiled: boolean
    cleared: boolean
    lastExecuted: treeNode | undefined
    error: Error | undefined
    globals: {[id: string] : pointer}
    output: string
    dispay: number[]
    displaySize: number
    onchange: ((bit:number,value:boolean) => void)
    onStep:  ((last:treeNode | undefined) => void )
    onPixel: ((x: number, color: number) => void)
    onOutput: (s: string) => void
    constructor(){
        this.memory = new Array<boolean>(64)
        this.displaySize = 16
        this.dispay = new Array<number>(this.displaySize*this.displaySize)
        this.output = ""
        this.stack = []

        this.onchange = (a,b)=>{}
        this.onPixel = (a,b)=>{}
        this.onStep = (a)=>{}
        this.onOutput = (a)=>{}

        this.globals = {}
        this.populateDefaultVariables()
        this.program = undefined
        this.running = false
        this.compiled = false
        this.cleared = false
    }

    CompileAndInitiate(code: string): void{
        if(!this.cleared){
            this.clear()
        }

        this.compiled = false;
        //try... report error.
        try{
            this.error = undefined
            let root = Parse(code)
            this.program = EvaluateNode(root, this);
            this.compiled = true;
        }catch (e){
            if(e instanceof Error){
                this.error = e;
            }
            console.error(this.error)
        }
    }

    RunToEnd(){
        this.cleared = false;
        this.running = true
        //todo: refactor this to iterate directly to avoid all the calls.
        while(this.running){
            this.step()
        }
    }

    step(){
        this.cleared = false;
        if(this.program!=undefined){
            let x = this.program.next()
            this.lastExecuted = x.value
            if(this.onStep != null)
            {
                this.onStep(this.lastExecuted)
            }
            else{
            console.log("Can't step, need to initiate first.")
            }
        }else{
            console.log("Undefined Program! compile");
            this.running = false;
        }
    }

    clear(){
        this.memory = new Array<boolean>(64)    
        this.dispay = new Array<number>(32*32)
        this.output = ""

        for(let i = 0;i<this.memory.length;i++){
            this.SetBit(i,false);
        }
        for(let i = 0;i<this.dispay.length;i++){
            this.onPixel(i,0)
        }
        this.onOutput("")
        
        this.globals = {}
        this.populateDefaultVariables()
        this.cleared = true;
    }

    push(item: runtimeType){
        this.stack.push(item)
    }
    pop(): runtimeType{
        if(this.stack.length > 0){
            return this.stack.pop();
        }
        throw new Error("Can't pop nothing.")
    }
    populateDefaultVariables(){
        this.globals["a64"] = new pointer(0,64, this)

        this.globals["a32"] = new pointer(0,32, this)
        this.globals["b32"] = new pointer(32,32, this)

        this.globals["a16"] = new pointer(0, 16, this)
        this.globals["b16"] = new pointer(16, 16, this)
        this.globals["c16"] = new pointer(32, 16, this)
        this.globals["d16"] = new pointer(48, 16, this)

        this.populateAlphaVariable(8);
        this.populateAlphaVariable(4);
        
    }
    populateAlphaVariable(c:number){
        let alpha = "abcdefghijklmnopqrstuvwxyz";

        for(let i = 0;i<=(64/c);i++){
            let offset = i*c;
            let name = alpha[i]?.toString() + c.toString()
            this.globals[name] = new pointer(offset,c, this)
        }
    }
    Set(loc: pointer, val: bitValue){
        for(let i = 0;i<loc.length;i++){
            var bit = val.GetBit(i)
            var bitloc = loc.start+i
            var p = this.memory[bitloc]
            if(p != bit){
                this.memory[bitloc] = bit;
                this.onchange(bitloc, bit)
            }
        }
    }

    GetRangeFromIdent(ident: string): pointer | undefined{
        if(ident in this.globals){
            return this.globals[ident]
        }else{
            return undefined;
        }
    }
    SetOrAssign(ident: string, pointer:pointer){
        this.globals[ident] = pointer
    }

    SetBit(bit:number, value: boolean): void{
        if(bit < 0 || bit >64){
            throw Error("can't set bit, out of range.");
        }
        let p = this.memory[bit]
        if(value != p){
            this.memory[bit] = value
            this.onchange(bit,value)
        }
    }
    GetBit(bit:number):boolean{
        let b = this.memory[bit]
        if(b != undefined){
            return b;
        }
        throw new Error("bit "+bit+" is out of range.")
    }
    
    //todo: onchange
    Copy(source: pointer, target: pointer){
        for(let i = 0;i<Math.min(source.length, target.length);i++){
            var b = this.memory[source.start+1];
            if( b != undefined){
                this.memory[target.start+i] = b
            } else{
                throw new Error("uh oh!");
            }
        }
    }

    SetPixel(i:number, color: number){
        if(i == undefined || i < 0 || i >= this.dispay.length){
            throw new Error("display setting out of bounds");
        }
        this.dispay[i] = color;
        this.onPixel(i, color);
    }

    Print(deltaout: string){
        this.output+= deltaout;
        this.onOutput(this.output)
    }
}

export {Environment}