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
import { transDemoFn } from 'lib/contracts/transaction_demo';

// 处理交易活动
export class TransactionAction {
  constructor(db: SKDB, ipld: Ipld) {
    this.db = db;
    this.ipld = ipld;
    this.contract = new Contract(ipld);
  }

  MAX_TRANS_LIMIT = 50; // 每个block能打包的交易上限
  WAIT_TIME_LIMIT = 8 * 1000; // 每个交易从被发出到能进行打包的最短时间间隔 ms
  private waitTransMap: Map<string, Map<number, Transaction>> = new Map(); // 等待执行的交易
  private transQueue: Transaction[] = []; // 当前块可执行的交易队列
  private db: SKDB;
  ipld: Ipld;
  // 头部块，块头
  private blockHeader: BlockHeaderData = null as unknown as BlockHeaderData;
  private contract: Contract;
  taskInProgress = false; // 是否正在执行智能合约\打包

  init = async () => {
    await this.initTransactionListen();
    await this.contract.init();
    await this.startTransTask();
  };

  startTransTask = async () => {
    // 检查是否要执行打包任务
    setInterval(async () => {
      if (this.taskInProgress) {
        return;
      }
      if (this.waitTransMap.size === 0) {
        return;
      }
      this.taskInProgress = true;
      await this.doTransTask();
      this.taskInProgress = false;
    }, 1000);
  };

  doTransTask = async () => {
    // 执行打包任务
    const cArr: { contribute: BigNumber; did: string }[] = [];
    const waitTransArr: Transaction[] = [];
    for (const did of this.waitTransMap.keys()) {
      const account = await this.ipld.getAccount(did);
      cArr.push({
        contribute: account.contribute,
        did,
      });
    }
    const sortedArr = cArr.sort((a, b) =>
      a.contribute.isLessThan(b.contribute) ? -1 : 1,
    );
    console.log(sortedArr);
    // 在 sortedArr 按发起交易者的 contribute 来排序，加到当前块打包队列中
    sortedArr.forEach((ele) => {
      if (waitTransArr.length < this.MAX_TRANS_LIMIT) {
        const trans = this.waitTransMap.get(ele.did);
        Array.from(trans!.keys()).forEach((one) => {
          // 为防止分叉，交易被发出WAIT_TIME_LIMIT时间后才会被打包
          if (Date.now() - one >= this.WAIT_TIME_LIMIT) {
            // 此处必定有one这个trans
            waitTransArr.push(trans!.get(one)!);

            // GC
            trans!.delete(one);
            if (trans!.size === 0) {
              this.waitTransMap.delete(ele.did);
            }
          }
        });
      }
    });
    for (const trans of waitTransArr) {
      // 依次执行交易的合约
      const update = await transDemoFn(
        {
          from: trans.from,
          recipient: trans.recipient,
          amount: trans.amount,
        },
        this.ipld.getAccount,
      );
      // 更新一个交易的结果到当前块状态机
      this.ipld.addUpdates(update);
    }
    this.ipld.commit()
  };

  private add = async (trans: Transaction) => {
    const hasedTrans = this.waitTransMap.get(trans.from);
    if (hasedTrans) {
      hasedTrans.set(trans.ts, trans);
    } else {
      const transMap = new Map();
      transMap.set(trans, trans);
      this.waitTransMap.set(trans.from, transMap);
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
    // test contract
    // const res = this.contract.runFunction(transContract, {
    //   from: trans.from,
    //   recipient: trans.recipient,
    //   amount: trans.amount,
    // });
    // message.info(res);
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
