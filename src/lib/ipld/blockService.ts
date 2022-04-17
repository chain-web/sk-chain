import { BlockRoot } from './blockRoot';
import { Block } from './../../mate/block';
import { createEmptyNode } from './util';
import { skCacheKeys } from 'lib/ipfs/key';
import { createLink, PBNode } from '@ipld/dag-pb';
import BigNumber from 'bignumber.js';
import { SKChain } from './../../skChain';
import { SKChainLibBase } from './../base';
import { CID, bytes } from 'multiformats';
import { lifecycleEvents, lifecycleStap } from 'lib/events/lifecycle';

// 管理、已经存储的块索引
export class BlockService extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
    this.blockRoot = new BlockRoot(this.chain.db);
    this.getBlockByNumber = this.blockRoot.getBlockByNumber;
    this.getHeaderBlock = this.blockRoot.getHeaderBlock;
  }
  blockRoot: BlockRoot;

  // 连续的已经验证通过的块高，在节点同步完成后是最新块
  checkedBlockHeight = new BigNumber(0);

  getBlockByNumber: BlockRoot['getBlockByNumber'];
  getHeaderBlock: BlockRoot['getHeaderBlock'];

  // 是否完全冷启动
  needGenseis = () => {
    return this.blockRoot.rootNode.Links.length === 0;
  };

  init = async () => {
    lifecycleEvents.emit(lifecycleStap.initingBlockService);
    const rootCid = this.chain.db.cache.get(skCacheKeys['sk-block']);
    if (!rootCid) {
      this.initGenseis();
    } else {
      await this.blockRoot.init(rootCid);
      await this.checkBlockRoot();
    }

    lifecycleEvents.emit(lifecycleStap.initedBlockService);
  };

  initGenseis = async () => {
    this.blockRoot.rootNode = createEmptyNode('block-index');
    await this.blockRoot.save();
  };

  checkBlockRoot = async () => {
    let prevBlock = await this.blockRoot.getBlockByNumber(
      this.checkedBlockHeight,
    );
    const headerBlockNumber = (
      await this.blockRoot.getHeaderBlock()
    ).header.number.toString();
    let checked = false;
    while (!checked) {
      lifecycleEvents.emit(
        lifecycleStap.checkingBlockIndex,
        `${this.checkedBlockHeight.toString()}/${headerBlockNumber}`,
      );
      const checkBlock = await this.blockRoot.getBlockByNumber(
        this.checkedBlockHeight.plus(1),
      );
      if (this.checkOneBlock(checkBlock, prevBlock)) {
        this.checkedBlockHeight = checkBlock?.header.number!; // 过了check，必不为空
      } else {
        checked = true;
        // TODO check不通过，纠正数据
      }
      prevBlock = checkBlock;
    }
    lifecycleEvents.emit(
      lifecycleStap.checkedBlockIndex,
      'checkedBlockHeight: ',
      this.checkedBlockHeight.toString(),
    );
  };

  // 检查一个块的合法性
  checkOneBlock = (block: Block | undefined, prev: Block | undefined) => {
    if (!block || !prev) {
      return;
    }
    if (block.header.parent !== prev.hash) {
      return false;
    }
    if (!block.header.number.isEqualTo(prev.header.number.plus(1))) {
      return false;
    }
    return true;
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
    await this.blockRoot.addBlockToRootNode(cid, number);
    await this.save();
  };

  // 检查收到的blockRoot与自己本地的是否一致
  syncFromBlockRoot = async (blockRoot: string) => {
    const newBlockRoot = new BlockRoot(this.chain.db);
    await newBlockRoot.init(blockRoot);
    const newHeaderBlock = await newBlockRoot.getHeaderBlock();
    let prevBlock = await this.blockRoot.getBlockByNumber(
      this.checkedBlockHeight,
    );

    while (this.checkedBlockHeight.isLessThan(newHeaderBlock.header.number)) {
      // 逐个set的去把区块同步到本地
      const set = await newBlockRoot.getSetByNumber(
        this.checkedBlockHeight.plus(1),
      );
      if (set) {
        for (const blockCid of set) {
          // 每个set再逐个block校验并同步
          const checkBlock = await Block.fromCidOnlyHeader(
            blockCid,
            this.chain.db,
          );
          if (this.checkOneBlock(checkBlock, prevBlock)) {
            this.checkedBlockHeight = this.checkedBlockHeight.plus(1);
            this.addBlockCidByNumber(blockCid, this.checkedBlockHeight);
          }
        }
      }
    }
  };

  save = async () => {
    this.blockRoot.save();
    this.chain.db.cache.put(skCacheKeys['sk-block'], this.blockRoot.rootCid);
  };
}
