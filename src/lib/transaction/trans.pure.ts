import { Address } from './../../mate/address';
import { Account } from './../../mate/account';
import { SKChain } from './../../skChain';
import BigNumber from 'bignumber.js';
import { bytes, CID } from 'multiformats';
import { transMeta, Transaction } from '../../mate/transaction';
import { message } from '../../utils/message';
import { Contract } from '../contract';
import { accountOpCodes } from '../contract/code';
import { skCacheKeys } from '../ipfs/key';
import { signById } from '../p2p/did';

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
    from: new Address(chain.did),
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
  const storage = (await chain.db.dag.get(account.storageRoot)).value[0];
  const storeObj = JSON.parse(storage || '[]');
  for (let i = 0; i < storeObj.length; i++) {
    const ele = storeObj[i];
    if (ele.type === 'sk_slice_db') {
      for (let j = 0; j < Object.keys(ele.value).length; j++) {
        const key = Object.keys(ele.value)[j];
        const cid = ele.value[key];
        const val = await chain.db.dag.get(CID.parse(cid));
        ele.value[key] = val.value;
      }
    }
  }
  const code = await chain.db.block.get(account.codeCid!);
  const { saves, funcReturn } = contract.runFunction(
    code,
    trans,
    JSON.stringify(storeObj),
  );
  console.log('res', saves);
  for (let i = 0; i < saves.length; i++) {
    const ele = saves[i];
    if (ele.type === 'sk_slice_db') {
      for (let j = 0; j < Object.keys(ele.value).length; j++) {
        const key = Object.keys(ele.value)[j];
        const value = ele.value[key];
        const cid = await chain.db.dag.put(value);
        ele.value[key] = cid.toString();
      }
    }
  }
  console.log('res', saves);
  return {
    account: trans.recipient.did,
    opCode: accountOpCodes.updateState,
    value: JSON.stringify(saves),
    funcReturn: funcReturn || null,
  };
};
