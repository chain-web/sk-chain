import { BlockService } from './lib/ipld/blockService';
import { GenesisConfig } from './config/types';
import { lifecycleEvents, lifecycleStap } from './lib/events/lifecycle';
import { skCacheKeys } from './lib/ipfs/key';
import { Block } from './mate/block';
import { SKDB } from './lib/ipfs/ipfs.interface';
import { TransactionAction } from './lib/transaction';
import { Ipld } from 'lib/ipld';
import * as packageJson from '../package.json';
import { Consensus } from 'lib/consensus';
import { Genesis } from 'lib/genesis';

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

    // 对外暴露的一些方法
    this.transaction = this.transAction.transaction;
  }

  version: string;
  // 数据存取服务
  db: SKDB;
  // 创世配置
  genesis: Genesis;
  // 交易
  transAction: TransactionAction;
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

  init = async () => {
    await this.blockService.init();
    await this.genesis.checkGenesisBlock();
    // await this.db.swarm.connect(
    //   '/ip4/47.99.47.82/tcp/4003/ws/p2p/12D3KooWDd6gAZ1Djtt4bhAG7djGKM32ETxiiiJCCWnH5ypK2csa',
    // );
    await this.initHeaderBlock();
    lifecycleEvents.emit(lifecycleStap.initedHeaderBlock);
    await this.ipld.init();
    await this.transAction.init();
    await this.consensus.init();
    this.inited = true;
  };

  private initHeaderBlock = async () => {
    lifecycleEvents.emit(lifecycleStap.initingHeaderBlock);
  };

  getHeaderBlock = async () => {
    return await this.blockService.getHeaderBlock();
  };
}
