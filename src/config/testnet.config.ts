import BigNumber from 'bignumber.js';
import { GenesisConfig, networkidType } from './types';

export const networkid: networkidType = 'testnet';

export const genesis: GenesisConfig = {
  hash: '0000000000000000000000000000000000000000000000',
  parent: '0000000000000000000000000000000000000000000000',
  logsBloom: '0',
  difficulty: new BigNumber(10),
  number: new BigNumber(0),
  cuLimit: new BigNumber(1000),
  timestamp: 1636461884881,
  alloc: {
    'SKw3o6cU3RRczeRJsJph84JR172a8mconNXhYvRLqHnjRWG3XPtY7j1Stv9ZdYQSPwbsTVJRsFgSZUnUtu1BwLtEiv53i': {
      balance: new BigNumber(10000000),
    },
    'SKw3o7zKe4qsfTLKKC9U2FiB2TpWkFr9ZXBkmYKwhn6xW46ibf1dBkB9yUq43mZeP2C8py3WewowszdXbgNpod4nHNjYD': {
      balance: new BigNumber(10000000),
    },
  },
};
