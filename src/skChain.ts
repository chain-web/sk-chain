import { BlockService } from './lib/ipld/blockService';
import { GenesisConfig } from './config/types';
import { lifecycleEvents, lifecycleStap } from './lib/events/lifecycle';
import { skCacheKeys } from './lib/ipfs/key';
import { SKDB } from './lib/ipfs/ipfs.interface';
import { TransactionAction } from './lib/transaction';
import { Ipld } from './lib/ipld';
import * as packageJson from '../package.json';
import { Consensus } from './lib/consensus';
import { Genesis } from './lib/genesis';
import { message } from 'utils/message';
import { TransactionTest } from './lib/transaction/test';

export interface SKChainOption {
  genesis: GenesisConfig;
  db: SKDB;
}

export class SKChain {
  constructor(option: SKChainOption) {
    lifecycleEvents.emit(lifecycleStap.startCreateSKChain);
    this.version = packageJson.version;
    this.db = option.db;
    this.ipld = new Ipld(this);
    this.blockService = new BlockService(this);
    this.did = this.db.cache.get(skCacheKeys.accountId);
    this.genesis = new Genesis(this, option.genesis);
    this.consensus = new Consensus(this);
    this.transAction = new TransactionAction(this);
    this.transTest = new TransactionTest(this);

    // 对外暴露的一些方法
    this.transaction = this.transAction.transaction;
    this.deploy = this.transAction.deploy;
  }

  version: string;
  // 数据存取服务
  db: SKDB;
  // 创世配置
  genesis: Genesis;
  // 交易
  transAction: TransactionAction;
  transTest: TransactionTest;
  // 数据操作
  ipld: Ipld;

  blockService: BlockService;

  // 共识
  consensus: Consensus;
  // 当前节点did
  did: string;
  inited = false;

  // public methods
  transaction;
  deploy;

  init = async () => {
    try {
      await this.blockService.init();
      await this.genesis.checkGenesisBlock();
      // await this.db.swarm.connect(
      //   '/ip4/47.99.47.82/tcp/4003/ws/p2p/12D3KooWDd6gAZ1Djtt4bhAG7djGKM32ETxiiiJCCWnH5ypK2csa',
      // );
      await this.initHeaderBlock();
      lifecycleEvents.emit(lifecycleStap.initedHeaderBlock);
      lifecycleEvents.emit(lifecycleStap.initingIpld);
      await this.ipld.init();
      lifecycleEvents.emit(lifecycleStap.initedIpld);
      lifecycleEvents.emit(lifecycleStap.initingTransaction);
      await this.transAction.init();
      lifecycleEvents.emit(lifecycleStap.initedTransaction);
      await this.consensus.init();
    } catch (error) {
      message.error('init error', error);
    }

    this.inited = true;
  };

  private initHeaderBlock = async () => {
    lifecycleEvents.emit(lifecycleStap.initingHeaderBlock);
  };

  getHeaderBlock = async () => {
    return await this.blockService.getHeaderBlock();
  };
}
