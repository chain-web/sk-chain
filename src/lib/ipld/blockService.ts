import { Block } from './../../mate/block';
import { createEmptyNode } from './util';
import { skCacheKeys } from 'lib/ipfs/key';
import { createLink, PBNode } from '@ipld/dag-pb';
import BigNumber from 'bignumber.js';
import { SKChain } from './../../skChain';
import { SKChainLibBase } from './../base';
import { CID } from 'multiformats';
import { lifecycleEvents, lifecycleStap } from 'lib/events/lifecycle';

// 块数据索引数据结构
interface BlockIndex {
  // PBNode
  name: 'block-index';
  links: {
    name: 'block-index-${setNumber}';
    sets: 'cid'[];
  }[];
}

// 管理、操作已经存储的块索引
export class BlockService extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
  }
  // 块cid存储在一个类似二维数组的结构里，setSize是内层数组的单组大小
  setSize = 10 * 10000;

  rootCid!: string;
  rootNode!: PBNode;

  // 是否完全冷启动
  needGenseis = () => {
    return this.rootNode.Links.length === 0;
  };

  init = async () => {
    lifecycleEvents.emit(lifecycleStap.initingBlockService);
    this.rootCid = this.chain.db.cache.get(skCacheKeys['sk-block']);
    if (!this.rootCid) {
      // 初始化块索引数据
      await this.initGenseis();
    }
    this.rootNode = (
      await this.chain.db.dag.get(CID.parse(this.rootCid))
    ).value;
    lifecycleEvents.emit(lifecycleStap.initedBlockService);
  };

  initGenseis = async () => {
    this.rootNode = createEmptyNode('block-index');
    await this.save();
  };

  // 根据区块高度，算出所在set信息
  genIndex = (number: BigNumber) => {
    const setIndex = number.idiv(this.setSize).toNumber();
    const curIndex = number.modulo(this.setSize).toNumber();
    return {
      setIndex,
      curIndex,
    };
  };

  /**
   * @description 添加或更新指定块的cid
   * @param cid
   * @param number
   */
  addBlockCidByNumber = async (
    cid: string,
    number: BigNumber, // 其实没必要用BigNumber，因为这里实现是用的数组，并且最大长度为setSize，不会出现超大数字，先这么放着吧
  ) => {
    const { setIndex, curIndex } = this.genIndex(number);
    const set = this.rootNode.Links[setIndex];
    if (set) {
      // 已有set
      // 获取此set数据
      const setData = (await this.chain.db.dag.get(set.Hash)).value;
      setData[curIndex] = cid;
      const newSetCid = await this.chain.db.dag.put(setData);
      set.Hash = newSetCid;
    } else {
      // 无此set，创建
      const curArr = [];
      curArr[curIndex] = cid; // 这里不认为新set的curIndex必定为0，因为有新节点从其他节点同步block数据的情况，接受的块可能是无序
      const curCid = await this.chain.db.dag.put(curArr);
      const newSet = createLink(
        `block-index-${setIndex}`,
        (await this.chain.db.block.stat(curCid)).size,
        curCid,
      );

      this.rootNode.Links[setIndex] = newSet; // 这里不认为setIndex必定为0，因为有新节点从其他节点同步block数据的情况，接受的块可能是无序
    }
  };

  // 获取指定高度的块cid
  private getBlockCidByNumber = async (
    number: BigNumber,
  ): Promise<string | undefined> => {
    const { setIndex, curIndex } = this.genIndex(number);

    const set = this.rootNode.Links[setIndex];
    if (set) {
      const setData = (await this.chain.db.dag.get(set.Hash)).value;
      return setData[curIndex];
    }
  };

  // 获取指定高度的块数据
  getBlockByNumber = async (number: BigNumber) => {
    const cid = await this.getBlockCidByNumber(number);

    if (cid) {
      const block = await Block.fromCidOnlyHeader(cid, this.chain.db);
      return block;
    }
  };

  // 获取最新块
  getHeaderBlock = async () => {
    const headerSet = this.rootNode.Links[this.rootNode.Links.length - 1];
    const headerSetData: string[] = (
      await this.chain.db.dag.get(headerSet.Hash)
    ).value;
    const headerBlockCid = headerSetData[headerSetData.length - 1];
    const block = await Block.fromCidOnlyHeader(headerBlockCid, this.chain.db);
    return block;
  };

  save = async () => {
    this.rootCid = (await this.chain.db.dag.put(this.rootNode)).toString();
    this.chain.db.cache.put(skCacheKeys['sk-block'], this.rootCid);
  };
}
