import { CID } from 'multiformats/cid';
import BigNumber from 'bignumber.js';

export type networkidType = 'mainnet' | 'testnet';

export interface GenesisConfig {
  hash: string;
  parent: string;
  // stateRoot: cidHash; // 全账户状态树根节点hash
  // transactionsRoot: cidHash; // 当前块的交易树根节点hash
  // receiptRoot: cidHash; // 当前块的收据树根节点hash
  logsBloom: string; // 当前块交易接收者的bloom，用于快速查找
  difficulty: BigNumber; // 难度，用来调整出块时间，由于不挖矿，具体实现待定
  number: BigNumber; // 当前块序号
  cuLimit: BigNumber; // 当前块，计算量上限
  timestamp: number;
  alloc?: { [key: string]: { balance: BigNumber } };
}

// filterPeer
