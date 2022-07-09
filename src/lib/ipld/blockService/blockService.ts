import { BlockRoot } from './blockRoot';
import { Block } from '../../../mate/block';
import { createEmptyNode } from '../util';
import BigNumber from 'bignumber.js';
import { SKChain } from '../../../skChain';
import { SKChainLibBase } from '../../base';
import { lifecycleEvents, LifecycleStap } from '../../events/lifecycle';
import { skCacheKeys } from '../../ipfs/key';
import { message } from '../../../utils/message';
import { CID } from 'multiformats';
import { Mpt } from '../mpt';
import { isTxInBlock } from './util';

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

  /**
   * @description 添加或更新指定块的cid
   * @param cid
   * @param number
   */
  addBlockCidByNumber = async (
    cid: string,
    number: BigNumber, // 其实没必要用BigNumber，因为这里实现是用的数组，并且最大长度为setSize，不会出现超大数字，先这么放着吧
  ) => {
    let prevBlock = await this.getBlockByNumber(this.checkedBlockHeight);
    let nextBlock = await Block.fromCid(cid, this.chain.db);
    if (this.checkOneBlock(nextBlock, prevBlock)) {
      this.checkedBlockHeight = nextBlock.header.number;
    }
    await this.blockRoot.addBlockToRootNode(cid, number);
    await this.chain.pinService.pin(cid);
    await this.save();
  };

  // 删除指定块及其之后的块
  deleteFromStartNUmber = async (number: BigNumber) => {
    const deleted = await this.blockRoot.deleteFromStartNUmber(number);
    await this.chain.pinService.unpinFromList(deleted);
  };

  // 是否完全冷启动
  needGenseis = () => {
    return this.blockRoot.rootNode.Links.length === 0;
  };

  init = async () => {
    lifecycleEvents.emit(LifecycleStap.initingBlockService);
    const rootCid = this.chain.db.cache.get(skCacheKeys['sk-block']);
    if (!rootCid) {
      await this.initGenseis();
    } else {
      await this.blockRoot.init(rootCid);
      await this.checkBlockRoot();
    }

    lifecycleEvents.emit(LifecycleStap.initedBlockService);
  };

  initGenseis = async () => {
    this.blockRoot.rootNode = createEmptyNode('block-index');
    await this.save();
  };

  checkBlockRoot = async () => {
    let prevBlock = await this.getBlockByNumber(this.checkedBlockHeight);
    const headerBlockNumber = (
      await this.getHeaderBlock()
    ).header.number.toString();
    let checked = false;
    while (!checked) {
      lifecycleEvents.emit(
        LifecycleStap.checkingBlockIndex,
        `${this.checkedBlockHeight.toString()}/${headerBlockNumber}`,
      );
      const checkBlock = await this.getBlockByNumber(
        this.checkedBlockHeight.plus(1),
      );
      if (this.checkOneBlock(checkBlock, prevBlock)) {
        this.checkedBlockHeight = checkBlock?.header.number!; // 过了check，必不为空
      } else {
        checked = true;
        if (checkBlock) {
          //  check不通过，纠正数据, 删除错误块及其之后的块
          await this.deleteFromStartNUmber(this.checkedBlockHeight);

          lifecycleEvents.emit(
            LifecycleStap.checkedBlockIndex,
            'checkedBlockHeight: ',
            'delete after',
            this.checkedBlockHeight.toString(),
          );
          await this.save();
        }
      }
      prevBlock = checkBlock;
    }
    lifecycleEvents.emit(
      LifecycleStap.checkedBlockIndex,
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

  // 检查收到的blockRoot与自己本地的是否一致
  syncFromBlockRoot = async (blockRoot: string) => {
    lifecycleEvents.emit(LifecycleStap.syncingHeaderBlock, blockRoot);
    const newBlockRoot = new BlockRoot(this.chain.db);
    await newBlockRoot.init(blockRoot);
    const newHeaderBlock = await newBlockRoot.getHeaderBlock();
    let prevBlock = await this.getBlockByNumber(this.checkedBlockHeight);
    while (this.checkedBlockHeight.isLessThan(newHeaderBlock.header.number)) {
      // 逐个set的去把区块同步到本地
      const set = await newBlockRoot.getSetAfterNumber(
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

            await this.addBlockCidByNumber(blockCid, this.checkedBlockHeight);
            prevBlock = checkBlock;
            lifecycleEvents.emit(
              LifecycleStap.syncingHeaderBlock,
              this.checkedBlockHeight.toString(),
              '/',
              newHeaderBlock.header.number.toString(),
            );
          } else {
            message.info('next block is not prev block + 1');
            this.checkedBlockHeight = this.checkedBlockHeight.minus(1);
            if (this.checkedBlockHeight.isEqualTo(0)) {
              return;
            }
            await this.deleteFromStartNUmber(this.checkedBlockHeight);
            await this.save();
            await this.syncFromBlockRoot(blockRoot);
            return;
          }
        }
      }
    }
  };

  // 从块头向下查询某个交易发生的块
  findTxBlockWidthDeep = async (tx: string, deep: number) => {
    let headerNumber = this.checkedBlockHeight;
    while (deep >= 0 && headerNumber.isGreaterThanOrEqualTo(0)) {
      const currBlock = await this.getBlockByNumber(headerNumber);
      if (
        currBlock &&
        (await isTxInBlock(tx, currBlock.header, this.chain.db))
      ) {
        return currBlock;
      }
      headerNumber = headerNumber.minus(1);
      deep--;
    }
  };

  save = async () => {
    await this.blockRoot.save();
    this.chain.db.cache.put(skCacheKeys['sk-block'], this.blockRoot.rootCid);
  };
}
