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
    '12D3KooWL8qb3L8nKPjDtQmJU8jge5Qspsn6YLSBei9MsbTjJDr8': {
      balance: new BigNumber(10000000),
    },
    '12D3KooWL1NF6fdTJ9cucEuwvuX8V8KtpJZZnUE4umdLBuK15eUZ': {
      balance: new BigNumber(10000000),
    },
  },
};
