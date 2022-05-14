import typescript from 'rollup-plugin-typescript2';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { rollup, RollupOptions, Plugin } from 'rollup';
import { init, parse } from 'es-module-lexer';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import { bytes } from 'multiformats';
import chalk from 'chalk';
const skContractPlugin = (): Plugin => {
  return {
    name: 'sk-chain-resolve',
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
          globalSkStr = globalSkStr.replace(
            /from(([\s\S])+)/,
            '= window.__sk__',
          );
          globalSkStr = globalSkStr.replace(/ConstractHelper(\s*)(,?)/, '');
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
          declare class BaseContract {
              msg: {
                  sender: string;
                  ts: number;
              };
          }
          declare global {
            interface Window {
              __sk__: {
                constractHelper: {
                  createSliceDb: <T = any>(keyType: KeyType) => ConstractHelper.SliceDb<T>;
                  BaseContract: typeof BaseContract;
                  hash: (str: string) => string;
              };
              };
            }
          }
          `);
        }
      });
      // console.log(code)
      if (id.match('sk-chain')) {
        // console.log(code)
      }
      return code;
    },
  };
};

const createTsPlugin = () =>
  typescript({
    clean: true,
    tsconfigOverride: {
      compilerOptions: {
        declaration: false,
        target: 'es2018',
      },
    },
  });

const createContractConfig = (input: string): RollupOptions => ({
  input,
  preserveModules: true,
  plugins: [skContractPlugin(), commonjs({}), createTsPlugin(), terser()],
});

export const builder = async (input: string, output?: string) => {
  try {
    console.log(chalk.green('starting build contract...'));
    await init;
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
    }
    const resultUint8 = bytes.fromString(code);
    const resultU8String = `export default new Uint8Array(${resultUint8.toString()});`;
    writeFileSync(resolve(input, '../index.js'), resultU8String, {
      flag: 'w+',
    });
    console.log(chalk.green('contract build success'));
  } catch (error) {
    console.log(error);
  }
};
