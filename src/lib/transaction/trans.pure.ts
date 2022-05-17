import { Account } from './../../mate/account';
import { SKChain } from './../../skChain';
import { Transaction, transMeta } from 'mate/transaction';
import { message } from 'utils/message';
import BigNumber from 'bignumber.js';
import { signById } from 'lib/p2p/did';
import { skCacheKeys } from 'lib/ipfs/key';
import { bytes } from 'multiformats';
import { Contract } from 'lib/contract';
import { accountOpCodes } from 'lib/contract/code';

export const genTransMeta = async (
  tm: Pick<transMeta, 'amount' | 'recipient'> & {
    payload?: Transaction['payload'];
  },
  chain: SKChain,
) => {
  // 只是做交易检查和预处理
  if (!chain.inited) {
    message.error('wait for inited');
    return;
  }
  if (!tm.amount || !tm.recipient) {
    // 校验
    message.error('need trans amount and recipient');
    return;
  }
  const signMeta = {
    ...tm,
    from: chain.did,
    ts: Date.now(),
    cu: new BigNumber(100), // todo
  };
  const transMeta: transMeta = {
    ...signMeta,
    // 这里使用交易原始信息通过ipfs存储后的cid进行签名会更好？
    signature: await signById(
      chain.db.cache.get(skCacheKeys.accountPrivKey),
      bytes.fromString(JSON.stringify(signMeta)),
    ),
  };
  return transMeta;
};

export const genTransactionClass = async (tm: transMeta, chain: SKChain) => {
  const trans = new Transaction({
    from: tm.from,
    cu: tm.cu,
    cuLimit: new BigNumber(10000),
    payload: tm.payload,
    recipient: tm.recipient,
    accountNonce: new BigNumber(0),
    amount: tm.amount,
    ts: tm.ts,
  });
  await trans.genHash(chain.db);
  return trans;
};

export const runContract = async (
  account: Account,
  trans: Transaction,
  chain: SKChain,
  contract: Contract,
) => {
  const storage = (await chain.db.dag.get(account.storageRoot)).value;
  const code = await chain.db.block.get(account.codeCid!);
  const res = contract.runFunction(code, trans, storage);
  console.log('res', res);
  return {
    account: trans.recipient,
    opCode: accountOpCodes.updateState,
    value: res,
  };
};
