import { eq } from 'lodash';
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
import { Parser } from './parser';
import { Visitor } from './visitor';
import { TokenType } from './lexer';

export enum Opcode {
  const0,
  const1,
  const2,
  constant,
  neg,
  add,
  sub,
  load,
  store,
  print,
  invoke,
  pop,
  nil,
  return
}
export const opcodeMeta = [
  { name: 'const0', args: 0 },
  { name: 'const1', args: 0 },
  { name: 'const2', args: 0 },
  { name: 'constant', args: 1 },
  { name: 'neg', args: 0 },
  { name: 'add', args: 0 },
  { name: 'sub', args: 0 },
  { name: 'load', args: 1 },
  { name: 'store', args: 1 },
  { name: 'print', args: 0 },
  { name: 'invoke', args: 1 },
  { name: 'pop', args: 0 },
  { name: 'nil', args: 0 },
  { name: 'return', args: 0 },
]
console.assert(opcodeMeta.length - 1 === Opcode.return)

export const nilValue = { type: 'nil' } as const;

export type Value
  = { type: 'number', value: number }
  | { type: 'string', value: string }
  | typeof nilValue
  | { type: 'function', name: string, code: Opcode[] };

interface Local {
  name: string,
  depth: number
}

export interface Module {
  constants: Value[],
  code: Opcode[]
}

export class Compiler extends Visitor {
  private readonly nodes: AstNode[];
  private readonly constants: Value[] = [];
  private readonly locals: Local[] = [];
  private code: Opcode[] = [];
  private depth = 0;

  constructor(private parser: Parser) {
    super();
    this.nodes = parser.parse();
  }

  compile(): Module {
    this.compileBlock(this.nodes);
    this.emit(Opcode.return);

    return { code: this.code, constants: this.constants };
  }

  emit(...bytes: Opcode[]) {
    this.code.push(...bytes);
  }

  addConstant(value: Value): number {
    for (let i = 0; i < this.constants.length; i++){
      const constant = this.constants[i];
      if (eq(value, constant)) {
        return i;
      }
    }

    this.constants.push(value);
    return this.constants.length - 1;
  }

  compileBlock(nodes: AstNode[]) {
    for (let i = 0; i < nodes.length; i++){
      const node = nodes[i];
      this.visit(node);
      const isLast = i === nodes.length - 1;
      const isExpression = isExpr(node);
      if (isExpression && !isLast) {
        this.emit(Opcode.pop);
      }
      if (!isExpression && isLast) {
        this.emit(Opcode.nil);
      }
    }
  }

  visitIntLit(node: IntLitNode) {
    if (node.value === 0) {
      return this.emit(Opcode.const0 + node.value);
    }
    const constIdx = this.addConstant({ type: 'number', value: node.value });
    this.emit(Opcode.constant, constIdx);
  }

  visitStringLit(node: StringLitNode) {
    const constIdx = this.addConstant({ type: 'string', value: node.value });
    this.emit(Opcode.constant, constIdx);
  }

  visitIdent(node: IdentNode) {
    const { name } = node;
    const locals = this.locals.filter(({ depth }) => depth === this.depth);

    for (let i = locals.length - 1; i >= 0; i--){
      const local = locals[i];
      if (local.name === name) {
        return this.emit(Opcode.load, i);
      }
    }
    throw `Unknown identifier ${name}`;
  }

  visitUnary(node: UnaryNode) {
    this.visit(node.expr);
    switch (node.op) {
      case TokenType.minus:
        return this.emit(Opcode.neg);
      default:
        throw `Unknown operator ${node.op}`;
    }
  }

  visitBinary(node: BinaryNode) {
    this.visit(node.left);
    this.visit(node.right);
    switch (node.op) {
      case TokenType.plus:
        return this.emit(Opcode.add);
      case TokenType.minus:
        return this.emit(Opcode.sub);
      default:
        throw `Unknown operator ${node.op}`;
    }
  }

  visitInvoke(node: InvokeNode) {
    this.emit(Opcode.nil); // #ret placeholder
    for (const arg of node.args) {
      this.visit(arg);
    }
    this.visit(node.target);
    this.emit(Opcode.invoke, node.args.length);
  }

  visitValDecl(node: ValDeclNode) {
    const { name } = node.ident;
    const alreadyExists = this.locals
      .some(local => local.name === name && local.depth === this.depth);
    if (alreadyExists) {
      throw `Duplicate identifier ${name}`;
    }

    this.visit(node.value);
    this.locals.push({ name, depth: this.depth });
  }

  visitFuncDecl(node: FuncDeclNode) {
    const { name } = node.name;
    const alreadyExists = this.locals
      .some(local => local.name === name && local.depth === this.depth);
    if (alreadyExists) {
      throw `Duplicate identifier ${name}`;
    }

    const origCode = this.code;
    const origDepth = this.depth;
    this.code = [];
    this.depth++;

    this.locals.push({ name: '#ret', depth: this.depth });
    for (const param of node.params) {
      this.locals.push({ name: param.name, depth: this.depth });
    }

    this.compileBlock(node.body);

    this.emit(Opcode.store, 0);
    const numLocals = this.locals.filter(({ depth }) => depth === this.depth).length;
    for (let i = 0; i < numLocals - 1; i++) { // -1 to account for #ret value
      this.locals.pop();
      this.emit(Opcode.pop);
    }
    this.locals.pop(); // We _do_ need to pop #ret from our locals array though
    this.emit(Opcode.return);

    const fnCode = this.code;
    this.code = origCode;
    this.depth = origDepth;

    this.locals.push({ name, depth: this.depth });
    const constIdx = this.addConstant({ type: 'function', name, code: fnCode });
    this.emit(Opcode.constant, constIdx);
  }

  visitPrint(node: PrintNode) {
    this.visit(node.expr);
    this.emit(Opcode.print);
  }
}
