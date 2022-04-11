import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import { resolve } from 'path';
import { readFileSync } from 'fs';
// import { terser } from 'rollup-plugin-terser';
// import rollupReplace from 'rollup-plugin-replace';
// import fileSize from 'rollup-plugin-filesize';

const cwjsrPlugin = () => {
  const rootDir = resolve(process.cwd());
  return {
    name: 'cwjsr-resolve',
    resolveId: (id) => {
      if (id.match('cwjsr')) {
        return 'cwjsr/web/cwjsr.js';
      }
    },
    load: (id) => {
      if (id.match('cwjsr')) {
        let fileStr = readFileSync(
          resolve(rootDir, `./node_modules/${id}`),
        ).toString();
        // 写死的bad code，但有用
        // TODO， build时可能会有问题
        fileStr = fileStr.replace(
          'cwjsr_bg.wasm',
          '../../node_modules/cwjsr/web/cwjsr_bg.wasm',
        );
        return fileStr;
      }
    },
  };
};

const createTsPlugin = ({ declaration = true, target } = {}) =>
  typescript({
    clean: true,
    tsconfig: 'tsconfig.json',
    tsconfigOverride: {
      compilerOptions: {
        declaration,
        ...(target && { target }),
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
  createWebConfig({
    input: 'src/index.browser.ts',
    output: [
      {
        dir: 'es',
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
