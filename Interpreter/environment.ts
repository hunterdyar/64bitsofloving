import { bitValue, pointer, treeNode, type runtimeType } from "./ast";
import { EvaluateNode } from "./interpreter";
import { Parse } from "./parser";
import { UintToBoolArray } from "./utility";
import EventEmitter from "events"


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
    register : pointer
    regLocPointer : pointer
    regLenPointer : pointer
    registerVal : bitValue 
    regIsPointerBit : number
    procedures: Dict<treeNode[]>
    onComplete: (() => void)
    onchange: ((bit:number,value:boolean) => void)
    onStep:  ((last:treeNode | undefined) => void )
    onPixel: ((x: number, color: number) => void)
    onOutput: ((message: string) => void)
    constructor(){
        this.emitter = new EventEmitter();
        this.memory = new Array<boolean>(64+16+1)//64 bit heap, 16 bit stack.
        this.displaySize = 16
        this.dispay = new Array<number>(this.displaySize*this.displaySize)
        this.output = ""
        this.procedures = {}
        this.register = new pointer(64,16,this)
        this.regLocPointer = new pointer(64,8,this)
        this.regLenPointer = new pointer(64+8,8,this)
        this.regIsPointerBit = 64+16//last bit
        this.registerVal = new bitValue()
        this.registerVal.SetByUint(0,16)
        console.log(this.registerVal);
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
        //todo: a 'pointer' as a runtime item vs. a 'value' as a runtime item. new problem! uhg. it's solvable in the current way but it's still a mess.
        //visualizing a pointer (8/8 byte numbers) and changing the color or some other 'invisible' value that says "this is pointer" "this is value of x length" is maybe the way to go for it.
        //but it also opens up the idea that you could sort of hack on those things, since we can see the insides and all that.
        if(item == undefined){
            for(let j =0;j<16;j++){
                let k = 64+j
                let b = this.memory[j]
                if(b){
                    this.memory[j] = false
                    this.onchange(k,false)
                }
            }
        }

        if(item instanceof pointer){
            this.SetBit(this.regIsPointerBit,true)
            let start = UintToBoolArray(item.start,8)
            for (let i = 0; i < 8; i++) {
                let b = start[i] ? true : false
                this.regLocPointer.SetBit(i,b)
            }
            let len = UintToBoolArray(item.length,8)
            for (let i = 0; i < 8; i++) {
                this.regLenPointer.SetBit(i,len[i] ? true : false)
            }

            console.assert(this.regLocPointer.AsUInt() == item.start, "reg loc pointer should match pushed pointer")
            console.assert(this.regLenPointer.AsUInt() == item.length, "reg len pointer should match length pointer")

        }else if(item instanceof bitValue){
            this.SetBit(this.regIsPointerBit,false)
            for(let i =0;i<16;i++){
                let k = 64+(i)
                let b = item.GetBitSafe(i)
                this.registerVal.val[i] = b
                if(this.memory[k] != b){
                    this.memory[k] = b
                    this.onchange(k,b)
                }
            }

        }
    }
    pop(): runtimeType{
        if(this.memory[this.regIsPointerBit]){
            //feels likes lots of uneccesary work here 
            let p = new pointer(this.regLocPointer.AsUInt(), this.regLenPointer.AsUInt(), this)
            return p
        }else{
            //return a bitvalue
            return this.registerVal
        }
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
        //if a = [0:8]
        //[8:8] = 32
        //a = [8:8]

        //what should the third assign do? change a to refer to the new location, or set the pointer at a to the data at 8:8?
    
        this.globals[ident] = pointer

        // if(ident in this.globals){
        //     //set
        //     console.log("assign")
        //     let a = this.globals[ident];
        //     if(a == undefined){
        //         throw new Error("womp womp");
        //     }
        //     this.Copy(pointer,a)
        // }else{
        //     //assign
        //     this.globals[ident] = pointer
        // }
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