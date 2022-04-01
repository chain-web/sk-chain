import BigNumber from 'bignumber.js';
import { skCacheKeys } from 'index.browser';
import { SKDB } from 'lib/ipfs/ipfs.interface';
import { Block } from 'mate/block';
import { bytes, CID } from 'multiformats';
import { Slice } from './slice';

interface ConsensusNewBlockData {
  cid: string;
  number: BigNumber;
}

export class Consensus {
  constructor(db: SKDB) {
    this.db = db;
    this.slice = new Slice(db);
  }

  blockPrefix = 'sk-block-new';
  db: SKDB;
  slice: Slice;
  currentBlock!: Block;

  init = async () => {
    await this.slice.init();
  };

  /**
   * 广播新区块
   * @param nextBlock
   */
  public pubNewBlock = async (nextBlock: Block) => {
    const blockCid = await nextBlock.commit(this.db);
    const nextData: ConsensusNewBlockData = {
      number: nextBlock.header.number,
      cid: blockCid.toString(),
    };
    await this.db.pubsub.publish(
      this.blockPrefix,
      bytes.fromString(JSON.stringify(nextData)),
    );

    this.currentBlock = nextBlock;
  };

  // 接收其他节点广播的新区块
  subNewBlock = async () => {
    this.db.pubsub.subscribe(this.blockPrefix, async (data) => {
      if (data.from !== this.db.cache.get(skCacheKeys.accountId)) {
        const newData: ConsensusNewBlockData = JSON.parse(
          bytes.toString(data.data),
        );

        if (newData.number.isLessThanOrEqualTo(this.currentBlock.header.number)) {
          // 接收到的块小于等于当前最新块
          // TODO 验证受到的块是否跟自己的本地存储块hash是否相同
        } else {
          // TODO
        }
      }
    });
  };

}
