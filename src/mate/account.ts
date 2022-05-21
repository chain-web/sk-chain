import { SKDB } from '../lib/ipfs/ipfs.interface';
import { CID } from 'multiformats';
import BigNumber from 'bignumber.js';
import { Address } from './address';

interface AccountMeta {
  codeCid?: Account['codeCid'];
  owner?: Account['owner'];
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
    this.owner = meta.owner;
  }
  account: Address;
  // 当前账户交易次数
  nonce: BigNumber;

  // 当前账户的贡献值
  contribute: BigNumber;
  // 账户余额 {age: amount},这里age是交易发起的时间
  private balance: {
    [key: string]: BigNumber;
  };
  // 合约数据库地址，可能没法用hash
  storageRoot: CID;
  // 存储合约代码的地址
  codeCid?: CID; // v1

  // 合约的所有者
  owner?: string;

  /**
   * 用存储account 数据的 cid string生成一个account实例
   * @param db
   * @param cid
   * @returns
   */
  public static fromCid = async (db: SKDB, cid: string) => {
    const accountData = (await db.dag.get(CID.parse(cid))).value;
    const bl: Account['balance'] = {};
    accountData[1].map((ele: [string, string]) => {
      bl[ele[0]] = new BigNumber(ele[1]);
    });
    const accountMeta: AccountMeta = {
      account: new Address(accountData[0]),
      balance: bl,
      contribute: new BigNumber(accountData[3]),
      owner: accountData[4],
      nonce: new BigNumber(accountData[5]),
      storageRoot: CID.parse(accountData[6]),
    };
    if (accountData[2]) {
      accountMeta.codeCid = CID.parse(accountData[2]);
    }
    return new Account(accountMeta);
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
    const blanceKeys = Object.keys(this.balance).sort((a, b) => +b - +a);
    // 从年龄最大的blance开始进行减法，直到能把amount全部减掉
    while (!amount.isEqualTo(zero)) {
      const curIndex = blanceKeys.shift()!;
      const last = this.balance[curIndex].minus(amount);
      if (last.isLessThanOrEqualTo(zero)) {
        amount = last.abs();
        delete this.balance[curIndex];
      } else {
        this.balance[curIndex] = last;
        amount = zero;
      }
    }
    this.setNextNonce();
  };

  /**
   * 余额增加
   * @param amount
   */
  plusBlance = (amount: BigNumber, ts: string) => {
    this.balance[ts] = amount;
    this.setNextNonce();
  };

  // 更新状态树
  updateState = (cid: CID) => {
    this.storageRoot = cid;
    this.setNextNonce();
  };

  // 数据从内存提交到ipfs
  commit = async (db: SKDB) => {
    return db.dag.put([
      this.account.did,
      Object.keys(this.balance).map((key) => {
        return [key, this.balance[key].toString()];
      }),
      this.codeCid?.toString() || null,
      this.contribute.toString(),
      this.owner || null,
      this.nonce.toString(),
      this.storageRoot.toString(),
    ]);
  };
}

export const newAccount = (
  did: string,
  storageRoot: CID,
  codeCid?: CID,
  owner?: string,
) => {
  return new Account({
    account: new Address(did),
    contribute: new BigNumber(0),
    nonce: new BigNumber(0),
    balance: {},
    storageRoot,
    codeCid: codeCid,
    owner,
  });
};
