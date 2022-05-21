import { SKChainLibBase } from './../base';
import BigNumber from 'bignumber.js';
import { Transaction, transMeta } from '../../mate/transaction';
import { peerEvent } from '../events/peer';
import { bytes } from 'multiformats';
import { genetateDid, verifyById } from '../p2p/did';
import { message } from '../../utils/message';

import { Contract } from 'lib/contract';
import { transDemoFn } from 'lib/contracts/transaction_demo';
import { SKChain } from '../../skChain';
import { newAccount } from 'mate/account';
import { createEmptyStorageRoot } from 'lib/ipld/util';
import { UpdateAccountI } from 'lib/ipld';
import { genTransactionClass, genTransMeta, runContract } from './trans.pure';
import { Message } from 'ipfs-core-types/src/pubsub';

// 处理交易活动
export class TransactionAction extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
    this.contract = new Contract();
  }

  MAX_TRANS_LIMIT = 50; // 每个block能打包的交易上限
  WAIT_TIME_LIMIT = 6 * 1000; // 每个交易从被发出到能进行打包的最短时间间隔 ms
  BLOCK_INTERVAL_TIME_LIMIT = 10 * 1000; // 两个块之间打包的最短时间间隔 ms
  private waitTransMap: Map<string, Map<number, Transaction>> = new Map(); // 等待执行的交易
  private transQueue: Transaction[] = []; // 当前块可执行的交易队列

  private contract: Contract;
  taskInProgress = false; // 是否正在执行智能合约\打包

  private breakNextBlock = false; // 是否中断下一个块的打包

  init = async () => {
    await this.initTransactionListen();
    await this.contract.init();
    await this.startTransTask();
  };

  startTransTask = async () => {
    // 检查是否要执行打包任务
    setInterval(async () => {
      if (!this.chain.consensus.isReady()) {
        // 节点未同步完成
        return;
      }
      if (this.taskInProgress) {
        // 正在打包
        return;
      }
      if (this.waitTransMap.size === 0) {
        // 无交易
        return;
      }
      const headerBlock = await this.chain.blockService.getHeaderBlock();
      // TODO 这里用Date.now()是否会有问题？
      if (headerBlock.header.ts + this.BLOCK_INTERVAL_TIME_LIMIT > Date.now()) {
        // 当前块还未到达下一个块的时间
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
    // console.log(sortedArr);
    // 在 sortedArr 按发起交易者的 contribute 来排序，加到当前块打包队列中
    sortedArr.forEach((ele) => {
      if (waitTransArr.length < this.MAX_TRANS_LIMIT) {
        const trans = this.waitTransMap.get(ele.did);
        Array.from(trans!.keys()).forEach((one) => {
          // 为防止分叉，交易被发出WAIT_TIME_LIMIT时间后才会被打包
          // TODO 这里用Date.now()是否会有问题？
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
      let update: UpdateAccountI[] = [];
      // 依次执行交易的合约
      if (trans.payload) {
        // 调用合约
        const account = await this.chain.ipld.getAccount(trans.recipient.did);
        const res = await runContract(
          account,
          trans,
          this.chain,
          this.contract,
        );
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

      // run trans as contract
      // const res = this.contract.runFunction(transContract, {
      //   from: trans.from,
      //   recipient: trans.recipient,
      //   amount: trans.amount,
      // });
      // console.log(res);

      // 更新一个交易的结果到当前块状态机
      await this.chain.ipld.addUpdates(trans, update, index);
    }

    // 生成新块
    const nextBlock = await this.chain.ipld.commit();
    if (!this.checkIsBreakTransTask()) {
      this.taskInProgress = false;
      const headerBlock = await this.chain.blockService.getHeaderBlock();
      if (nextBlock.header.parent === headerBlock.hash) {
        return;
      }
      // TODO 错误的情况下，如何处理？
      message.error(
        'do trans task error',
        'nextBlock',
        nextBlock,
        'headerBlock',
        headerBlock,
      );
      return;
    }
    // 广播新块
    await this.chain.consensus.pubNewBlock(nextBlock);
    // 初始化下一个区块的ipld
    await this.chain.ipld.goToNext();
  };

  private add = async (trans: Transaction) => {
    await this.chain.ipld.preLoadByTrans(trans);
    const hasedTrans = this.waitTransMap.get(trans.from.did);
    if (hasedTrans) {
      hasedTrans.set(trans.ts, trans);
    } else {
      const transMap = new Map();
      transMap.set(trans.ts, trans);
      this.waitTransMap.set(trans.from.did, transMap);
    }
  };

  // 检查是否要继续执行打包操作
  checkIsBreakTransTask = () => {
    return !this.breakNextBlock;
  };

  // 终止本次打包，可能是因为收到了广播出来的最新块，被调用
  stopThisBlock = async () => {
    if (this.taskInProgress) {
      this.breakNextBlock = true;
    }
  };

  handelTransaction = async (trans: Transaction) => {
    // 处理接受到的或者本地发起的交易

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
        tm.from.did,
        signature,
        // 删掉signature验证签名
        bytes.fromString(JSON.stringify({ ...tm, signature: undefined })),
      ))
    ) {
      // 交易签名验证通过
      const trans = await genTransactionClass(tm, this.chain);
      this.handelTransaction(trans);
    } else {
      message.info('trans unlow');
    }
  };

  transaction = async (
    tm: Pick<transMeta, 'amount' | 'recipient'> & {
      payload?: Transaction['payload'];
    },
  ) => {
    // 供外部调用的发起交易方法
    const transMeta = await genTransMeta(tm, this.chain);
    await this.chain.db.pubsub.publish(
      peerEvent.transaction,
      bytes.fromString(JSON.stringify(transMeta)),
    );
    if (transMeta) {
      const trans = await genTransactionClass(transMeta, this.chain);
      await this.handelTransaction(trans);
    }
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
