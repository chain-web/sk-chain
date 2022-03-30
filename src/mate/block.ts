import BigNumber from 'bignumber.js';
import { IPFS } from 'ipfs-core';
import { Transaction } from './transaction';
import { CID } from 'multiformats/cid';
import { SKDB } from 'lib/ipfs/ipfs.interface';

export interface createBlockOpt {
  transactions: Transaction[];
}

// 区块，块头基础数据结构
export interface BlockHeaderData {
  parent: string; // 父级区块 stateRoot
  stateRoot: string; // 全账户状态树根节点hash
  transactionsRoot: string; // 当前块的交易树根节点hash
  receiptsRoot: string; // 当前块的收据树根节点hash
  logsBloom: Uint8Array; // 当前块交易接收者的bloom，用于快速查找
  difficulty: BigNumber; // 难度，用来调整出块时间，由于不挖矿，具体实现待定
  number: BigNumber; // 当前块序号
  cuLimit: BigNumber; // 当前块，计算量上限
  cuUsed: BigNumber; // 当前块消耗的计算量
  ts: number; // 当前块创建时间
  slice: [number, number]; // 分片信息
  extraData?: { [key: string]: unknown }; // 当前块自定义数据，不能超过？kb
  body: string;
}

// 区块，块数据体基础数据结构
export interface BlockBodyData {
  transactions: Transaction[];
}
export class Block {
  constructor(header: Omit<BlockHeaderData, 'hash'>) {
    this.header = header;
  }
  hash!: string;
  header: BlockHeaderData;
  body?: BlockBodyData;

  /**
   * 创建一个新的块
   */
  // public static createNew = (): Block => {
  //   const blockHeader = {}
  //   const blockBody = {}
  //   return new Block(blockHeader, blockBody)
  // };

  /**
   * 从已有cid，读取一个区块,只包含块头，但不解析body
   */
  public static fromCidOnlyHeader = async (
    cid: string,
    db: SKDB,
  ): Promise<Block> => {
    const blockData = (await db.dag.get(CID.parse(cid))).value;
    return new Block({
      ...blockData,
    });
  };

  /**
   * 从已有cid，读取一个区块,包含块头、body
   */
  public static fromCid = async (cid: string, db: SKDB): Promise<Block> => {
    const block = await Block.fromCidOnlyHeader(cid, db);
    block.body = (await db.dag.get(CID.parse(block.header.body!))).value;
    return block;
  };

  genHash = async (db: SKDB) => {
    const obj = {
      ...this.header,
      body: this.body,
      ts: undefined, // ts 不参与生成块hash
    };
    delete (obj as any).hash;
    const cid = await db.dag.put(obj);
    this.hash = cid.toString();
  };

  /**
   * 将区块数据保存，落文件
   */
  commit = async (db: SKDB) => {
    const bodyCid = await db.dag.put(this.body);
    this.header.body = bodyCid.toString();
    const blockCid = await db.dag.put({
      header: this.header,
      hash: this.hash,
    });
    return blockCid;
  };
}
