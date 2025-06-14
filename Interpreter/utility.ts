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

export{GetAsCharacter, GetAsUInt, GetAsFloat, GetAsBinary}