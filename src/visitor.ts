import {
  AstNode,
  BinaryNode,
  FuncDeclNode,
  IdentNode,
  IntLitNode,
  InvokeNode, NodeType,
  PrintNode,
  StringLitNode,
  UnaryNode,
  ValDeclNode
} from './ast';

export abstract class Visitor {

  visit(node: AstNode) {
    switch (node.type) {
      case NodeType.intLit:
        return this.visitIntLit(node);
      case NodeType.stringLit:
        return this.visitStringLit(node);
      case NodeType.ident:
        return this.visitIdent(node);
      case NodeType.unary:
        return this.visitUnary(node);
      case NodeType.binary:
        return this.visitBinary(node);
      case NodeType.invoke:
        return this.visitInvoke(node);
      case NodeType.valDecl:
        return this.visitValDecl(node);
      case NodeType.funcDecl:
        return this.visitFuncDecl(node);
      case NodeType.print:
        return this.visitPrint(node);
    }
  }

  abstract visitIntLit(node: IntLitNode): void;

  abstract visitStringLit(node: StringLitNode): void;

  abstract visitIdent(node: IdentNode): void;

  abstract visitUnary(node: UnaryNode): void;

  abstract visitBinary(node: BinaryNode): void;

  abstract visitInvoke(node: InvokeNode): void;

  abstract visitValDecl(node: ValDeclNode): void;

  abstract visitFuncDecl(node: FuncDeclNode): void;

  abstract visitPrint(node: PrintNode): void;
}
