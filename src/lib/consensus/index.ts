import { SKChainLibBase } from './../base';
import { SKChain } from './../../skChain';
import BigNumber from 'bignumber.js';
import { Block } from 'mate/block';
import { bytes, CID } from 'multiformats';
import { Slice } from './slice';

interface ConsensusNewBlockData {
  cid: string;
  number: BigNumber;
}

export class Consensus extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
    this.slice = new Slice(this.chain.db);
  }

  blockPrefix = 'sk-block-new';
  slice: Slice;

  init = async () => {
    await this.slice.init();
    await this.subNewBlock();
  };

  /**
   * 广播新区块
   * @param nextBlock
   */
  public pubNewBlock = async (nextBlock: Block) => {
    const blockCid = await nextBlock.commit(this.chain.db);
    const nextData: ConsensusNewBlockData = {
      number: nextBlock.header.number,
      cid: blockCid.toString(),
    };
    await this.chain.db.pubsub.publish(
      this.blockPrefix,
      bytes.fromString(JSON.stringify(nextData)),
    );

    this.chain.blockHeader = nextBlock;
  };

  // 接收其他节点广播的新区块
  subNewBlock = async () => {
    this.chain.db.pubsub.subscribe(this.blockPrefix, async (data) => {
      if (data.from !== this.chain.did) {
        const newData: ConsensusNewBlockData = JSON.parse(
          bytes.toString(data.data),
        );

        console.log('receive new block', newData);
        console.log(this.chain.blockHeader);

        if (
          newData.number.isLessThanOrEqualTo(
            this.chain.blockHeader.header.number,
          )
        ) {
          // 接收到的块小于等于当前最新块
          // TODO 验证受到的块是否跟自己的本地存储块hash是否相同
        } else {
          // TODO
        }
      }
    });
  };
}
