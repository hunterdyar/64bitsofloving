
import { basicSetup } from "codemirror";
import {EditorState, StateField, StateEffect, RangeSet} from "@codemirror/state"
import {EditorView, keymap, ViewPlugin, type EditorViewConfig} from "@codemirror/view"
import {defaultKeymap, indentWithTab} from "@codemirror/commands"
import { Decoration, type DecorationSet } from "@codemirror/view";
import { Environment } from "../interpreter/environment";
import type { treeNode } from "../interpreter/ast";

const localStorageKey = "64BitsOrLessEditorValue"
let starting = localStorage.getItem(localStorageKey);
const bitContainer = document.getElementById("bitcontainer");
const inputContainer = document.getElementById("inputContainer") as HTMLDivElement
const runButton = document.getElementById("run");
const stepButton = document.getElementById("step");
const compileButton = document.getElementById("compile");

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
        bit.className = "bit"
        bit.id = "bit"+i;
        bitContainer.appendChild(bit);
        bit.innerText = "0";
    }
}
loadbits();

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
  ".cm-laststep": { backgroundColor: "yellow", textDecoration: "underline 1px solid grey" }
})

let state = EditorState.create({
    doc: starting,
    extensions: [
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

const env = new Environment();
env.onchange = onBitChanged;
env.onStep = onStep
function onBitChanged(bit: number, val: boolean){
    var b = bitContainer?.children[bit]
    if(b){
        b.innerHTML = val ? "1" : "0";
        b.classList = val ? "bit filled" : "bit empty"
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
