import BigNumber from 'bignumber.js';
import { Transaction } from './transaction';
import { CID } from 'multiformats/cid';
import { SKDB } from '../lib/ipfs/ipfs.interface';

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
  ts: number; // 当前块最后一个交易的时间戳
  slice: [number, number]; // 分片信息
  extraData?: { [key: string]: unknown }; // 当前块自定义数据，不能超过？kb
  body: string;
}

// 区块，块数据体基础数据结构
export interface BlockBodyData {
  transactions: Transaction['hash'][];
}

const blockHeaderKeys: (keyof BlockHeaderData)[] = [
  'body',
  'cuLimit',
  'cuUsed',
  'difficulty',
  'extraData',
  'logsBloom',
  'number',
  'parent',
  'receiptsRoot',
  'slice',
  'stateRoot',
  'transactionsRoot',
  'ts',
];

const bnHeaderKeys = ['cuLimit', 'cuUsed', 'difficulty', 'number'];

export class Block {
  constructor(header: Omit<BlockHeaderData, 'hash'>) {
    if (!header.extraData) {
      header.extraData = {};
    }
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
  ): Promise<Omit<Block, 'body'>> => {
    const blockData = (await db.dag.get(CID.parse(cid))).value;
    const headerData = blockData.header;
    const header: Partial<BlockHeaderData> = {};
    blockHeaderKeys.map((key, i) => {
      header[key] = headerData[i];
      if (bnHeaderKeys.includes(key)) {
        // 恢复bignumber
        (header[key] as any) = new BigNumber(headerData[i]);
      }
    });

    const newBlock = new Block(header as BlockHeaderData);
    newBlock.hash = blockData.hash;
    return newBlock
  };

  /**
   * 从已有cid，读取一个区块,包含块头、body
   */
  public static fromCid = async (cid: string, db: SKDB): Promise<Block> => {
    const block = await Block.fromCidOnlyHeader(cid, db) as Block;
    block.body = (await db.dag.get(CID.parse(block.header.body!))).value;
    return block;
  };

  genHash = async (db: SKDB) => {
    const obj = {
      ...this.header,
      body: this.body,
    };
    // ts，hash 不参与生成块hash
    delete (obj as any).hash;
    delete (obj as any).ts;
    const cid = await db.dag.put(obj);
    this.hash = cid.toString();
  };

  /**
   * 将区块数据保存，落文件
   */
  commit = async (db: SKDB) => {
    const bodyCid = await db.dag.put(this.body);
    this.header.body = bodyCid.toString();
    const blockData = {
      header: blockHeaderKeys.map((ele) => {
        let val = this.header[ele];
        if (bnHeaderKeys.includes(ele)) {
          // bigNumber转为string存储
          return (val as BigNumber).toString();
        }
        return val;
      }),
      hash: this.hash,
    };
    const blockCid = await db.dag.put(blockData);
    return blockCid;
  };
}
