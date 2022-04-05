import { SKDB } from '../lib/ipfs/ipfs.interface';
import { BigNumber } from 'bignumber.js';
import { CID } from 'multiformats';

interface AccountMeta {
  codeCid?: Account['codeCid'];
  account: Account['account'];
  contribute: Account['contribute'];
  nonce: Account['nonce'];
  balance: Account['balance'];
  storageRoot: Account['storageRoot'];
}

// 账户，基础数据结构
export class Account {
  constructor(meta: AccountMeta) {
    // TODO cannot use
    this.nonce = meta.nonce;
    this.balance = meta.balance;
    this.account = meta.account;
    this.contribute = meta.contribute;
    this.storageRoot = meta.storageRoot;
    this.codeCid = meta.codeCid;
  }
  account: string;
  // 当前账户交易次数
  private nonce: BigNumber;

  // 当前账户的贡献值
  contribute: BigNumber;
  // 账户余额 {age: amount}
  private balance: {
    [key: number]: BigNumber;
  };
  // 合约数据库地址，可能没法用hash
  private storageRoot: CID;
  // 存储合约代码的地址
  private codeCid?: CID;

  /**
   * 用存储account 数据的 cid string生成一个account实例
   * @param db
   * @param cid
   * @returns
   */
  public static fromCid = async (db: SKDB, cid: string) => {
    const accountData = (await db.dag.get(CID.parse(cid))).value;
    return new Account({
      account: accountData[0],
      balance: accountData[1],
      codeCid: accountData[2],
      contribute: accountData[3],
      nonce: accountData[4],
      storageRoot: CID.parse(accountData[5]),
    });
  };

  // 每进行一次交易，执行此操作
  setNextNonce = () => {
    this.nonce = this.nonce.plus(new BigNumber(1));
  };

  /**
   * 获取当前账户余额
   * @returns
   */
  getBlance = () => {
    return Object.keys(this.balance).reduce((sum, cur) => {
      return sum.plus(this.balance[cur as unknown as number]);
    }, new BigNumber(0));
  };

  /**
   * 支出余额
   * @param amount
   * @returns
   */
  minusBlance = (amount: BigNumber) => {
    if (!amount.isLessThanOrEqualTo(this.getBlance())) {
      return 'dont have such amount to minus';
    }
    const zero = new BigNumber(0);
    // 从年龄最大的blance开始进行减法，直到能把amount全部减掉
    while (!amount.isEqualTo(zero)) {
      const last = this.balance[0].minus(amount);
      if (last.isLessThanOrEqualTo(zero)) {
        amount = last.abs();
        delete this.balance[0];
      } else {
        this.balance[0] = last;
        amount = zero;
      }
    }
    this.setNextNonce();
  };

  /**
   * 余额增加
   * @param amount
   */
  plusBlance = (amount: BigNumber) => {
    this.balance[Date.now()] = amount;
    this.setNextNonce();
  };

  // 更新状态树
  updateState = (data: any) => {
    this.setNextNonce();
  };

  // 数据从内存提交到ipfs
  commit = async (db: SKDB) => {
    return db.dag.put([
      this.account,
      this.balance,
      this.codeCid || '',
      this.contribute,
      this.nonce,
      this.storageRoot.toString(),
    ]);
  };
}

export const newAccount = (did: string, storageRoot: CID) => {
  return new Account({
    account: did,
    contribute: new BigNumber(0),
    nonce: new BigNumber(0),
    balance: {},
    storageRoot,
  });
};
