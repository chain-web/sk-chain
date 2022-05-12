import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import { resolve } from 'path';
import { rollup, RollupOptions, Plugin } from 'rollup';

const skContractPlugin = (): Plugin => {
  const rootDir = resolve(process.cwd());
  return {
    name: 'cwjsr-resolve',
    resolveId: (id: string) => {
      // if (id.match('sk-chain')) {
      //   return 'sk-chain';
      // }
      return null;
    },
    load: (id: string) => {
      // if (id.match('sk-chain')) {
      //   return 'export default {}';
      // }
      return null;
    },
    transform: (code, id) => {
      console.log(id)
      console.log(code);
      if (id.match('sk-chain')) {
        console.log(code)
      }
      return code;
    }
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
  output: [
    {
      dir: 'es',
      format: 'esm',
    },
  ],
  preserveModules: true,
  plugins: [skContractPlugin(), createTsPlugin()],
});

export const builder = async (input: string, output?: string) => {
  const bundle = await rollup(createContractConfig(input));
  if (!bundle) {
    console.log('no build file');
  }
  const result = await bundle.generate({});

  // console.log(result.output[0]);
};
