import BigNumber from 'bignumber.js';
import { IPFS } from 'ipfs-core';
import { Transaction } from './transaction';
import type { cidHash } from './types';
import type { CID } from 'multiformats/cid';

export interface createBlockOpt {
  transactions: Transaction[];
}

// 区块，块头基础数据结构
export interface BlockHeaderData {
  hash: cidHash; // 当前节点hash
  parent: CID; // 父级区块 stateRoot
  stateRoot: cidHash; // 全账户状态树根节点hash
  transactionsRoot: cidHash; // 当前块的交易树根节点hash
  receiptRoot: cidHash; // 当前块的收据树根节点hash
  logsBloom: Uint8Array; // 当前块交易接收者的bloom，用于快速查找
  difficulty: BigNumber; // 难度，用来调整出块时间，由于不挖矿，具体实现待定
  number: BigNumber; // 当前块序号
  cuLimit: BigNumber; // 当前块，计算量上限
  cuUsed: BigNumber; // 当前块消耗的计算量
  ts: number; // 当前块创建时间
  slice: [number, number]; // 分片信息
  extraData?: { [key: string]: unknown }; // 当前块自定义数据，不能超过？kb
  body?: CID;
}

// 区块，块数据体基础数据结构
export interface BlockBodyData {
  transactions: Transaction[];
}
export class Block {
  constructor(header: BlockHeaderData, body: BlockBodyData) {
    this.body = body;
    this.header = header;
  }
  header: BlockHeaderData;
  body: BlockBodyData;

  /**
   * 创建一个新的块
   */
  // public static createNew = (): Block => {
  //   const blockHeader = {}
  //   const blockBody = {}
  //   return new Block(blockHeader, blockBody)
  // };

  /**
   * 从已有数据，读取一个区块
   */
  public static from = (cid: cidHash) => {};

  createStateRoot = (): cidHash => {
    return '' as unknown as cidHash;
  };

  /**
   * 将区块数据保存，落文件
   */
  commit = async (ipfs: IPFS) => {
    const bodyCid = await ipfs.dag.put(this.body);
    this.header.body = bodyCid;
    const blockCid = await ipfs.dag.put(this.header);
    return blockCid;
  };
}
