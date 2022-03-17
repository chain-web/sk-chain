import BigNumber from 'bignumber.js';
import { GenesisConfig } from './config/types';
import { lifecycleEvents, lifecycleStap } from './lib/events/lifecycle';
import { peerEvent } from './lib/events/peer';
import { skCacheKeys } from './lib/ipfs/key';
import { Block, BlockBodyData, BlockHeaderData } from './mate/block';
import type { CID } from 'multiformats/cid';
import { SKDB } from './lib/ipfs/ipfs.interface';
// import { Network } from './lib/p2p/network';
import type { transMeta } from './mate/transaction';
import { bytes } from 'multiformats';
import { Slice } from './lib/consensus/slice';
import { signById } from './lib/p2p/did';
import { message } from './utils/message';
import { TransactionAction } from './lib/transaction';
import { Ipld } from 'lib/ipld';

export interface SKChainOption {
  genesis: GenesisConfig;
  db: SKDB;
}

export class SKChain {
  constructor(option: SKChainOption) {
    lifecycleEvents.emit(lifecycleStap.startCreateSKChain);
    this.db = option.db;
    this.ipld = new Ipld(this.db);
    this.did = this.db.cache.get(skCacheKeys.accountId);
    this.genesis = option.genesis;
    this.slice = new Slice(this.db);
    this.transAction = new TransactionAction(this.db, this.ipld);
  }
  // 数据存取服务
  db: SKDB;
  // 创世配置
  genesis: GenesisConfig;
  // 交易
  transAction: TransactionAction;
  // 数据操作
  ipld: Ipld;
  did: string;
  slice: Slice;
  inited = false;
  init = async () => {
    await this.checkGenesisBlock();
    // await this.db.swarm.connect(
    //   '/ip4/47.99.47.82/tcp/4003/ws/p2p/12D3KooWDd6gAZ1Djtt4bhAG7djGKM32ETxiiiJCCWnH5ypK2csa',
    // );
    await this.transAction.init();
    await this.slice.init();
    this.inited = true;
  };

  checkGenesisBlock = async () => {
    lifecycleEvents.emit(lifecycleStap.checkingGenesisBlock);
    const blockHead = this.db.cache.get(skCacheKeys['sk-block']);
    if (blockHead) {
      // 不是完全冷启动
      lifecycleEvents.emit(lifecycleStap.checkedGenesisBlock);
    } else {
      // 完全冷启动
      // 创建创世区块
      const genesisBlockHeader: BlockHeaderData = {
        hash: this.genesis.hash,
        parent: this.genesis.parent as unknown as CID,
        stateRoot: this.genesis.stateRoot,
        transactionsRoot: this.genesis.transactionsRoot,
        receiptRoot: this.genesis.receiptRoot,
        logsBloom: this.genesis.logsBloom,
        difficulty: this.genesis.difficulty,
        number: this.genesis.number,
        cuLimit: this.genesis.cuLimit,
        cuUsed: new BigNumber(0),
        ts: this.genesis.timestamp,
        slice: [1, 0],
      };
      const genesisBlockBody: BlockBodyData = {
        transactions: [],
      };
      const genesisBlock = new Block(genesisBlockHeader, genesisBlockBody);
      const cid = await genesisBlock.commit(this.db);
      // this.transAction.setBlockHeader(genesisBlock.header);
      // 把块头记录在cache
      this.db.cache.put(skCacheKeys['sk-block'], cid.toString());
      lifecycleEvents.emit(lifecycleStap.checkedGenesisBlock);
    }

    // this.checkGenesis(genesisBlock);
  };

  // 检查链合法性
  checkGenesis(genesisBlock: Block) {
    // 暂时未确定，要搞什么
  }

  transaction = async (
    tm: Pick<transMeta, 'amount' | 'payload' | 'recipient'>,
  ) => {
    // 供外部调用的发起交易方法
    // 只是做交易检查和预处理
    if (!this.inited) {
      message.error('wait for inited');
      return;
    }
    if (!tm.amount || !tm.recipient) {
      // 校验
      message.error('need trans meta');
      return;
    }
    const signMeta = {
      ...tm,
      from: this.did,
      ts: Date.now(),
      cu: new BigNumber(100), // todo
    };
    const transMeta: transMeta = {
      ...signMeta,
      // 这里使用交易原始信息通过ipfs存储后的cid进行签名会更好？
      signature: await signById(
        this.db.cache.get(skCacheKeys.accountPrivKey),
        bytes.fromString(JSON.stringify(signMeta)),
      ),
    };
    this.db.pubsub.publish(
      peerEvent.transaction,
      bytes.fromString(JSON.stringify(transMeta)),
    );
    this.transAction.handelTransaction(transMeta);
  };
}
