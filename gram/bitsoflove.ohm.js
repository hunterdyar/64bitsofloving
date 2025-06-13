export const bitsGrammar = String.raw`
Bits {
	Program
    = Statement*
    
  Statement
    = Assign ~unrops
    | UnrOp
    | BinOp ~unrops

    
    startPoint = "["
    endPoint = "]"
    divPoint = ":"
    
    add = "+"
    inc = "++"
    sub = "-"
    dec = "--"
    shiftRight = ">>"
    shiftLeft = "<<"
    or = "|"
    and = "&"
    xor = "^"
    mult = "*"
    div = "/"
    mod = "%"
    not = "~"
    
    signed = "s"
    unsigned = "u"
    float = "f"
    numSuffix = signed | unsigned | float
    
    binops = add | sub | or | and | xor | mult | div | mod
   	unrops = inc | dec | shiftRight | shiftLeft | not
    
  Expr
  = ident 
  | Range
  | literal
  | UnrOp
  | BinOp
    
 Assign
 	= ident "=" Expr
   
  BinOp
 	= Expr binops Expr
    
  UnrOp
  = unrops Expr
   
   Range 
   = startPoint Expr divPoint Expr? endPoint
  
  literal
  = number numSuffix?
    
  ident  (an identifier)
    = letter alnum*
    

  number  (a number)
    = digit* "." digit+  -- fract
    | digit+             -- whole
    
}
`