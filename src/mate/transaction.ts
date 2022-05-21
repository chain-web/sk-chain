import BigNumber from 'bignumber.js';
import { SKDB } from '../lib/ipfs/ipfs.interface';
import { CID } from 'multiformats/cid';
import { BlockHeaderData } from './block';
import { Address } from './address';

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
  payload?: Transaction['payload'];
  ts: number;
  hash?: string;
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
    if (opt.hash) {
      this.hash = opt.hash;
    }
  }
  blockNumber!: BlockHeaderData['number'];
  accountNonce: BigNumber;
  cu: BigNumber;
  cuLimit: BigNumber;
  from: Address;
  recipient: Address;
  amount: BigNumber;
  payload?: {
    mothed: 'constructor' | string;
    args: any[];
  };
  hash!: string;
  ts: number;

  genHash = async (db: SKDB) => {
    const obj = {
      accountNonce: this.accountNonce,
      cu: this.cu,
      cuLimit: this.cuLimit,
      recipient: this.recipient,
      amount: this.amount,
      payload: this.payload || null,
      ts: this.ts,
    };
    const cid = await db.dag.put(obj);
    this.hash = cid.toString();
  };

  static fromCid = async (db: SKDB, cid: string) => {
    const transData = (await db.dag.get(CID.parse(cid))).value;
    return new Transaction({
      accountNonce: new BigNumber(transData[0]),
      amount: new BigNumber(transData[1]),
      cu: new BigNumber (transData[2]),
      cuLimit: new BigNumber (transData[3]),
      from: transData[4],
      hash: transData[5],
      payload: transData[6],
      recipient: transData[7],
      ts: transData[8],
    });
  };

  /**
   * 将区块数据保存，落文件
   */
  commit = async (db: SKDB, blockNumber: BigNumber) => {
    this.blockNumber = blockNumber;
    const transCid = await db.dag.put([
      this.accountNonce.toString(),
      this.amount.toString(),
      this.cu.toString(),
      this.cuLimit.toString(),
      this.from,
      this.hash,
      this.payload || null,
      this.recipient,
      this.ts,
    ]);
    return transCid;
  };
}
