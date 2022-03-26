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
      return newAccount(did);
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
  commit = async () => {};

  /**
   * 将账户更新的缓存写入到磁盘
   */
  saveUpdates = async () => {};

  genNewStateRoot = async () => {};
}
