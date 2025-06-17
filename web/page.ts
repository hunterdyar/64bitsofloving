
import { basicSetup } from "codemirror";
import {EditorState, StateField, StateEffect, RangeSet} from "@codemirror/state"
import {EditorView, keymap, ViewPlugin, type EditorViewConfig} from "@codemirror/view"
import {defaultKeymap, indentWithTab} from "@codemirror/commands"
import { Decoration, type DecorationSet } from "@codemirror/view";
import emitter, { Environment, ProgramData } from "../interpreter/environment";
import type { treeNode } from "../interpreter/ast";

const localStorageKey = "64BitsOrLessEditorValue"
let starting = localStorage.getItem(localStorageKey);
const bitContainer = document.getElementById("bitcontainer");
const inputContainer = document.getElementById("inputContainer") as HTMLDivElement
const runButton = document.getElementById("run");
const stepButton = document.getElementById("step");
const compileButton = document.getElementById("compile");
const textOut = document.getElementById("textout");
const imageOut = document.getElementById("imageout") as HTMLCanvasElement
const imageOutCTX = imageOut?.getContext("2d");
const byteCount = document.getElementById("byteCount");
const tokenCount = document.getElementById("tokenCount");
const errorBox = document.getElementById("errorBox");
var dirty: boolean
const bits: HTMLDivElement[] = []
if(!starting){
    starting = `a = [0:8]
a = 200
a = 255
`
    }

function loadbits(){
    if(bitContainer == null){
        return;
    }
    for(var i=0;i<64;i++){
        var bit = document.createElement("div");
        let row = Math.floor(i/16)
        let col = Math.floor((i%16)/4)
        bit.className = "bitbox r"+row+" c"+col
        bitContainer.appendChild(bit);

        let bitdot = document.createElement("div");
        bitdot.id = "bit"+i;
        bitdot.className = "bit"
        bitdot.innerText = "0";
        bit.appendChild(bitdot)
        bits.push(bitdot)
    }
}
loadbits();

const env = new Environment();


const compileOnChangePlugin = ViewPlugin.fromClass(class {
    constructor(view: any) {
        env?.CompileAndInitiate(view.state.doc)
    }
    update(update: any) {
      if (update.docChanged){
        env?.CompileAndInitiate(update.state.doc)
        localStorage.setItem(localStorageKey,update.state.doc)
      }
    }
    //@ts-ignore
    destroy() { this.dom.remove() }
  })

  const addLastStepHighlight = StateEffect.define<{from: number, to: number}>({
    map: ({from, to}, change) => ({from: change.mapPos(from), to: change.mapPos(to)})
  })
const lastStepHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(underlines, tr) {
    //i dont want and shouldn't need basically any of this???
        underlines = underlines.update({
            filter: (a,b)=> false
        })
        for (let e of tr.effects) if (e.is(addLastStepHighlight)) {
                
                underlines = underlines.update({
                add: [lastStepHighlightMark.range(e.value.from, e.value.to)]
            })
            
        }
        return underlines;
      },
  provide: f => EditorView.decorations.from(f)
})

const lastStepHighlightMark = Decoration.mark({class: "cm-laststep"})
const lastStepHighlightTHeme = EditorView.baseTheme({
  ".cm-laststep": { backgroundColor: "lemonchiffon", textDecoration: "underline 1px solid grey" }
})

let state = EditorState.create({
    doc: starting,
    extensions: [
        //@ts-ignore
      basicSetup, compileOnChangePlugin, keymap.of(defaultKeymap), keymap.of(indentWithTab),
    ]
})

let view = new EditorView({
    state: state,
    parent: inputContainer,
  })

if(runButton != null){
  runButton.onclick = (e) => run()
}
if(compileButton != null){
    compileButton.onclick = (e) => compile();
}
if(stepButton!=null){
    stepButton.onclick = (e) => step()
}

env.emitter.on("onComplete",onComplete)
env.emitter.on("onChange",onBitChanged);
env.emitter.on("onStep", onStep);
env.emitter.on('onOutput', onOutput);
env.emitter.on("onPixel", onPixel);
env.programData.emitter.on("onChange", onProgramDataChange);

function onBitChanged(bit: number, val: boolean){
  if(env.running){
    dirty = true
  }else{
    var b = bits[bit]
    if(b){
        b.innerHTML = val ? "1" : "0";
        b.classList = val ? "bit filled" : "bit empty"
    }
  }
}
function onComplete(){
  if(dirty){
    for(let i = 0;i<bits.length;i++){
      var val = env.memory[i]
      var b = bits[i]
      if(b){
          b.innerHTML = val ? "1" : "0";
          b.classList = val ? "bit filled" : "bit empty"
      }
    }
    allPixels()
    dirty = false
  }
}
function onStep(last: treeNode | undefined){
    if(last != undefined){
        let from = last.sourceInterval.startIdx
        let to = last.sourceInterval.endIdx
        let effects: StateEffect<unknown>[] = [addLastStepHighlight.of({from,to})]
        effects.push(StateEffect.appendConfig.of([lastStepHighlightField, lastStepHighlightTHeme]))
        view.dispatch({effects})
     }
}
function onOutput(out: string){
    if(textOut != null){
        textOut.innerText = out;
    }
}
function onPixel(i: number, c: number){
    if(env.running){
      dirty = true
    }else{
    let l = env.displaySize
    let rs = imageOut.width/env.displaySize;

    if(imageOutCTX != undefined){
      imageOutCTX.fillStyle = colorLookup(c)
      let x = Math.floor(i % l) * rs
      let y = Math.floor(i / l) * rs

      imageOutCTX.fillRect(x, y, rs, rs);
    }
  }
}
allPixels()

function allPixels(){
  if(imageOutCTX != undefined){

    let rs = imageOut.width/env.displaySize;
    let l = env.displaySize
    for(let i = 0;i<env.dispay.length;i++){

      let c = env.dispay[i];
      if(c != undefined){
        imageOutCTX.fillStyle = colorLookup(c)
      }else{
        imageOutCTX.fillStyle = colorLookup(0)
      }

      let x = Math.floor(i % l) * rs
      let y = Math.floor(i / l) * rs
      imageOutCTX.fillRect(x, y, rs, rs);
    }
  }
}
function colorLookup(c:number){
  switch (c){
    case 0:
      return "black"
    case 1:
      return "white"
    case 2:
      return "red"
    case 3:
      return "green"
    case 4:
      return "blue"
    default:
      return "magenta"
  }
}
function onProgramDataChange(p: ProgramData){
  //@ts-ignore
  tokenCount.innerText = p.tokenCount;
  //@ts-ignore
  byteCount.innerText = p.bytes
  if(p.hasError){
    //@ts-ignore
    errorBox.style.display = "inline"
    //@ts-ignore
    errorBox.innerText = p.error?.message
  }else{
    //@ts-ignore
    errorBox.style.display = "none"
  }
}



function run(){
    let doc = view.state.doc.toString();
    env.CompileAndInitiate(doc)
    env.RunToEnd();
    localStorage.setItem(localStorageKey, doc);
}

function compile(){
    let doc = view.state.doc.toString();
    env.CompileAndInitiate(doc)
}

function step(){
    env.step()
}


export {env}