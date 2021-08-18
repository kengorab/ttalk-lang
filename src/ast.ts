import { TokenType } from './lexer';

export enum NodeType {
  intLit = 'intLit',
  stringLit = 'stringLit',
  ident = 'ident',
  unary = 'unary',
  binary = 'binary',
  invoke = 'invoke',
  valDecl = 'valDecl',
  funcDecl = 'funcDecl',
  print = 'print',
}

export interface IntLitNode {
  type: NodeType.intLit,
  value: number
}

export interface StringLitNode {
  type: NodeType.stringLit,
  value: string
}

export interface IdentNode {
  type: NodeType.ident,
  name: string
}

export interface UnaryNode {
  type: NodeType.unary,
  op: TokenType,
  expr: AstNode,
}

export interface BinaryNode {
  type: NodeType.binary,
  op: TokenType,
  left: AstNode,
  right: AstNode
}

export interface InvokeNode {
  type: NodeType.invoke,
  target: AstNode,
  args: AstNode[]
}

export interface ValDeclNode {
  type: NodeType.valDecl,
  ident: IdentNode,
  value: AstNode
}

export interface FuncDeclNode {
  type: NodeType.funcDecl,
  name: IdentNode,
  params: IdentNode[],
  body: AstNode[]
}

export interface PrintNode {
  type: NodeType.print,
  expr: AstNode,
}

export type AstNode
  = IntLitNode
  | StringLitNode
  | IdentNode
  | UnaryNode
  | BinaryNode
  | InvokeNode
  | ValDeclNode
  | FuncDeclNode
  | PrintNode;

export function isExpr(node: AstNode) {
  switch (node.type) {
    case NodeType.intLit:
    case NodeType.stringLit:
    case NodeType.ident:
    case NodeType.unary:
    case NodeType.binary:
    case NodeType.invoke:
      return true;
    case NodeType.valDecl:
    case NodeType.funcDecl:
    case NodeType.print:
    default:
      return false;
  }
}
