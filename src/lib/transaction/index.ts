import { SKChainLibBase } from './../base';
import { Ipld } from './../ipld/index';
import BigNumber from 'bignumber.js';
import { Transaction, transMeta } from '../../mate/transaction';
import { Message } from 'ipfs-core-types/src/pubsub';
import { SKDB } from '../ipfs/ipfs.interface';
import { peerEvent } from '../events/peer';
import { bytes } from 'multiformats';
import { signById, verifyById } from '../p2p/did';
import { message } from '../../utils/message';
import { BlockHeaderData } from '../../mate/block';
import { transContract } from 'lib/contracts/transaction';
import { Contract } from 'lib/contract';
import { skCacheKeys } from 'lib/ipfs/key';
import { transDemoFn } from 'lib/contracts/transaction_demo';
import { Consensus } from 'lib/consensus';
import { SKChain } from '../../skChain';

// 处理交易活动
export class TransactionAction extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
    this.contract = new Contract(this.chain.ipld);
  }

  MAX_TRANS_LIMIT = 50; // 每个block能打包的交易上限
  WAIT_TIME_LIMIT = 8 * 1000; // 每个交易从被发出到能进行打包的最短时间间隔 ms
  private waitTransMap: Map<string, Map<number, Transaction>> = new Map(); // 等待执行的交易
  private transQueue: Transaction[] = []; // 当前块可执行的交易队列

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
      const account = await this.chain.ipld.getAccount(did);
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
    if (!waitTransArr.length) {
      // 如果没有可打包的交易，退出
      return;
    }
    for (let index = 0; index < waitTransArr.length; index++) {
      const trans = waitTransArr[index];
      // 依次执行交易的合约
      const update = await transDemoFn(
        {
          from: trans.from,
          recipient: trans.recipient,
          amount: trans.amount,
        },
        this.chain.ipld.getAccount,
      );
      // 更新一个交易的结果到当前块状态机
      await this.chain.ipld.addUpdates(trans, update, index);
    }

    // 生成新块
    const nextBlock = await this.chain.ipld.commit();
    // 广播新块
    this.chain.consensus.pubNewBlock(nextBlock);
  };

  private add = async (trans: Transaction) => {
    const hasedTrans = this.waitTransMap.get(trans.from);
    if (hasedTrans) {
      hasedTrans.set(trans.ts, trans);
    } else {
      const transMap = new Map();
      transMap.set(trans.ts, trans);
      this.waitTransMap.set(trans.from, transMap);
    }
  };

  handelTransaction = async (tm: transMeta) => {
    // 处理接受到的或者本地发起的交易
    const trans = new Transaction({
      from: tm.from,
      cu: tm.cu,
      cuLimit: new BigNumber(0),
      payload: tm.payload,
      recipient: tm.recipient,
      accountNonce: new BigNumber(0),
      amount: tm.amount,
      ts: tm.ts,
    });
    await trans.genHash(this.chain.db);
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
    await this.chain.db.pubsub.subscribe(
      peerEvent.transaction,
      this.receiveTransaction,
    );
  };

  private receiveTransaction = async (data: Message) => {
    // 接收p2p网络里的交易，并塞到交易列表
    if (data.from === this.chain.did) {
      // 不再处理自己发出的交易，因为已经直接添加到了队列
      return;
    }
    const tm: transMeta = JSON.parse(bytes.toString(data.data));
    // parse bigNumber
    tm.amount = new BigNumber(tm.amount);
    tm.cu = new BigNumber(tm.cu);
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

  transaction = async (
    tm: Pick<transMeta, 'amount' | 'payload' | 'recipient'>,
  ) => {
    // 供外部调用的发起交易方法
    // 只是做交易检查和预处理
    if (!this.chain.inited) {
      message.error('wait for inited');
      return;
    }
    if (!tm.amount || !tm.recipient) {
      // 校验
      message.error('need trans meta');
      return;
    }
    const signMeta = {
      ...tm,
      from: this.chain.did,
      ts: Date.now(),
      cu: new BigNumber(100), // todo
    };
    // TODO 可能 有个偶现的bug
    // message.info(skCacheKeys.accountPrivKey)
    // message.info(signMeta)
    const transMeta: transMeta = {
      ...signMeta,
      // 这里使用交易原始信息通过ipfs存储后的cid进行签名会更好？
      signature: await signById(
        this.chain.db.cache.get(skCacheKeys.accountPrivKey),
        bytes.fromString(JSON.stringify(signMeta)),
      ),
    };
    this.chain.db.pubsub.publish(
      peerEvent.transaction,
      bytes.fromString(JSON.stringify(transMeta)),
    );
    this.handelTransaction(transMeta);
  };
}
