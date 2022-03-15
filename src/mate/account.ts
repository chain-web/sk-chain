import { BigNumber } from 'bignumber.js';
import { CID } from './types';
// 账户，基础数据结构
export class Account {
  constructor({ codeCid, account }: { codeCid?: CID, account: string }) {
    this.nonce = new BigNumber(0);
    this.balance = [];
    this.account = account
    if (codeCid) {
      // 如果传入了
      this.codeCid = codeCid;
      this.storageRoot = this.generateStorageRoot();
    }
  }
  account: string;
  // 当前账户交易次数
  private nonce: BigNumber;
  // 账户余额
  private balance: {
    // 数量
    amount: BigNumber;
    // 距离上次交易或打包的时间 ms
    age: number;
  }[];
  // 合约数据库地址，可能没法用hash
  private storageRoot?: CID;
  // 存储合约代码的地址
  private codeCid?: CID;

  public static from = () => { };

  // TODO
  // 合约账户首次创建时，创建合约存储地址
  private generateStorageRoot = () => {
    return '' as unknown as CID;
  };

  setNextNonce = () => {
    this.nonce = this.nonce.plus(new BigNumber(1));
  };

  // 数据从内存提交到ipfs
  commit = () => { };
}
