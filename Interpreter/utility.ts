function GetAsCharacter(source: boolean[]){
    let x = GetAsUInt(source);
    //@ts_ignore
    return String.fromCharCode(x)
}
function GetAsUInt(source: boolean[]): number{
    //@ts-ignore
    //return source.reduce((res, x) => res << 1 | x)
    return parseInt(source.reverse().map(x=>x?"1":"0").join(''), 2);
}
function GetAsBinary(source: boolean[]): string{
    source.map(x=>x?"1":"0").join('')
}
function GetAsFloat(source: boolean[]): number{
    return parseFloat("0b"+source.map(x=>x?"1":"0").join(''));
}
function UintToBoolArray(number: number, length: number): boolean[]{
    let val = number ? [] : [false]
    let b = number;
    if(length >0){
        for(let i = 0;i<length;i++) {
            val.push((b & 1) === 1)
            b >>= 1
        }
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