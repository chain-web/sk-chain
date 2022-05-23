module.exports = {
  // 用ts-node运行ts
  'node-option': [
    'experimental-specifier-resolution=node',
    'loader=ts-node/esm',
  ],

  spec: ['**/*.spec.ts'],
};
