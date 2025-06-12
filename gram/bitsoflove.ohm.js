export const bitsGrammar = String.raw`
Bits {
	Program
    = Statement*
    
  Statement
    = Assign
    | UnrOp
    | BinOp
    
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
    
    binops = add | sub | or | and | xor | mult | div | mod
   	unrops = inc | dec | shiftRight | shiftLeft
    
  Expr
  = ident
  | Range
  | literal
    
 Assign
 	= ident "=" Expr
   
  BinOp
 	= Expr binops Expr
    
  UnrOp
  = unrops Expr
   
   Range 
   = startPoint Expr divPoint Expr? endPoint
  
  literal
  = number
    
  ident  (an identifier)
    = letter alnum*

  number  (a number)
    = digit* "." digit+  -- fract
    | digit+             -- whole
}
`