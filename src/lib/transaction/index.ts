import { Ipld } from './../ipld/index';
import BigNumber from 'bignumber.js';
import { Transaction, transMeta } from '../../mate/transaction';
import { Message } from 'ipfs-core-types/src/pubsub';
import { SKDB } from '../ipfs/ipfs.interface';
import { peerEvent } from '../events/peer';
import { bytes } from 'multiformats';
import { verifyById } from '../p2p/did';
import { message } from '../../utils/message';
import { BlockHeaderData } from '../../mate/block';
import { transContract } from 'lib/contracts/transaction';
import { Contract } from 'lib/contract';
import { skCacheKeys } from 'lib/ipfs/key';

// 处理交易活动
export class TransactionAction {
  constructor(db: SKDB, ipld: Ipld) {
    this.db = db;
    this.ipld = ipld;
    this.contract = new Contract(ipld);
  }

  private waitTransMap: Map<string, Transaction[]> = new Map(); // 等待执行的交易
  private transQueue: Transaction[] = []; // 当前块可执行的交易
  private db: SKDB;
  ipld: Ipld;
  // 头部块，块头
  private blockHeader: BlockHeaderData = null as unknown as BlockHeaderData;
  private contract: Contract;

  init = async () => {
    await this.initTransactionListen();
    await this.contract.init();
    await this.startTransTask();
  };

  startTransTask = async () => {
    // 执行打包任务
    const cArr: {contribute: BigNumber, did: string}[] = [];
    for (const did of this.waitTransMap.keys()) {
      const account = await this.ipld.getAccount(did);
      cArr.push({
        contribute: account.contribute,
        did
      });
    }
    const sortedArr = cArr.sort((a, b) =>
      a.contribute.isLessThan(b.contribute) ? -1 : 1,
    );
    // 从 sortedArr 中找到contribute 高的交易者发起的交易
    console.log(sortedArr)
  };

  private add = async (trans: Transaction) => {
    const hasedTrans = this.waitTransMap.get(trans.from);
    if (hasedTrans) {
      this.waitTransMap.set(trans.from, [...hasedTrans, trans]);
    } else {
      this.waitTransMap.set(trans.from, [trans]);
    }
  };

  setBlockHeader = (blockHeader: BlockHeaderData) => {
    this.blockHeader = blockHeader;
  };

  handelTransaction = async (tm: transMeta) => {
    // 处理接受到的或者本地发起的交易
    const trans = new Transaction({
      db: this.db,
      from: tm.from,
      cu: tm.cu,
      cuLimit: new BigNumber(0),
      payload: tm.payload,
      recipient: tm.recipient,
      accountNonce: new BigNumber(0),
      amount: tm.amount,
      ts: tm.ts,
    });
    await trans.genHash(this.db);
    message.info('handel--trans', trans);
    this.add(trans);
    // test
    const res = this.contract.runFunction(transContract, {
      from: trans.from,
      recipient: trans.recipient,
      amount: trans.amount,
    });
    message.info(res);
  };

  private initTransactionListen = async () => {
    // 接收交易
    await this.db.pubsub.subscribe(
      peerEvent.transaction,
      this.receiveTransaction,
    );
  };

  private receiveTransaction = async (data: Message) => {
    // 接收p2p网络里的交易，并塞到交易列表
    if (data.from === this.db.cache.get(skCacheKeys.accountId)) {
      // 不再处理自己发出的交易，因为已经直接添加到了队列
      return;
    }
    const tm: transMeta = JSON.parse(bytes.toString(data.data));
    const signature = tm.signature;
    if (
      signature &&
      (await verifyById(
        tm.from,
        signature,
        // 删掉signature验证签名
        bytes.fromString(JSON.stringify({ ...tm, signature: undefined })),
      ))
    ) {
      // 交易签名验证通过
      this.handelTransaction(tm);
    } else {
      message.info('trans unlow');
    }
  };
}
