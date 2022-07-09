import { createLink, PBNode } from '@ipld/dag-pb';
import BigNumber from 'bignumber.js';
import { CID } from 'multiformats';
import { Block } from '../../../mate/block';
import { message } from '../../../utils/message';
import { SKDB } from '../../ipfs/ipfs.interface';

// 块数据索引数据结构
interface BlockIndex {
  // PBNode
  name: 'block-index';
  links: {
    name: 'block-index-${setNumber}';
    sets: 'cid'[];
  }[];
}

// 操作已经存储的块索引
export class BlockRoot {
  constructor(db: SKDB) {
    this.db = db;
  }
  // 块cid存储在一个类似二维数组的结构里，setSize是内层数组的单组大小
  static setSize = 10 * 10000;

  rootCid!: string;
  rootNode!: PBNode;

  db: SKDB;

  init = async (rootCid: string) => {
    this.rootCid = rootCid;
    if (!this.rootCid) {
      message.error('invalid block root cid');
    }
    this.rootNode = (await this.db.dag.get(CID.parse(this.rootCid))).value;
  };

  // 根据区块高度，算出所在set信息
  genIndex = (number: BigNumber) => {
    const setIndex = number.idiv(BlockRoot.setSize).toNumber();
    const curIndex = number.modulo(BlockRoot.setSize).toNumber();
    return {
      setIndex,
      curIndex,
    };
  };

  addBlockToRootNode = async (cid: string, number: BigNumber) => {
    const { setIndex, curIndex } = this.genIndex(number);
    const set = this.rootNode.Links[setIndex];
    if (set) {
      // 已有set
      // 获取此set数据
      const setData = (await this.db.dag.get(set.Hash)).value;
      setData[curIndex] = cid;
      const newSetCid = await this.db.dag.put(setData);
      set.Hash = newSetCid;
    } else {
      // 无此set，创建
      const curArr = [];
      curArr[curIndex] = cid; // 这里不认为新set的curIndex必定为0，因为有新节点从其他节点同步block数据的情况，接受的块可能是无序
      const curCid = await this.db.dag.put(curArr);
      const newSet = createLink(
        `block-index-${setIndex}`,
        (await this.db.block.stat(curCid)).size,
        curCid,
      );

      this.rootNode.Links[setIndex] = newSet; // 这里不认为setIndex必定为0，因为有新节点从其他节点同步block数据的情况，接受的块可能是无序
    }
  };

  // 删除指定块之后的所有块数据
  deleteFromStartNUmber = async (number: BigNumber) => {
    const { setIndex, curIndex } = this.genIndex(number);
    const set = this.rootNode.Links[setIndex];
    let deleted = [];
    if (set) {
      // 删除当前set中的部分
      const setData = (await this.db.dag.get(set.Hash)).value;
      deleted.push(...setData.slice(curIndex));
      const newSetData = setData.splice(0, curIndex);
      const newSetCid = await this.db.dag.put(newSetData);
      set.Hash = newSetCid;
    }
    while (this.rootNode.Links.length > setIndex + 1) {
      const poped = this.rootNode.Links.pop();
      if (poped) {
        const setData = (await this.db.dag.get(poped.Hash)).value;
        deleted = deleted.concat(setData);
      }
    }
    message.info(`deleteFromStartNUmber ${number}`, deleted);
    return deleted;
  };

  // 获取指定高度的块cid
  getBlockCidByNumber = async (
    number: BigNumber,
  ): Promise<string | undefined> => {
    const { curIndex } = this.genIndex(number);

    const setData = await this.getSetByNumber(number);
    if (setData) {
      return setData[curIndex];
    }
  };

  // 获取指定高度的块所在的set
  getSetByNumber = async (number: BigNumber) => {
    const { setIndex } = this.genIndex(number);
    const set = this.rootNode.Links[setIndex];
    if (set) {
      const setData: string[] = (await this.db.dag.get(set.Hash)).value;
      return setData;
    }
  };

  // 获取指定高度的块，所在set，并且只包含指定块之后的块
  getSetAfterNumber = async (number: BigNumber) => {
    const { curIndex } = this.genIndex(number);
    const setData = await this.getSetByNumber(number);
    setData?.splice(0, curIndex);
    return setData;
  };

  // 获取指定高度的块数据
  getBlockByNumber = async (number: BigNumber) => {
    const cid = await this.getBlockCidByNumber(number);

    if (cid) {
      const block = await Block.fromCidOnlyHeader(cid, this.db);
      return block;
    }
  };

  // 获取最新块
  getHeaderBlock = async () => {
    const headerSet = this.rootNode.Links[this.rootNode.Links.length - 1];
    const headerSetData: string[] = (await this.db.dag.get(headerSet.Hash))
      .value;
    const headerBlockCid = headerSetData[headerSetData.length - 1];
    const block = await Block.fromCidOnlyHeader(headerBlockCid, this.db);
    return block;
  };

  save = async () => {
    this.rootCid = (await this.db.dag.put(this.rootNode)).toString();
    return this.rootCid;
  };
}
