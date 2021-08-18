export enum TokenType {
  int = 'int',
  string = 'string',
  ident = 'ident',
  const = 'const',
  def = 'def',
  print = 'print',
  plus = 'plus',
  minus = 'minus',
  star = 'star',
  slash = 'slash',
  eq = 'eq',
  lparen = 'lparen',
  rparen = 'rparen',
  lbrace = 'lbrace',
  rbrace = 'rbrace',
  comma = 'comma',
  eof = 'eof',
}

export interface IntToken {
  type: TokenType.int,
  value: number
}

export interface StringToken {
  type: TokenType.string,
  value: string
}

export interface IdentToken {
  type: TokenType.ident,
  name: string
}

const constToken = { type: TokenType.const };
const defToken = { type: TokenType.def };
const printToken = { type: TokenType.print };
const plusToken = { type: TokenType.plus };
const minusToken = { type: TokenType.minus };
const starToken = { type: TokenType.star };
const slashToken = { type: TokenType.slash };
const eqToken = { type: TokenType.eq };
const lparenToken = { type: TokenType.lparen };
const rparenToken = { type: TokenType.rparen };
const lbraceToken = { type: TokenType.lbrace };
const rbraceToken = { type: TokenType.rbrace };
const commaToken = { type: TokenType.comma };
export const eofToken = { type: TokenType.eof };

export type Token
  = IntToken
  | StringToken
  | IdentToken

  // Keywords
  | typeof constToken
  | typeof defToken
  | typeof printToken

  // Operators
  | typeof plusToken
  | typeof minusToken
  | typeof starToken
  | typeof slashToken
  | typeof eqToken
  | typeof eofToken;

const keywords: Record<string, Token> = {
  'const': constToken,
  'def': defToken,
  'print': printToken,
};

export class Tokenizer {
  private idx = 0;

  constructor(private input: string) {
  }

  tokenize(): Token[] {
    const tokens = [];

    let token = this.next();
    while (token.type !== 'eof') {
      tokens.push(token);
      token = this.next();
    }

    return tokens;
  }

  takeWhile(pred: (ch: string) => boolean): string {
    const chars = [];
    let ch = this.input[this.idx];
    while (ch && pred(ch)) {
      chars.push(ch);
      ch = this.input[++this.idx];
    }
    return chars.join('');
  }

  next(): Token {
    let ch = this.input[this.idx];
    if (!ch) return eofToken;

    this.takeWhile(isWhitespace);
    ch = this.input[this.idx];
    if (!ch) return eofToken;

    if (isDigit(ch)) {
      const digits = this.takeWhile(isDigit);
      const num = parseInt(digits, 10);
      return { type: TokenType.int, value: num };
    }

    if (ch === '\'') {
      this.idx++; // Skip opening quote
      const string = this.takeWhile(ch => ch !== '\'');
      this.idx++; // Skip closing quote
      return { type: TokenType.string, value: string };
    }

    if (isAlpha(ch)) {
      const ident = this.takeWhile(isAlpha);
      if (keywords[ident]) {
        return keywords[ident];
      }
      return { type: TokenType.ident, name: ident };
    }

    // Consume single character token
    this.idx++;
    switch (ch) {
      case '=':
        return eqToken;
      case '+':
        return plusToken;
      case '-':
        return minusToken;
      case '*':
        return starToken;
      case '/':
        return slashToken;
      case '(':
        return lparenToken;
      case ')':
        return rparenToken;
      case '{':
        return lbraceToken;
      case '}':
        return rbraceToken;
      case ',':
        return commaToken;
    }

    throw `Unknown token ${ch}`;
  }
}

const isAlpha = (ch: string) => /[a-zA-Z]/.test(ch);
const isDigit = (ch: string) => /\d/.test(ch);
const isWhitespace = (ch: string) => /\s/.test(ch);
