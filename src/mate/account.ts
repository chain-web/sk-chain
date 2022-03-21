import { BigNumber } from 'bignumber.js';
import { CID } from './types';
// 账户，基础数据结构
export class Account {
  constructor({
    codeCid,
    account,
    contribute,
  }: {
    codeCid?: CID;
    account: string;
    contribute: BigNumber;
  }) {
    this.nonce = new BigNumber(0);
    this.balance = [];
    this.account = account;
    this.contribute = contribute;
    if (codeCid) {
      // 如果传入了
      this.codeCid = codeCid;
      this.storageRoot = this.generateStorageRoot();
    }
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
  private storageRoot?: CID;
  // 存储合约代码的地址
  private codeCid?: CID;

  public static from = () => {};

  // TODO
  // 合约账户首次创建时，创建合约存储地址
  private generateStorageRoot = () => {
    return '' as unknown as CID;
  };

  setNextNonce = () => {
    this.nonce = this.nonce.plus(new BigNumber(1));
  };

  getBlance = () => {
    return Object.keys(this.balance).reduce((sum, cur) => {
      return sum.plus(this.balance[cur as unknown as number]);
    }, new BigNumber(0));
  };

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
  };

  plusBlance = (amount: BigNumber) => {
    this.balance[Date.now()] = amount;
  };

  updateState = (data: any) => {}

  // 数据从内存提交到ipfs
  commit = (amount: BigNumber) => {};
}

export const newAccount = (did: string) => {
  return new Account({ account: did, contribute: new BigNumber(0) });
};
