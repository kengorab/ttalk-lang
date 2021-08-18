import { Module, nilValue, Opcode, Value } from './compiler';

export function valueToString(val: Value): string {
  switch (val.type) {
    case 'number':
      return `${val.value}`;
    case 'string':
      return val.value;
    case 'nil':
      return 'nil';
    case 'function':
      return `<#fn ${val.name}>`;
  }
}

interface CallFrame {
  ip: number,
  code: Opcode[],
  stackOffset: number
}

export class VM {
  private readonly callStack: CallFrame[] = [];
  private stack: Value[] = [];
  private halted = false;

  constructor(private module: Module) {
    this.callStack.push({ ip: 0, code: module.code, stackOffset: 0 });
  }

  run(): Value {
    while (!this.halted) {
      this.handleInstr();
    }

    const result = this.stack.pop();
    return result || nilValue;
  }

  get currentFrame() {
    return this.callStack[this.callStack.length - 1];
  }

  readByte() {
    return this.currentFrame.code[this.currentFrame.ip++];
  }

  push(val: Value) {
    this.stack.push(val);
  }

  pop(): Value {
    const val = this.stack.pop();
    if (!val)
      throw 'Empty stack';
    return val;
  }

  handleInstr() {
    const op = this.readByte();
    switch (op) {
      case Opcode.const0:
      case Opcode.const1:
      case Opcode.const2:
        return this.push({ type: 'number', value: Opcode.const0 + op });
      case Opcode.constant: {
        const constIdx = this.readByte();
        const constant = this.module.constants[constIdx];
        if (!constant)
          throw `Index ${constIdx} out of bounds for constant pool`;
        return this.push(constant);
      }
      case Opcode.neg: {
        const val = this.pop();
        if (val.type !== 'number') {
          throw `Unexpected type ${val.type} for operator -`;
        }
        return this.push({ type: 'number', value: -val.value });
      }
      case Opcode.add: {
        const right = this.pop();
        const left = this.pop();

        if (left.type === 'string' || right.type === 'string') {
          const value = valueToString(left) + valueToString(right);
          return this.push({ type: 'string', value });
        } else if (left.type !== 'number' || right.type !== 'number') {
          throw `Unexpected types ${left.type} and ${right.type} for operator +`;
        }
        return this.push({ type: 'number', value: left.value + right.value });
      }
      case Opcode.sub: {
        const right = this.pop();
        const left = this.pop();
        if (left.type !== 'number' || right.type !== 'number') {
          throw `Unexpected types ${left.type} and ${right.type} for operator -`;
        }
        return this.push({ type: 'number', value: left.value - right.value });
      }
      case Opcode.load: {
        const slotIdx = this.readByte();
        const slot = this.stack[slotIdx + this.currentFrame.stackOffset];
        if (!slot)
          throw `Index ${slotIdx} out of bounds for stack`;
        return this.push(slot);
      }
      case Opcode.store: {
        const slotIdxVirt = this.readByte();
        const slotIdx = slotIdxVirt + this.currentFrame.stackOffset;
        if (slotIdx >= this.stack.length)
          throw `Index ${slotIdx} out of bounds for stack`;

        this.stack[slotIdx] = this.pop();
        break;
      }
      case Opcode.print: {
        const val = this.pop();
        console.log(valueToString(val));
        break;
      }
      case Opcode.invoke: {
        const arity = this.readByte();

        const target = this.pop();
        if (target.type !== 'function')
          throw `Cannot invoke type ${target.type} as function`;

        return this.callStack.push({
          ip: 0,
          code: target.code,
          stackOffset: this.stack.length - 1 - arity
        });
      }
      case Opcode.pop:
        return this.pop();
      case Opcode.nil:
        return this.push(nilValue);
      case Opcode.return: {
        if (this.callStack.length > 1) {
          this.callStack.pop();
        } else {
          this.halted = true;
        }
      }
    }
  }
}
