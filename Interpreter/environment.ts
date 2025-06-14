import { bitValue, pointer, treeNode, type runtimeType } from "./ast";
import { EvaluateNode } from "./interpreter";
import { Parse } from "./parser";
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
    onchange: (bit:number,value:boolean) => void
    onStep: (undefined | ((last:treeNode | undefined) => void))
    constructor(){
        this.memory = new Array<boolean>(64)
        this.stack = []
        this.onchange = (a,b)=>{}
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
        }
    }

    clear(){
        this.memory = new Array<boolean>(64)    
        for(let i = 0;i<this.memory.length;i++){
            this.SetBit(i,false);
        }
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
        this.globals["a64"] = new pointer(0,64)

        this.globals["a32"] = new pointer(0,32)
        this.globals["b32"] = new pointer(32,32)

        this.globals["a16"] = new pointer(0, 16)
        this.globals["b16"] = new pointer(16, 16)
        this.globals["c16"] = new pointer(32, 16)
        this.globals["d16"] = new pointer(48, 16)

        this.populateAlphaVariable(8);
        this.populateAlphaVariable(4);
        
    }
    populateAlphaVariable(c:number){
        let alpha = "abcdefghijklmnopqrstuvwxyz";

        for(let i = 0;i<=(64/c);i++){
            let offset = i*c;
            let name = alpha[i]?.toString() + c.toString()
            this.globals[name] = new pointer(offset,c)
        }
    }
    Set(loc: pointer, val: bitValue){
        for(let i = 0;i<loc.length;i++){
            var bit = val.GetBit(i)
            var bitloc = loc.start+i
            this.memory[bitloc] = bit;
            this.onchange(bitloc, bit)
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
        this.memory[bit] = value
        this.onchange(bit,value)
    }
    GetBit(bit:number):boolean{
        let b = this.memory[bit]
        if(b != undefined){
            return b;
        }
        throw new Error("bit "+bit+" is out of range.")
    }
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
}

export {Environment}