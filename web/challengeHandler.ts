import cData from "../challenges/challenges.toml"
import type { ProgramData } from "../interpreter/environment.ts";
import {env} from "./page.ts"
import { type Challenge } from "../challenges/challenges.ts";

const localStorageChallengeKey = "64BitsOrLessSelectedChallenge"
const select = document.getElementById("challengeSelect") as HTMLSelectElement

const title = document.getElementById("cTitle");
const desc = document.getElementById("cDesc");
const testList = document.getElementById("cTests") as HTMLUListElement
const container = document.getElementById("cDataContainer")
const consoleContainer = document.getElementById("consoleContainer")
var selectedChallenge: Challenge | undefined;

const bytesTestResult = testList.appendChild(document.createElement("li")) as HTMLLIElement
const tokensTestResult = testList.appendChild(document.createElement("li")) as HTMLLIElement
const textOutTestResult = testList.appendChild(document.createElement("li")) as HTMLLIElement

const heart = String.fromCodePoint(0x2764,0xFE0F)+" "
const noheart = String.fromCodePoint(0x274C)+" "
//prohibited (circleslash) 0x1F6AB
//broken heart 0x1F494
//black heart 0x1F5A4
//cross mark 0x274C

class TestResult{
    bytes: boolean = false
    tokens: boolean = false
    textOut: boolean = false

    all():boolean{
        return this.bytes && this.tokens && this.textOut
    }
}

const testResult = new TestResult()

//listeners
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
        //bytes
        if(selectedChallenge.maxBytes <= 0){
            bytesTestResult.className = "hide"
        }else{
            bytesTestResult.className = ""
        }
        //tokens
        if(selectedChallenge.maxTokens <= 0){
            tokensTestResult.className = "hide"
        }else{
            tokensTestResult.className = ""
        }
        //text
        if(selectedChallenge.textOut == undefined){
            textOutTestResult.className = "hide"
        }else{
            textOutTestResult.className = ""
        }
        
    }else{
        container.className = "hide"
        consoleContainer.className = "console-full"
        
    }
    localStorage.setItem(localStorageChallengeKey, select.options.selectedIndex.toString())
}


//tests.

function TestChallenge(){
    if(selectedChallenge == undefined){ return; }

    //tun tests. these update testResult.
    TestSize(env.programData);
    testResult.textOut = TestTextOut(selectedChallenge.textOut, env.output);

    let passed = testResult.all();
    if(passed){
        console.log("you did it");
    }
}

function TestTextOut(expectedStr: string|undefined, givenStr: string): boolean{
    if(expectedStr == undefined){
        return true;//valid, we met the "none" constraint :p
    }
    textOutTestResult.innerText = ""
    let result = true
    for(let i = 0;i<Math.max(expectedStr.length, givenStr.length);i++){
        let expected = expectedStr[i]
        let given = givenStr[i]
        let sp = textOutTestResult.appendChild(document.createElement("span"))
        if(expected != undefined){
            sp.innerText = expected
            // if given is undefined, fails here. (shorter than expected)
            if(expected == given){ 
                sp.className = "textOut-valid"
            }else{
                sp.className = "textOut-invalid"
                result = false
            }
        }else if(given != undefined){ 
            //given an answer past our expected. (longer)
            sp.innerText = given            
            sp.className = "textOut-invalid"
            result = false
        }
    }
    let c = document.createElement("span")
    textOutTestResult.prepend(c);

    if(result){
        c.innerText = heart+"OK: ";
    }else{
        c.innerText = noheart+"NO: ";
    }
    return result
}

function TestSize(data: ProgramData){
    //todo: programData calls this twice. split it.
    if(selectedChallenge == undefined){ return;}

    //test bytes
    if(selectedChallenge.maxBytes > 0){
        if(data.bytes <= selectedChallenge.maxBytes){
            bytesTestResult.innerText = heart+"bytes: OK. "+data.bytes.toString()+" <= "+selectedChallenge.maxBytes.toString()
            testResult.bytes = true
        }else{
            bytesTestResult.innerText = noheart+"bytes: no. "+data.bytes.toString()+" <= "+selectedChallenge.maxBytes.toString()
            testResult.bytes = false;
        }
    }else{
        testResult.bytes = true
    }

    //test tokens
    if(selectedChallenge.maxTokens > 0){
        if(data.tokenCount <= selectedChallenge.maxTokens){
            tokensTestResult.innerText = heart+"tokens: OK. "+data.tokenCount.toString()+" <= "+selectedChallenge.maxTokens.toString()
            testResult.tokens = true
        }else{
            tokensTestResult.innerText = noheart+"tokens: no. "+data.tokenCount.toString()+" <= "+selectedChallenge.maxTokens.toString()
            testResult.tokens = false
        }
    }else{
        testResult.tokens = true
    }
}


