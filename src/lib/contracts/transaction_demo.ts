import BigNumber from 'bignumber.js';
import { accountOpCodes, errorCodes } from '../contract/code';
import { Ipld, UpdateAccountI } from './../ipld/index';
export interface TransactionContractParam {
  from: string;
  recipient: string;
  amount: BigNumber;
}

// 仅仅是demo阶段的交易处理逻辑，通过js实现,并在浏览器的js runtime执行
// 将来正式版用cwjsr执行智能合约实现
export const transDemoFn = async (
  trans: TransactionContractParam,
  getAccount: Ipld['getAccount'],
): Promise<UpdateAccountI[]> => {
  const fromAccount = await getAccount(trans.from);
  const toAccount = await getAccount(trans.recipient);

  if (fromAccount.getBlance().minus(trans.amount).isLessThan(0)) {
    return [
      {
        account: trans.from,
        opCode: errorCodes['Insufficient balance'],
        value: errorCodes['Insufficient balance'],
      },
    ];
  }

  return [
    {
      account: trans.from,
      opCode: accountOpCodes.minus,
      value: trans.amount,
    },
    {
      account: trans.recipient,
      opCode: accountOpCodes.plus,
      value: trans.amount,
    },
  ];
};
