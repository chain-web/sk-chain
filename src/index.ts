import { networkidType } from './config/types';
import { NetworkConfig } from './lib/ipfs/ipfs';
import type { DidJson } from './lib/p2p/did';
import { create } from 'node';
export type { SKChain, SKChainOption } from './skChain';
export type { DidJson } from './lib/p2p/did';
export { skCacheKeys } from './lib/ipfs/key';
export { Block } from './mate/block';
export { Account } from './mate/account';
export { Transaction } from './mate/transaction';
export { CID, bytes } from 'multiformats';
export type { SkJsrInterface as SkGlobal } from './global';
export { constractHelper } from './utils/contractHelper';
export type { ConstractHelper } from './utils/contractHelper';
export { Address } from './mate/address';
export interface CreateNodeConfig {
  // 网络id
  networkid: networkidType;
  // 账户
  account: DidJson;
  // 数据存储位置
  storePath?: { main: string };
  network?: NetworkConfig;
}

export const createNode = create;
