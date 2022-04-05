import BigNumber from 'bignumber.js';
import { SKDB } from '../lib/ipfs/ipfs.interface';
import { Address } from './types';
import type { CID } from 'multiformats/cid';
import { BlockHeaderData } from './block';

export interface transMeta {
  from: Transaction['from'];
  amount: Transaction['amount'];
  recipient: Transaction['recipient'];
  cu: Transaction['cu'];
  signature: string;
  payload?: Transaction['payload'];
  ts: number;
}

export interface TransactionOption {
  from: Address;
  accountNonce: BigNumber;
  cu: BigNumber;
  cuLimit: BigNumber;
  recipient: Address;
  amount: BigNumber;
  payload?: string;
  ts: number;
}

// 交易，基础数据
export class Transaction {
  constructor(opt: TransactionOption) {
    this.from = opt.from;
    this.accountNonce = opt.accountNonce;
    this.cu = opt.cu;
    this.cuLimit = opt.cuLimit;
    this.recipient = opt.recipient;
    this.amount = opt.amount;
    this.payload = opt.payload;
    this.ts = opt.ts;
  }
  blockNumber!: BlockHeaderData['number'];
  accountNonce: BigNumber;
  cu: BigNumber;
  cuLimit: BigNumber;
  from: Address;
  recipient: Address;
  amount: BigNumber;
  payload?: string;
  hash!: string;
  ts: number;

  genHash = async (db: SKDB) => {
    const obj = {
      accountNonce: this.accountNonce,
      cu: this.cu,
      cuLimit: this.cuLimit,
      recipient: this.recipient,
      amount: this.amount,
      payload: this.payload,
      ts: this.ts,
    };
    const cid = await db.dag.put(obj);
    this.hash = cid.toString();
  };

  fromCid = async () => {
    // TODO
  };

  /**
   * 将区块数据保存，落文件
   */
  commit = async (db: SKDB, blockNumber: BigNumber) => {
    this.blockNumber = blockNumber;
    const transCid = await db.dag.put([
      this.accountNonce,
      this.amount,
      this.cu,
      this.cuLimit,
      this.from,
      this.hash,
      this.payload,
      this.recipient,
      this.ts,
    ]);
    return transCid;
  };
}
