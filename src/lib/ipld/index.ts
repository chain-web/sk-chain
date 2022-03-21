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

export type UpdateAccountI = Partial<Account> & { account: Account['account'] };

export class Ipld {
  constructor(db: SKDB) {
    this.db = db;
  }
  db: SKDB;

  // 缓存未写入block的账户数据
  private updates: Map<string, UpdateAccountI> = new Map();

  clearUpdates = () => {
    this.updates = new Map();
  };

  /**
   * 注册到智能合约的执行环境，获取账户数据
   * @param did
   * @returns
   */
  getAccount = async (did: string) => {
    if (this.updates.has(did)) {
      return this.updates.get(did);
    } else {
      return await this.getAccountFromDb(did);
    }
  };

  getAccountFromDb = async (did: string) => {
    this.db.block.get(CID.parse(did));
    return 'account msg';
  };

  /**
   * 接收智能合约的执行结果，更新账户数据
   * @param account
   */
  addUpdate = (account: UpdateAccountI) => {
    this.updates.set(account.account, {
      ...(this.updates.get(account.account) || {}),
      ...account,
    });
  };

  /**
   * 将账户更新的缓存写入到磁盘
   */
  saveUpdates = async () => {};

  genNewStateRoot = async () => {};
}
