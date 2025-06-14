export const bitsGrammar = String.raw`
Bits {
	Program
    = Statement*
    
  Statement
    = Assign
    | BlockCall
    | Call
    | UnrOp
    | BinOp
    | BinAssign

    startPoint = "["
    endPoint = "]"
    divPoint = ":"
    
    join ="."
    sep = ","
    close = ";"
    
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
    assign = "="

    signed = "s"
    unsigned = "u"
    float = "f"
    numSuffix = signed | unsigned | float
    
    binops = add | sub | or | and | xor | mult | div | mod
   	unrops = inc | dec | shiftRight | shiftLeft | not
   
   Block
   = divPoint (Statement*) close
   
  BlockCall
  = ident join Expr Block
    
  Expr
  = ident 
  | Range
  | literal
  | UnrOp
  | BinOp
    
 Assign
 	= ident assign Expr
  | Range assign Expr
   
  BinOp
 	= Expr binops Expr
     
  BinAssign
  = Expr binops assign Expr

  UnrOp
  = unrops Expr
   
  ArgList
  =  Expr (sep Expr)*
  
  Call
  = ident join ArgList 

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