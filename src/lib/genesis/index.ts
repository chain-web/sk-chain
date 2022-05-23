import BigNumber from 'bignumber.js';
import { GenesisConfig } from '../../config/types';
import { Account, newAccount } from '../../mate/account';
import { BlockHeaderData, Block } from '../../mate/block';
import { SKChainLibBase } from '../base';
import { lifecycleEvents, LifecycleStap } from '../events/lifecycle';
import { BloomFilter } from '../ipld/logsBloom/bloomFilter';
import { Mpt } from '../ipld/mpt';
import { createEmptyNode } from '../ipld/util';
import { SKChain } from './../../skChain';
export class Genesis extends SKChainLibBase {
  constructor(chain: SKChain, genesis: GenesisConfig) {
    super(chain);
    this.genesis = genesis;
  }

  // 创世配置
  genesis: GenesisConfig;
  checkGenesisBlock = async () => {
    lifecycleEvents.emit(LifecycleStap.checkingGenesisBlock);
    if (!this.chain.blockService.needGenseis()) {
      // 不是完全冷启动
      // this.checkGenesis();
      lifecycleEvents.emit(LifecycleStap.checkedGenesisBlock);
    } else {
      // 完全冷启动

      // 初始化预设账号
      const stateRoot = await this.initAlloc(this.genesis.alloc);

      // 创建创世区块
      const logsBloom = new BloomFilter();
      logsBloom.loadData(this.genesis.logsBloom);
      const genesisBlockHeader: BlockHeaderData = {
        parent: this.genesis.parent,
        stateRoot,
        transactionsRoot: (
          await this.chain.db.dag.put(createEmptyNode('transactions-root'))
        ).toString(),
        receiptsRoot: (
          await this.chain.db.dag.put(createEmptyNode('receipts-root'))
        ).toString(),
        logsBloom,
        difficulty: this.genesis.difficulty,
        number: this.genesis.number,
        cuLimit: this.genesis.cuLimit,
        cuUsed: new BigNumber(0),
        ts: this.genesis.timestamp,
        slice: [1, 0],
        body: (await this.chain.db.dag.put([])).toString(),
      };
      const genesisBlock = new Block(genesisBlockHeader);
      genesisBlock.body = { transactions: [] };
      await genesisBlock.genHash(this.chain.db);
      const cid = await genesisBlock.commit(this.chain.db);
      // 将创世块cid存储到块索引
      await this.chain.blockService.addBlockCidByNumber(
        cid.toString(),
        genesisBlock.header.number,
      );

      lifecycleEvents.emit(LifecycleStap.checkedGenesisBlock);
    }
  };

  // 设置预设账号
  initAlloc = async (alloc: GenesisConfig['alloc']) => {
    const accounts: Account[] = [];
    if (alloc) {
      const dids = Object.keys(alloc);
      for (const did of dids) {
        const storageRoot = await this.chain.db.dag.put({});
        const account = newAccount(did, storageRoot);
        // 给每个初始账号充值
        account.plusBlance(alloc[did].balance, "1641000000000");
        accounts.push(account);
      }
    }
    const initStateRoot = new Mpt(
      this.chain.db,
      (await this.chain.db.dag.put(createEmptyNode('state-root'))).toString(),
    );
    await initStateRoot.initRootTree();
    for (const account of accounts) {
      await initStateRoot.updateKey(
        account.account.did,
        await account.commit(this.chain.db),
      );
    }
    return (await initStateRoot.save()).toString();
  };

  // 检查链合法性
  checkGenesis(genesisBlock: Block) {
    // 暂时未确定，要搞什么
  }
}
