import { BigNumber } from 'bignumber.js';
export interface TransactionContractParam {
  from: string;
  recipient: string;
  amount: BigNumber;
}

export const transContract = (params: TransactionContractParam) => {
  const get1 = window.__sk__ipld__getAccount(params.from)
  const get2 = window.__sk__ipld__getAccount(params.recipient)
  return Promise.all([get1, get2]).then(res => {
    console.log(res)
    return res
  })
};
