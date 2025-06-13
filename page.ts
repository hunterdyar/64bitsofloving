
import { basicSetup } from "codemirror";
import {EditorState, StateField} from "@codemirror/state"
import {EditorView, keymap, ViewPlugin, type EditorViewConfig} from "@codemirror/view"
import {defaultKeymap, indentWithTab} from "@codemirror/commands"
import {ParseAndRun} from "./Interpreter/parser"
import { Environment } from "./Interpreter/environment";

const localStorageKey = "64BitsOrLessEditorValue"
let starting = localStorage.getItem(localStorageKey);
const bitContainer = document.getElementById("bitcontainer");
const inputContainer = document.getElementById("inputContainer") as HTMLDivElement
const runButton = document.getElementById("run");

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


let state = EditorState.create({
    doc: starting,
    extensions: [
      basicSetup,keymap.of(defaultKeymap), keymap.of(indentWithTab),
    ]
})

let view = new EditorView({
    state: state,
    parent: inputContainer,
  })

if(runButton != null){
  runButton.onclick = (e) => run()
}

const env = new Environment();
env.onchange = onBitChanged;
function onBitChanged(bit: number, val: boolean){
    var b = bitContainer?.children[bit]
    if(b){
        b.innerHTML = val ? "1" : "0";
        b.classList = val ? "bit filled" : "bit empty"
    }
}

function run(){
    let doc = view.state.doc.toString();
    ParseAndRun(doc, env)

}
