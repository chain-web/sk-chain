import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import hashbang from 'rollup-plugin-hashbang';
const cwjsrPlugin = () => {
  const rootDir = resolve(process.cwd());
  return {
    name: 'cwjsr-resolve',
    resolveId: (id) => {
      if (id.match('cwjsr/web/cwjsr')) {
        return 'cwjsr/web/cwjsr.js';
      }
      if (id.match('cwjsr/node/cwjsr')) {
        return 'cwjsr/node/cwjsr.js';
      }
    },
    load: (id) => {
      if (id.match('cwjsr/web/cwjsr')) {
        let fileStr = readFileSync(
          resolve(rootDir, `./node_modules/cwjsr/web/cwjsr.js`),
        ).toString();
        // 写死的bad code，但有用
        // TODO， build时可能会有问题
        fileStr = fileStr.replace(
          'cwjsr_bg.wasm',
          '../../../../../../node_modules/cwjsr/web/cwjsr_bg.wasm',
        );
        return fileStr;
      }
      if (id.match('cwjsr/node/cwjsr')) {
        let fileStr = readFileSync(
          resolve(rootDir, `./node_modules/cwjsr/node/cwjsr_bg.js`),
        ).toString();
        fileStr = fileStr.replace(
          './cwjsr_bg.wasm',
          '../../../../node_modules/cwjsr/node/cwjsr_bg.wasm',
        );
        return fileStr;
      }
    },
  };
};

const createTsPlugin = (tsConfig = {}) =>
  typescript({
    clean: true,
    tsconfig: 'tsconfig.json',
    tsconfigOverride: {
      compilerOptions: {
        ...tsConfig,
      },
    },
  });

const createNodeConfig = ({ input, output }) => ({
  input,
  output,
  preserveModules: true,
  plugins: [json(), createTsPlugin()],
});

const createWebConfig = ({ input, output }) => ({
  input,
  output,
  preserveModules: true,
  plugins: [cwjsrPlugin(), json(), createTsPlugin()],
});

const createCliConfig = ({ input, output }) => ({
  input,
  output,
  preserveModules: true,
  plugins: [
    json(),
    createTsPlugin({
      declaration: false,
      target: 'es2018',
    }),
    hashbang(),
  ],
});

const createUmdConfig = ({ input, output, target = undefined }) => ({
  input,
  output,
  plugins: [
    // rollupReplace({
    //   'process.env.NODE_ENV': JSON.stringify('production')
    // }),
    createTsPlugin({ declaration: false, target }),
    // terser({
    //   toplevel: true,
    // }),
    // fileSize(),
  ],
});

export default [
  // createNpmConfig({
  //   input: 'src/index.browser.ts',
  //   output: [
  //     {
  //       dir: 'lib',
  //       format: 'cjs',
  //     },
  //   ],
  // }),
  // createNodeConfig({
  //   input: 'src/index.ts',
  //   output: [
  //     {
  //       dir: 'dist',
  //       format: 'esm',
  //     },
  //   ],
  // }),

  createCliConfig({
    input: 'src/utils/contractBuilder/index.ts',
    output: [
      {
        dir: 'es/cli',
        format: 'esm',
      },
    ],
  }),
  createWebConfig({
    input: 'src/index.ts',
    output: [
      {
        dir: 'es',
        format: 'esm',
      },
    ],
  }),

  createWebConfig({
    input: 'src/node.browser.ts',
    output: [
      {
        dir: 'es',
        format: 'esm',
      },
    ],
  }),

  createWebConfig({
    input: 'src/lib/contract/cwjsr/browser.ts',
    output: [
      {
        dir: 'es/src/lib/contract/cwjsr',
        format: 'esm',
      },
    ],
  }),

  // createUmdConfig({
  //   input: 'src/index.ts',
  //   output: {
  //     file: 'dist/xstate.js',
  //     format: 'umd',
  //     name: 'XState',
  //   },
  // }),

  // createUmdConfig({
  //   input: 'src/index.ts',
  //   output: {
  //     file: 'dist/xstate.web.js',
  //     format: 'esm',
  //   },
  //   target: 'ES2015',
  // }),
];
