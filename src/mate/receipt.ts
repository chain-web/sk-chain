import BigNumber from 'bignumber.js';
import { BlockHeaderData } from './block';
import { Address, CID } from './types';

interface ReceiptData {
  blockHash: CID; // 交易所在块
  blockNumber: BlockHeaderData['number'];
  contractAddress: CID | undefined; // 如果调用了智能合约，就会有合约地址
  status: 1 | 0; // 交易状态，成功1，失败0
  cuUsed: BigNumber; // 处理这笔交易消耗的计算量
  from: Address; // 付款方
  to: Address; // 收款方
  transactionCid: CID; // 当前交易的id
  transactionIndex: number; // 当前交易序号
  logs: string[]; // 交易日志
}

// 基础数据，交易回执单
export class Receipt {
  constructor(data: ReceiptData) {
    this.receiptData = data;
  }
  receiptData: ReceiptData;

  // public static create = (): Receipt => {
  //   return new Receipt({})
  // };

  // toJSON = (): ReceiptData => {}
  commit = async () => {};
}
