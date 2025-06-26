function GetAsCharacter(source: boolean[]){
    let x = GetAsUInt(source);
    //@ts_ignore
    return String.fromCharCode(x)
}
function GetAsUInt(source: boolean[]): number{
    //@ts-ignore
   // return source.reduce((res, x) => res << 1 | x)
    let i = parseInt(source.reverse().map(x=>x?"1":"0").join(''), 2);
    source.reverse()
    return i;
}
function GetAsBinary(source: boolean[]): string{
    return source.map(x=>x?"1":"0").join('')
}
function GetAsFloat(source: boolean[]): number{
    return parseFloat("0b"+source.map(x=>x?"1":"0").join(''));
}
function UintToBoolArray(number: number, length: number): boolean[]{
    let val = number != undefined ? [] : [false]
    let b = number;
    if(length > 0){
        val = []
        for(let i = 0;i<length;i++) {
            val.push((b & 1) === 1)
            b >>= 1
        }
        console.assert(length==val.length, "UintToBoolArray didn't make array of correct length. Was given "+length);
    }else{
        while(b) {
            val.push((b & 1) === 1)
            b >>= 1
        }
    }
    
    return val;
}
//utility to reverse subsection of an array
function Reverse(arr: Array<boolean>, start:number, end:number) {
    while (start < end) {
        let temp = arr[start];
        //@ts-ignore
        arr[start] = arr[end];
        //@ts-ignore
        arr[end] = temp;
        start++;
        end--;
    }
}

export{GetAsCharacter, GetAsUInt, GetAsFloat, GetAsBinary, UintToBoolArray, Reverse}