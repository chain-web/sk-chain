import BigNumber from 'bignumber.js';
import { SKDB } from '../lib/ipfs/ipfs.interface';
import { Address } from './types';
import type { CID } from 'multiformats/cid';

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
  db: SKDB;
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
    this.genHash(opt.db);
  }
  accountNonce: BigNumber;
  cu: BigNumber;
  cuLimit: BigNumber;
  from: Address;
  recipient: Address;
  amount: BigNumber;
  payload?: string;
  hash!: CID;
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
    this.hash = cid;
  };
}
