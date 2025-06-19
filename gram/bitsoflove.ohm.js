export const bitsGrammar = String.raw`
Bits {
	Program
    = Statement*
    
  Statement
    = UnrOp
    | BinOp
    | Assign
    | BlockCall
    | Call
    | Declare
    | ProcCall

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
    cycleRight = ">>>"
    shiftLeft = "<<"
    cycleLeft = "<<<"
    or = "|"
    and = "&"
    xor = "^"
    mult = "*"
    div = "/"
    mod = "%"
    not = "~"
    assign = "="
    declare = ":="
    procprefix = ">"

    signed = "s"
    unsigned = "u"
    float = "f"
    numSuffix = signed | unsigned | float
    
    binops = add | sub | or | and | xor | mult | div | mod | cycleRight | shiftRight | cycleLeft | shiftLeft
   	unrops = inc | dec | not
   
   Block
   = divPoint (Statement*) close
   
  BlockCall
  = ident join Expr Block
    
  Expr
  = UnrOp
  | BinOp
  | Range
  | ident
  | numLiteral
  | charLiteral
    
 Assign
 	= ident assign Expr
  | Range assign Expr

 Declare
  = ident declare Expr

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

  ProcCall
  = procprefix ident

   Range 
   = startPoint Expr divPoint Expr? endPoint
  
  numLiteral
  = number numSuffix?

  charLiteral
  = "'" any "'"
    
  ident  (an identifier)
    = letter alnum*

  number  (a number)
    = digit* "." digit+  -- fract
    | digit+             -- whole
    
}
`