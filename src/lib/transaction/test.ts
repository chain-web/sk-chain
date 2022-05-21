import { Account } from './../../mate/account';
import { SKChainLibBase } from './../base';
import BigNumber from 'bignumber.js';
import { Transaction, transMeta } from '../../mate/transaction';
import { genetateDid } from '../p2p/did';

import { Contract } from 'lib/contract';
import { transDemoFn } from 'lib/contracts/transaction_demo';
import { SKChain } from '../../skChain';
import { newAccount } from 'mate/account';
import { createEmptyStorageRoot } from 'lib/ipld/util';
import { UpdateAccountI } from 'lib/ipld';
import { accountOpCodes } from 'lib/contract/code';
import { genTransactionClass, genTransMeta, runContract } from './trans.pure';

// 处理交易活动
export class TransactionTest extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
    this.contract = new Contract();
  }

  private contract: Contract;
  account!: Account;

  init = async () => {
    await this.contract.init();
  };

  doTransTask = async (trans: Transaction) => {
    let update: UpdateAccountI[] = [];

    if (trans.payload) {
      // 调用合约
      const res = await runContract(
        this.account,
        trans,
        this.chain,
        this.contract,
      );

      if (res.opCode === accountOpCodes.updateState) {
        const cid = await this.chain.db.dag.put([res.value]);
        this.account.updateState(cid);
        await this.account.commit(this.chain.db);
      }

      update.push(res);
    } else {
      // 普通转账
      update = await transDemoFn(
        {
          from: trans.from.did,
          recipient: trans.recipient.did,
          amount: trans.amount,
        },
        this.chain.ipld.getAccount,
      );
    }

    return update;
  };

  handelTransaction = async (trans: Transaction) => {
    return await this.doTransTask(trans);
  };

  transaction = async (
    tm: Pick<transMeta, 'amount' | 'recipient'> & {
      payload?: Transaction['payload'];
    },
  ) => {
    const transMeta = await genTransMeta(tm, this.chain);
    const trans = await genTransactionClass(transMeta!, this.chain);
    return await this.handelTransaction(trans);
  };

  // deploy contract
  deploy = async (meta: { payload: Uint8Array }) => {
    // TODO 要不要加update code 的接口
    const newDid = await genetateDid();
    const storageRoot = await createEmptyStorageRoot(this.chain.db);
    const codeCid = await this.chain.db.block.put(meta.payload);
    const account = newAccount(
      newDid.id,
      storageRoot,
      codeCid.toV1(),
      this.chain.did,
    );
    await account.commit(this.chain.db);
    this.account = account;
    await this.transaction({
      amount: new BigNumber(0),
      recipient: account.account,
      payload: {
        mothed: 'constructor',
        args: [meta.payload],
      },
    });

    return account;
  };
}
