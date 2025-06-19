import type { NumberLiteralType } from "typescript";
import { bitValue, pointer, treeNode, type runtimeType } from "./ast";
import { EvaluateNode } from "./interpreter";
import { Parse } from "./parser";
import { UintToBoolArray } from "./utility";
import EventEmitter from "events"
import { emit } from "process";

class ProgramData{
    emitter = new EventEmitter()
    bytes: number
    tokenCount: number
    compiled: boolean
    hasError: boolean
    error: Error | undefined
    constructor(){
        this.bytes = 0
        this.tokenCount = 0
        this.compiled = false
        this.hasError = false
    }

    SetParseData(b: number, t: number){
        this.bytes = b;
        this.tokenCount = t;
        this.emitter.emit("onChange",this)
    }
    clear(){
        this.bytes = 0
        this.tokenCount = 0
        this.compiled = false
    }
    setError(hasError: boolean, error: Error | undefined = undefined){
        this.hasError = hasError
        this.error = error
        this.emitter.emit("onChange", this)
    }
}
class Environment{
    emitter = new EventEmitter();
    memory: boolean[]
    program: Generator<treeNode> | undefined
    running: boolean
    compiled: boolean
    cleared: boolean
    lastExecuted: treeNode | undefined
    globals: {[id: string] : pointer}
    output: string
    dispay: number[]
    programData: ProgramData = new ProgramData()
    displaySize: number
    workingArea : pointer
    procedures: Dict<treeNode[]>
    onComplete: (() => void)
    onchange: ((bit:number,value:boolean) => void)
    onStep:  ((last:treeNode | undefined) => void )
    onPixel: ((x: number, color: number) => void)
    onOutput: ((message: string) => void)
    constructor(){
        this.emitter = new EventEmitter();
        this.memory = new Array<boolean>(64+16)//64 bit heap, 16 bit stack.
        this.displaySize = 16
        this.dispay = new Array<number>(this.displaySize*this.displaySize)
        this.output = ""
        this.procedures = {}
        this.workingArea = new pointer(64,16,this)
        // this.programData.SetBytes(0)
        this.onchange = (a,b)=>{this.emitter.emit("onChange",a,b)}
        this.onPixel = (a,b)=>{this.emitter.emit("onPixel",a,b)}
        this.onStep = (a)=>{this.emitter.emit("onStep",a)}
        this.onOutput = (a)=>{this.emitter.emit("onOutput",a)}
        this.onComplete = ()=>{this.emitter.emit("onComplete")}

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
            let root = Parse(code, this)
            this.program = EvaluateNode(root, this);
            this.compiled = true;
            //the cleared optimization helped since we could compile multiple times before actually running....
            //but now that we edit environment during compilation (procedures), we have to clear all the time. so now there's just cruft of the bool checks.
            this.cleared = false;
        }catch (e){
            if(e instanceof Error){
                this.programData.setError(true, e)
            }
        }
    }

    RunToEnd(){
        performance.mark("run-to-end-start");
        this.cleared = false;
        this.running = true
        //todo: refactor this to iterate directly to avoid all the calls.
        while(this.running){
            this.step()
        }
        
        this.onComplete()
    }

    step(){
        performance.mark("step");
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
                this.running = false
            }
        }else{
            console.log("Undefined Program! compile");
            this.running = false;
        }
    }

    clear(){
        performance.mark("clear");
        this.programData.clear()
        this.memory = new Array<boolean>(64+16)    
        this.dispay = new Array<number>(32*32)
        this.output = ""
        this.procedures = {}
        for(let i = 0;i<this.memory.length;i++){
            this.memory[i] = false
            this.onchange(i,false)
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
        if(item != undefined){
            for(let i =0;i<Math.min(16,item.length);i++){
                let k = 64+(i)
                let b = item.GetBit(i)
                this.memory[k] = b
                this.onchange(k,b)
            }
        }else{
            //set em all off
            for(let j =0;j<16;j++){
                let k = 64+j
                let b = this.memory[j]
                if(b){
                    this.memory[j] = false
                    this.onchange(k,false)
                }
            }
        }
    }
    pop(): runtimeType{
        return this.workingArea
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
    addProcedure(id: string, body: treeNode[]){
        if(id == undefined){
            throw new Error("undefined proc id")
        }
        if(id in this.procedures){
            throw new Error("can't redefine procedure")
        }
        this.procedures[id] = body
    }
    Set(loc: pointer, val: bitValue){
        for(let i = 0;i<loc.length;i++){
            var bit = val.GetBit(i)
            var bitloc = (loc.start+i)%64
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
        if(bit < 0 || bit > this.memory.length){
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
    GetBitSafe(bit:number):boolean{
        let b = this.memory[bit]
        if(b != undefined){
            return b;
        }
        return false
    }
    
    //todo: onchange
    Copy(source: pointer, target: pointer){
        for(let i = 0;i<Math.min(source.length, target.length);i++){
            var b = this.memory[source.start+i];
            if( b != undefined){
                let c = this.memory[target.start+i]
                this.memory[target.start+i] = b
                this.onchange(target.start+i, b)
                
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

export {Environment, ProgramData}