import { eofToken, IdentToken, IntToken, StringToken, Token, Tokenizer, TokenType } from './lexer';
import { AstNode, BinaryNode, IdentNode, IntLitNode, InvokeNode, NodeType, StringLitNode, UnaryNode } from './ast';

type PrefixFn = () => AstNode;
type InfixFn = (left: AstNode) => AstNode;

function precedence(tokenType: TokenType): number {
  switch (tokenType) {
    case TokenType.plus:
    case TokenType.minus:
      return 1;
    case TokenType.star:
    case TokenType.slash:
      return 2;
    case TokenType.lparen:
      return 3;
    default:
      return 0;
  }
}

export class Parser {
  private token: Token;
  private peekToken: Token;

  constructor(private tokenizer: Tokenizer) {
    this.token = tokenizer.next();
    this.peekToken = tokenizer.next();
  }

  parse(): AstNode[] {
    const nodes = [];
    while (!this.isAtEnd) {
      const node = this.parseStatement();
      nodes.push(node);
    }
    return nodes;
  }

  get isAtEnd() {
    return this.token === eofToken;
  }

  curTokenIs = (type: TokenType) => this.token.type === type;

  nextToken(): Token {
    this.token = this.peekToken;
    this.peekToken = this.tokenizer.next();
    return this.token;
  }

  expectToken<T extends Token>(tokenType: TokenType): T {
    const token = this.token;
    if (token.type !== tokenType) {
      throw `Expected token ${tokenType} got ${token.type}`;
    }
    this.nextToken();

    return token as T;
  }

  consumeToken(tokenType?: TokenType) {
    if (tokenType) {
      this.expectToken(tokenType);
    } else {
      this.nextToken();
    }
  }

  getPrefixFn(tokenType: TokenType): PrefixFn | null {
    switch (tokenType) {
      case TokenType.int:
        return this.parseIntLit.bind(this);
      case TokenType.string:
        return this.parseStringLit.bind(this);
      case TokenType.ident:
        return this.parseIdent.bind(this);
      case TokenType.minus:
        return this.parseUnary.bind(this);
      default:
        return null;
    }
  };

  getInfixFn = (tokenType: TokenType): InfixFn | null => {
    switch (tokenType) {
      case TokenType.plus:
      case TokenType.minus:
        return this.parseBinary.bind(this);
      case TokenType.star:
      case TokenType.slash:
        return this.parseBinary.bind(this);
      case TokenType.lparen:
        return this.parseInvoke.bind(this);
      default:
        return null;
    }
  };

  parseStatement() {
    switch (this.token.type) {
      case TokenType.const:
        return this.parseVarDecl();
      case TokenType.def:
        return this.parseFuncDecl();
      case TokenType.print:
        return this.parsePrint();
      default:
        return this.parseExpression();
    }
  }

  parseVarDecl(): AstNode {
    this.consumeToken(TokenType.const);
    const ident = this.parseIdent();
    this.expectToken(TokenType.eq);
    const value = this.parseExpression();

    return {
      type: NodeType.valDecl,
      ident: { type: NodeType.ident, name: ident.name },
      value
    }
  }

  parseFuncDecl(): AstNode {
    this.consumeToken(TokenType.def);
    const name = this.parseIdent();
    this.expectToken(TokenType.lparen);

    const params = [];
    while (!this.curTokenIs(TokenType.rparen)) {
      params.push(this.parseIdent());

      if (this.curTokenIs(TokenType.comma)) {
        this.consumeToken(TokenType.comma);
      }
    }
    this.expectToken(TokenType.rparen);

    this.expectToken(TokenType.lbrace);
    const body = [];
    while (!this.isAtEnd && !this.curTokenIs(TokenType.rbrace)) {
      const node = this.parseStatement();
      body.push(node);
    }
    this.expectToken(TokenType.rbrace);

    return { type: NodeType.funcDecl, name, params, body };
  }

  parsePrint(): AstNode {
    this.consumeToken(TokenType.print);
    const expr = this.parseExpression();
    return { type: NodeType.print, expr };
  }

  parseExpression(): AstNode {
    return this.parsePrecedence(0);
  }

  parsePrecedence(prec: number): AstNode {
    const prefixFn = this.getPrefixFn(this.token.type);
    if (!prefixFn) {
      throw `Unexpected token ${this.token.type}`;
    }
    let leftExpr = prefixFn();

    while (true) {
      if (this.isAtEnd) break;

      const nextPrec = precedence(this.token.type);
      if (prec >= nextPrec) break;

      const infixFn = this.getInfixFn(this.token.type);
      if (infixFn) {
        leftExpr = infixFn(leftExpr);
      }
    }
    return leftExpr;
  }

  parseIntLit(): IntLitNode {
    const token = this.expectToken<IntToken>(TokenType.int);
    return { type: NodeType.intLit, value: token.value };
  }

  parseStringLit(): StringLitNode {
    const token = this.expectToken<StringToken>(TokenType.string);
    return { type: NodeType.stringLit, value: token.value };
  }

  parseIdent(): IdentNode {
    const token = this.expectToken<IdentToken>(TokenType.ident);
    return { type: NodeType.ident, name: token.name };
  }

  parseUnary(): UnaryNode {
    const op = this.token.type;
    this.consumeToken();
    const expr = this.parsePrecedence(precedence(op));
    return { type: NodeType.unary, op, expr };
  }

  parseBinary(left: AstNode): BinaryNode {
    const op = this.token.type;
    this.consumeToken();
    const right = this.parsePrecedence(precedence(op));
    return { type: NodeType.binary, op, left, right };
  }

  parseInvoke(target: AstNode): InvokeNode {
    this.consumeToken(TokenType.lparen);
    const args = [];
    while (!this.curTokenIs(TokenType.rparen)) {
      args.push(this.parseExpression());
      if (this.curTokenIs(TokenType.comma)) {
        this.consumeToken(TokenType.comma);
      }
    }
    this.consumeToken(TokenType.rparen);
    return { type: NodeType.invoke, target, args };
  }
}
