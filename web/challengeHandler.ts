import cData from "../challenges/challenges.toml"
import type { ProgramData } from "../interpreter/environment.ts";
import {env} from "./page.ts"

const localStorageChallengeKey = "64BitsOrLessSelectedChallenge"
const select = document.getElementById("challengeSelect") as HTMLSelectElement

const title = document.getElementById("cTitle");
const desc = document.getElementById("cDesc");
const testList = document.getElementById("cTests") as HTMLUListElement
const container = document.getElementById("cDataContainer")
const consoleContainer = document.getElementById("consoleContainer")
var selectedChallenge: Challenge | undefined;

const bytesTestResult = testList.appendChild(document.createElement("li")) as HTMLLIElement
bytesTestResult.innerText = "total bytes:";//temop
const tokensTestResult = testList.appendChild(document.createElement("li")) as HTMLLIElement
tokensTestResult.innerText = "token count:";//temop

env.emitter.on('onComplete',TestChallenge)
env.programData.emitter.on("onChange", TestSize);

const challenges = cData.challenges as Challenge[]

for(let i = 0;i<challenges.length;i++){
    let element = challenges[i]
    if(element != undefined){
        let option = document.createElement("option");
        option.innerText=element.title
        option.value = i.toString()
        select.options.add(option)
    }
}

var x = localStorage.getItem(localStorageChallengeKey) as string
var xn = parseInt(x);
//why no work
select.selectedIndex = xn
if(xn != 0){
    challengeSelected(undefined);
}


//challenge selection

select.onchange = challengeSelected;

function challengeSelected(ev:Event | undefined){
    if(title == null || desc == null || container == null || consoleContainer == null){
        console.error("bad html setup")
        return;
    }
    let selectedIndex = Number(select.options[select.options.selectedIndex]?.getAttribute("value"));
    selectedChallenge = challenges[selectedIndex] 
    if(selectedChallenge != undefined){
        title.innerText = selectedChallenge.title
        desc.innerText = selectedChallenge.description
        container?.classList.remove("hide")
        consoleContainer.className = "console"
        if(selectedChallenge.maxBytes <= 0){
            bytesTestResult.className = "hide"
        }else{
            bytesTestResult.className = ""
        }
    }else{
        container.className = "hide"
        consoleContainer.className = "console-full"
        
    }
    localStorage.setItem(localStorageChallengeKey, select.options.selectedIndex.toString())
}

function TestChallenge(){
    if(selectedChallenge == undefined){ return;}
    TestSize(env.programData);
    
}

function TestSize(data: ProgramData){
    //todo: programData calls this twice. split it.
    if(selectedChallenge == undefined){ return;}

    //test bytes
    if(selectedChallenge.maxBytes > 0){
        if(data.bytes <= selectedChallenge.maxBytes){
            console.log("success!")
            bytesTestResult.innerText = "bytes: OK"
        }else{
            bytesTestResult.innerText = "bytes: no"
        }
    }

    //test tokens
    if(selectedChallenge.maxTokens > 0){
        if(data.bytes <= selectedChallenge.maxBytes){
            console.log("success!")
            tokensTestResult.innerText = "tokens: OK"
        }else{
            tokensTestResult.innerText = "tokens: no"
        }
    }
}

type Challenge = {
    title: string
    description: string
    maxBytes: number
    maxTokens: number
    textOut: string | undefined
    hasTextOut: boolean
    imageOut: number[]
}



