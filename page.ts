
import { basicSetup } from "codemirror";
import {EditorState, StateField} from "@codemirror/state"
import {EditorView, keymap, ViewPlugin, type EditorViewConfig} from "@codemirror/view"
import {defaultKeymap, indentWithTab} from "@codemirror/commands"

const localStorageKey = "64BitsOrLessEditorValue"
let starting = localStorage.getItem(localStorageKey);
const bit_container = document.getElementById("bitcontainer");
const inputContainer = document.getElementById("inputContainer") as HTMLDivElement


if(!starting){
    starting = `a16 = ~(0:8)
    `
    }

function loadbits(){
    if(bit_container == null){
        return;
    }
    for(var i=0;i<64;i++){
        var bit = document.createElement("div");
        bit.className = "bit"
        bit.id = "bit"+i;
        bit_container.appendChild(bit);
        bit.innerText = "0";
    }
}


console.log("page loading");
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

