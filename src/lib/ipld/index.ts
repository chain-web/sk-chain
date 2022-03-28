import { message } from 'utils/message';
import { newAccount } from './../../mate/account';
import { BigNumber } from 'bignumber.js';
import { SKDB } from 'lib/ipfs/ipfs.interface';
import { Account } from 'mate/account';
import { CID } from 'multiformats';
import { skCacheKeys } from 'lib/ipfs/key';
import { Block } from 'mate/block';
import { Mpt } from './mpt';
import { TransErrorType } from 'lib/contracts/transaction_demo';

export interface UpdateOps {
  plus?: BigNumber;
  minus?: BigNumber;
  state?: any;
  error?: TransErrorType;
}

export type UpdateAccountI = { ops: UpdateOps } & {
  account: Account['account'];
};

export class Ipld {
  constructor(db: SKDB) {
    this.db = db;
  }
  db: SKDB;
  private stateMpt!: Mpt;

  // 缓存未写入block的账户数据
  private updates: Map<string, Account> = new Map();

  clearUpdates = () => {
    this.updates = new Map();
  };

  /**
   * 注册到智能合约的执行环境，获取账户数据
   * @param did
   * @returns
   */
  getAccount = async (did: string): Promise<Account> => {
    if (this.updates.has(did)) {
      return this.updates.get(did)!;
    } else {
      return await this.getAccountFromDb(did);
    }
  };

  getAccountFromDb = async (did: string): Promise<Account> => {
    console.log(did);
    await this.checkMpt();

    const accountCid = await this.stateMpt.getKey(did);

    if (accountCid) {
      return await Account.fromCid(this.db, accountCid);
    } else {
      // 如果没有此account就create
      const storageRoot = await this.db.dag.put({});
      return newAccount(did, storageRoot);
    }
  };

  /**
   * 接收智能合约的执行结果，批量更新账户数据
   * @param account
   */
  addUpdates = async (updates: UpdateAccountI[]) => {
    for (const update of updates) {
      await this.addUpdate(update);
    }
  };

  /**
   * 接收智能合约的执行结果，更新账户数据
   * @param account
   */
  addUpdate = async (update: UpdateAccountI) => {
    const account = await this.getAccount(update.account);
    if (update.ops.plus) {
      account.plusBlance(update.ops.plus);
    }
    if (update.ops.minus) {
      account.minusBlance(update.ops.minus);
    }
    if (update.ops.state) {
      account.updateState(update.ops.state);
    }
    if (update.ops.error) {
      message.error(update.ops.error);
    }
    this.updates.set(account.account, account);
  };

  checkMpt = async () => {
    if (!this.stateMpt) {
      const headerBlock = await Block.fromCidOnlyHeader(
        this.db.cache.get(skCacheKeys['sk-block']),
        this.db,
      );
      const stateRoot = headerBlock.header.stateRoot;
      this.stateMpt = new Mpt(this.db, stateRoot);
      await this.stateMpt.initRootTree();
    }
  };

  /**
   * 提交当前区块的数据，进行打包
   */
  commit = async () => {
    for (const account of this.updates) {
      const newCid = await account[1].commit(this.db);
      await this.stateMpt.updateKey(account[0], newCid);
    }
    // 新块的stateRoot
    const stateRoot = await this.stateMpt.save();

    // TODO
    // const nextBlock = new Block({
    //   parent: CID; // 父级区块 stateRoot
    //   stateRoot,
    //   transactionsRoot: cidHash; // 当前块的交易树根节点hash
    //   receiptRoot: cidHash; // 当前块的收据树根节点hash
    //   logsBloom: Uint8Array; // 当前块交易接收者的bloom，用于快速查找
    //   difficulty: BigNumber; // 难度，用来调整出块时间，由于不挖矿，具体实现待定
    //   number: BigNumber; // 当前块序号
    //   cuLimit: BigNumber; // 当前块，计算量上限
    //   cuUsed: BigNumber; // 当前块消耗的计算量
    //   ts: Date.now(); // 当前块创建时间
    //   slice: [number, number]; // 分片信息
    //   extraData?: { [key: string]: unknown }; // 当前块自定义数据，不能超过？kb
    //   body?: string;
    // })
  };

  /**
   * 将账户更新的缓存写入到磁盘
   */
  saveUpdates = async () => {};

  genNewStateRoot = async () => {};
}
