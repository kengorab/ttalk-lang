import {
  AstNode,
  BinaryNode,
  FuncDeclNode,
  IdentNode,
  IntLitNode,
  InvokeNode,
  isExpr,
  PrintNode,
  StringLitNode,
  UnaryNode,
  ValDeclNode
} from './ast';
import { TokenType } from './lexer';
import { Parser } from './parser';
import { Visitor } from './visitor';

export class Compiler extends Visitor {
  private readonly nodes: AstNode[];
  private output: (string | number)[] = [];
  private indentLevel = 0;

  constructor(private parser: Parser) {
    super();
    this.nodes = parser.parse();
  }

  compile() {
    for (const node of this.nodes){
      this.visit(node);

      if (isExpr(node)) {
        this.emit(';');
      }
      this.emit('\n');
    }
    return this.output.join('');
  }

  indent() {
    for (let i = 0; i < this.indentLevel; i++) {
      this.emit('  ');
    }
  }

  emit(output: string | number) {
    this.output.push(output);
  }

  visitIntLit(node: IntLitNode) {
    this.emit(node.value);
  }

  visitStringLit(node: StringLitNode) {
    this.emit(`'${node.value}'`);
  }

  visitIdent(node: IdentNode) {
    this.emit(node.name);
  }

  visitUnary(node: UnaryNode) {
    switch (node.op) {
      case TokenType.minus:
        this.emit('-');
        break;
      default:
        throw `Unknown unary operator ${node.op}`;
    }

    this.visit(node.expr);
  }

  visitBinary(node: BinaryNode) {
    this.visit(node.left);
    this.emit(' ');

    switch (node.op) {
      case TokenType.plus:
        this.emit('+');
        break;
      case TokenType.minus:
        this.emit('-');
        break;
      default:
        throw `Unknown binary operator ${node.op}`;
    }

    this.emit(' ');
    this.visit(node.right);
  }

  visitInvoke(node: InvokeNode) {
    this.visit(node.target);
    this.emit('(');
    for (let i = 0; i < node.args.length; i++) {
      let arg = node.args[i];
      this.visit(arg);
      if (i !== node.args.length - 1) {
        this.emit(', ');
      }
    }
    this.emit(')');
  }

  visitValDecl(node: ValDeclNode) {
    this.emit(`const ${node.ident.name} = `);
    this.visit(node.value);
    this.emit(';');
  }

  visitFuncDecl(node: FuncDeclNode) {
    this.emit(`function ${node.name.name}(`);
    for (let i = 0; i < node.params.length; i++) {
      let param = node.params[i];
      this.visit(param);
      if (i !== node.params.length - 1) {
        this.emit(', ');
      }
    }
    this.emit(') {\n');
    this.indentLevel++;
    for (let i = 0; i < node.body.length; i++) {
      const bodyNode = node.body[i];
      const isLast = i === node.body.length - 1;
      this.indent();
      if (isExpr(bodyNode) && isLast) {
        this.emit('return ');
        this.visit(bodyNode);
        this.emit(';');
      } else {
        this.visit(bodyNode);
      }
      this.emit('\n');
    }
    this.indentLevel--;
    this.emit('}');
  }

  visitPrint(node: PrintNode) {
    this.emit('console.log(');
    this.visit(node.expr);
    this.emit(');');
  }
}
