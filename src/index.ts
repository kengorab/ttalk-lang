import Program from 'commander';
import { version } from '../package.json';
import { readFile } from 'fs';
import { promisify } from 'util';
import { createInterface } from 'readline';
import { Tokenizer } from './lexer';
import { Parser } from './parser';
import {Compiler, Opcode, opcodeMeta, Value} from './compiler';
import { Compiler as CompilerJs } from './compiler-js';
import { VM, valueToString } from './vm';

const readFileAsync = promisify(readFile)

Program
  .command('tokenize [input]')
  .description('Output the tokens of the provided program')
  .action(async inputFile => {
    await handleInput(inputFile, input => {
      const tokenizer = new Tokenizer(input);
      console.log(JSON.stringify(tokenizer.tokenize(), null, 2));
    })
  });

Program
  .command('ast [input]')
  .description('Output the AST of the provided program')
  .action(async inputFile => {
    await handleInput(inputFile, input => {
      const tokenizer = new Tokenizer(input);
      const parser = new Parser(tokenizer);
      console.log(JSON.stringify(parser.parse(), null, 2));
    })
  });

Program
  .command('dis [input]')
  .description('Output the compiled bytecode of the provided program')
  .option('-c, --show-constants', 'If provided, the constant table will be displayed')
  .action(async (inputFile, { showConstants }) => {
    function formatBytecode(name: string, code: Opcode[], indent = false) {
      const bytecode = indent ? [`${name}:`] : [];
      let i = 0;
      while (i < code.length) {
        const byte = code[i];
        const { name, args } = opcodeMeta[byte];

        let repr = name;
        for (let argIdx = 0; argIdx < args; argIdx++) {
          repr += ` ${code[i + 1 + argIdx]}`;
        }
        i += (1 + args);

        bytecode.push(`${indent ? '  ' : ''}${repr}`);
      }

      return bytecode.join('\n');
    }

    function formatValue(v: Value) {
      switch (v.type) {
        case "string":
          return `"${v.value}"\n`;
        case "number":
          return `${v.value}\n`;
        case "nil":
          return `nil\n`;
        case "function":
          return `${v.name}  #<fn>\n`;
      }
    }

    await handleInput(inputFile, input => {
      const tokenizer = new Tokenizer(input);
      const parser = new Parser(tokenizer);
      const compiler = new Compiler(parser);
      const module = compiler.compile();

      let res = '';
      for (const c of module.constants) {
        if (c.type === 'function') {
          res += formatBytecode(c.name, c.code, true);
          res += '\n\n';
        }
      }
      res += formatBytecode('$main', module.code, res !== '');

      if (showConstants) {
        res += '\n\n--- Constant table ---\n\n';
        for (let i = 0; i < module.constants.length; i++) {
          res += `${i}:  ${formatValue(module.constants[i])}`;
        }
      }

      console.log(res);
    })
  });

Program
  .command('js [input]')
  .description('Compile the provided program to javascript')
  .option('-r, --run', 'If provided, the compiled javascript will be executed')
  .action(async (inputFile, { run }) => {
    const input = await readFileAsync(inputFile, { encoding: 'utf-8' });

    const tokenizer = new Tokenizer(input);
    const parser = new Parser(tokenizer);
    const compiler = new CompilerJs(parser);
    const js = compiler.compile();

    if (run) {
      return eval(js);
    }
    console.log(js);
  });

Program
  .command('run [input]')
  .description('Compile & runs the provided program on the bytecode VM')
  .action(async inputFile => {
    const input = await readFileAsync(inputFile, { encoding: 'utf-8' });

    const tokenizer = new Tokenizer(input);
    const parser = new Parser(tokenizer);
    const compiler = new Compiler(parser);
    const module = compiler.compile();

    const vm = new VM(module);
    const result = vm.run();
    if (result.type !== 'nil') {
      console.log(valueToString(result));
    }
  });

Program
    .name('ttalk')
    .version(version)
    .parse(process.argv);

async function handleInput(inputFilePath: string | null, handler: (input: string) => void) {
  if (inputFilePath) {
    const input = await readFileAsync(inputFilePath, { encoding: 'utf-8' });
    try {
      handler(input)
    } catch (e) {
      console.error(`Error: ${e}`)
    }
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write('> ')
    rl.on('line', input => {
      try {
        handler(input)
      } catch (e) {
        console.log(`Error: ${e}`)
      }
      process.stdout.write('> ')
    })
    rl.on('close', () => process.exit(0));
  }
}
