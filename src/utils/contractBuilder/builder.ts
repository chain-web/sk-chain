import typescript from 'rollup-plugin-typescript2';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import {
  rollup,
  RollupOptions,
  Plugin,
  watch,
  RollupWatcher,
  MergedRollupOptions,
} from 'rollup';
import { init, parse } from 'es-module-lexer';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import { bytes } from 'multiformats';
import chalk from 'chalk';
import { BuildOption } from '.';
const skContractTsPlugin = (): Plugin => {
  return {
    name: 'sk-chain-resolve-ts',
    transform: (code, id) => {
      // console.log(id)
      // console.log(code);
      const [imports, exports] = parse(code);
      imports.forEach((ele, i) => {
        // 替换合约中引入的sk-chain
        const moduleName = code.substring(ele.s, ele.e);
        if (moduleName === 'sk-chain') {
          const impStr = code.substring(ele.ss, ele.se);
          let globalSkStr = impStr.replace('import', 'const');
          globalSkStr = globalSkStr.replace(/from(([\s\S])+)/, '= __sk__');
          globalSkStr = globalSkStr.replace(/ConstractHelper(\s*)(,?)/, '');
          globalSkStr = globalSkStr.replace(/BaseContract(\s*)(,?)/, '');
          globalSkStr = globalSkStr.replace(/Address(\s*)(,?)/, '');
          code = code.replace(impStr, globalSkStr);

          code = code.concat(`
           declare type KeyType = 'base58' | 'base32';
           declare namespace ConstractHelper {
              type SliceDb<T> = {
                  get: (key: string) => T;
                  delete: (key: string) => void;
                  set: (key: string, value: T) => void;
              };
          }
          declare class Address {
            did: string;
        }
          declare class BaseContract {
              msg: {
                  sender: Address;
                  ts: number;
              };
          }
        
          declare var __sk__: {
              constractHelper: {
                createSliceDb: <T = any>(keyType: KeyType) => ConstractHelper.SliceDb<T>;
                BaseContract: typeof BaseContract;
                hash: (str: string) => string;
                log: any;
              };
              transMsg: {
                sender: string;
                ts: number;
              };
            };
          `);
        }
      });
      // console.log(code);
      if (id.match('sk-chain')) {
        // console.log(code)
      }
      return code;
    },
  };
};

const skContractJsPlugin = (input: string): Plugin => {
  return {
    name: 'sk-chain-resolve-js',
    transform: (code, id) => {
      // console.log(code);
      if (id.match(input) && !id.match('commonjs-entry')) {
        // delete calss extend
        code = code.replace(/Contract extends(\s*)(\S*)(\s*){/, 'Contract {');
        // 把constructor替换为__sk__constructor，因为只有在部署合约时才调用constructor
        // 同时，把baseContract中数据和方法写到constructor
        code = code.replace(
          /constructor\(\)/,
          `constructor() {
          this.msg = __sk__.transMsg;
        };\n__sk__constructor()`,
        );
        code = code.replace(
          /super\(\)(;?)/,
          // 把super删除
          '',
        );
        // console.log(code);
      }

      return code;
    },
  };
};

const skContractTerserCodePlugin = (): Plugin => {
  return {
    name: 'sk-chain-resolve-chunk',
    renderChunk(code, _chunk, _outputOptions) {
      // console.log(code)
      // remove模块相关的代码，只剩下 纯js
      code = code.replace(
        /Object.defineProperty\(exports,"__esModule",\{value:!0\}\)(;|,)/,
        'Object.defineProperty({},"__esModule",{value:!0})$1',
      );
      let className: any =
        code.match(/(,)?exports.(\S*)=(\S*)/) ||
        code.match(/(,)?module.exports=(\S*)/) ||
        [];

      className = className[0]?.split('=')[1];

      code = code.replace(/"use strict";/, ';');
      code = code.replace(/(,)?exports.(\S*)=(\S*);/, ';');
      code = code.replace(/(,)?module.exports=(\S*);/, ';');

      if (!className) {
        throw new Error('must have Contract Class');
      }
      className = className.replace(';', '');
      code = code.concat(`const __sk__contract = new ${className}()`);
      return code;
    },
  };
};

const createTsPlugin = (input: string) =>
  typescript({
    clean: true,
    tsconfigOverride: {
      compilerOptions: {
        declaration: true,
        target: 'es2022',
      },
      include: [input],
    },
  });

const createContractConfig = (input: string): RollupOptions => ({
  input,
  preserveModules: true,
  plugins: [
    skContractTsPlugin(),
    commonjs({}),
    createTsPlugin(input),
    skContractJsPlugin(input),
    terser({ ecma: 2020, keep_classnames: true }),
    skContractTerserCodePlugin(),
  ],
});

export const builder = async (input: string, opts: BuildOption) => {
  try {
    console.log(chalk.green('starting build contract...'));
    await init;
    input = resolve(input, './');
    const bundle = await rollup(createContractConfig(input));
    if (!bundle) {
      console.log('no build file');
    }
    const result = await bundle.generate({
      format: 'cjs',
      file: 'sk-result.js',
      preserveModules: false,
      sourcemap: false,
      exports: 'auto',
    });
    let code = '';
    for (const file of result.output) {
      if (file.type === 'chunk') {
        if (file.isEntry) {
          code = file.code;
        }
      }
      if (file.fileName.match('.d.ts') && file.type === 'asset') {
        const filePath = resolve(input, `../../${file.fileName}`);
        let code = file.source as string;
        if (filePath.match(input.replace('.ts', '.d.ts'))) {
          console.log(chalk.green('starting build contract declaration'));
          // thanks to [zhigang]
          const mainClassReg = /export declare[\s\S]*?(?=declare)/gim;
          let mainClass = code.match(mainClassReg);
          if (mainClass?.length === 1) {
            const mainClassCode = mainClass[0];
            const sreg = /(=>\s*)([a-z]+|\{[\s\S]*?\});/gim; // 单行返回类型函数
            const sreg2 = /(=>\s*)(\{[\s\S]*\});/gim; // 多行返回类型函数
            const r = mainClassCode
              .replace(sreg, '$1ConstractHelper.ContractFuncReruen<$2>;')
              .replace(sreg2, '$1ConstractHelper.ContractFuncReruen<$2>;');
            code = code.replace(mainClassReg, r);
          } else if (mainClass && mainClass?.length > 1) {
            console.error('more then one main contract class');
          } else if (!mainClass) {
            console.error('no main contract class');
          }

          code = `
          import { ConstractHelper, BaseContract } from 'sk-chain';
          ${code}`;
          writeFileSync(filePath, code, {
            flag: 'w+',
          });
        }
      }
    }
    // console.log(code)
    const resultUint8 = bytes.fromString(code);
    const resultU8String = `export default new Uint8Array([${resultUint8.toString()}]);`;
    writeFileSync(resolve(input, '../index.contract.js'), resultU8String, {
      flag: 'w+',
    });
    console.log(chalk.green('contract build success'));
  } catch (error) {
    console.log(error);
  }
};

// import process from 'process';
// // import onExit from 'signal-exit';

// export async function watchRollup(command: Record<string, any>): Promise<void> {
//   process.env.ROLLUP_WATCH = 'true';
//   let watcher: RollupWatcher;

//   // onExit(close);
//   process.on('uncaughtException', close);

//   async function loadConfigFromFileAndTrack(): Promise<void> {

//     await reloadConfigFile();

//     async function reloadConfigFile() {
//       try {
//         if (watcher) {
//           await watcher.close();
//         }
//         start([{ output: [{

//         }] }]);
//       } catch (err: any) {}
//     }
//   }

//   await loadConfigFromFileAndTrack();

//   function start(configs: MergedRollupOptions[]): void {
//     try {
//       watcher = watch(configs as any);
//     } catch (err: any) {}

//     watcher.on('event', (event: any) => {
//       switch (event.code) {
//         case 'ERROR':
//           // handleError(event.error, true);
//           // runWatchHook('onError');
//           break;

//         case 'START':
//           // runWatchHook('onStart');

//           break;

//         case 'BUNDLE_START':
//           // runWatchHook('onBundleStart');
//           break;

//         case 'BUNDLE_END':
//           // runWatchHook('onBundleEnd');

//           break;

//         case 'END':
//         // runWatchHook('onEnd')
//       }

//       if ('result' in event && event.result) {
//         event.result.close().catch((error: any) => {});
//       }
//     });
//   }

//   async function close(code: number | null): Promise<void> {
//     process.removeListener('uncaughtException', close);
//     // removing a non-existent listener is a no-op
//     process.stdin.removeListener('end', close);

//     if (watcher) await watcher.close();

//     if (code) {
//       process.exit(code);
//     }
//   }
// }
