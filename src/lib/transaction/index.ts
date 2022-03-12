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

// 处理交易活动
export class TransactionAction {
  constructor(db: SKDB) {
    this.db = db;
    this.contract = new Contract();
  }

  private waitTransMap: Map<number, Transaction[]> = new Map();
  private transMap: Map<string, Transaction[]> = new Map();
  private db: SKDB;
  // 头部块，块头
  private blockHeader: BlockHeaderData = null as unknown as BlockHeaderData;
  private contract: Contract;

  init = async () => {
    await this.initTransactionListen();
    await this.startTransTask();
    await this.contract.init();
  };

  startTransTask = async () => {
    // 执行打包任务
    // if () {}
  };

  private add = async (trans: Transaction) => {
    const hasedTrans = this.waitTransMap.get(trans.ts);
    if (hasedTrans) {
      this.waitTransMap.set(trans.ts, [...hasedTrans, trans]);
    } else {
      this.waitTransMap.set(trans.ts, [trans]);
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
    const res = this.contract.runFunction(transContract);
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
