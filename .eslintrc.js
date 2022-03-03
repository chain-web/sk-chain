'use strict';
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'eslint-plugin-tsdoc'],
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    // typescript-eslint specific options
    warnOnUnsupportedTypeScriptVersion: true,
  },
  globals: {
    ENV: true,
    __DEV__: true,
  },
  extends: [
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended',
  ],

  settings: {},
  rules: {
    'no-console': 'error',
    'tsdoc/syntax': 'warn',
    'react/prop-types': 'off',
    // TypeScript"s `noFallthroughCasesInSwitch` option is more robust (#6906)
    'default-case': 'off',
    // "tsc" already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/291)
    'no-dupe-class-members': 'off',
    // "tsc" already handles this (https://github.com/typescript-eslint/typescript-eslint/issues/477)
    'no-undef': 'off',
    // 开启TS特有的一些规则并把ESLint规则关掉
    '@typescript-eslint/consistent-type-assertions': 'warn',
    'no-array-constructor': 'off',
    '@typescript-eslint/no-array-constructor': 'warn',
    // 缩进
    indent: 'off',
    '@typescript-eslint/indent': ['off'],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': [
      'warn',
      {
        functions: false,
        classes: false,
        variables: false,
        typedefs: false,
      },
    ],
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': [
      'warn',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      },
    ],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-empty-interface': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'warn',

    // 函数返回值类型必须被显式定义
    // 暂时禁用
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // 允许使用 @ts-expect-error 但需要写明原因
    '@typescript-eslint/ban-ts-comment': 'error',
  },
};
