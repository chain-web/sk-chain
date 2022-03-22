import { BigNumber } from 'bignumber.js';
import {
  createLink,
  createNode,
  PBLink,
  PBNode,
  encode,
  ByteView,
} from '@ipld/dag-pb';
import { SKDB } from 'lib/ipfs/ipfs.interface';
import { Account } from 'mate/account';
import { CID } from 'multiformats';
import { skCacheKeys } from 'lib/ipfs/key';
import { Block } from 'mate/block';
import { getKey } from './mpt';

export interface UpdateOps {
  plus?: BigNumber;
  minus?: BigNumber;
  state?: any;
}

export type UpdateAccountI = { ops: UpdateOps } & {
  account: Account['account'];
};

export class Ipld {
  constructor(db: SKDB) {
    this.db = db;
  }
  db: SKDB;

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
      return this.updates.get(did) as Account;
    } else {
      return await this.getAccountFromDb([did]);
    }
  };

  getAccounts = async (did: string[]): Promise<Account[]> => {
    return [];
  };

  getAccountFromDb = async (did: string[]): Promise<Account> => {
    console.log(did);
    const headerBlock = await Block.fromCidOnlyHeader(
      this.db.cache.get(skCacheKeys['sk-block']),
      this.db,
    );
    const stateRoot = headerBlock.header.stateRoot;
    // TODO MPT 批量查找
    const accountCid = await getKey(this.db, stateRoot, did[0]);

    return await Account.fromCid(this.db, accountCid);
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
    this.updates.set(account.account, account);
  };

  /**
   * 将账户更新的缓存写入到磁盘
   */
  saveUpdates = async () => {};

  genNewStateRoot = async () => {};
}
