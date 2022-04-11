import { SKChainLibBase } from './../base';
import { SKChain } from './../../skChain';
import { message } from 'utils/message';
import { newAccount } from './../../mate/account';
import BigNumber from 'bignumber.js';
import { Account } from 'mate/account';
import { skCacheKeys } from 'lib/ipfs/key';
import { Block } from 'mate/block';
import { Mpt } from './mpt';
import { TransErrorType } from 'lib/contracts/transaction_demo';
import { Transaction } from 'mate/transaction';
import { Receipt } from 'mate/receipt';

export interface UpdateOps {
  plus?: BigNumber;
  minus?: BigNumber;
  state?: any;
  error?: TransErrorType;
}

export type UpdateAccountI = { ops: UpdateOps } & {
  account: Account['account'];
};

export class Ipld extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
  }
  private stateMpt!: Mpt;
  private transactionMpt!: Mpt;
  private receiptsMpt!: Mpt;

  // 下一个块
  nextBlock!: Block;

  // 下一个块的body transaction
  nextBlockBodyTrans: string[] = [];

  // 缓存未写入block的账户数据
  private updates: Map<string, Account> = new Map();

  init = async () => {
    await this.initMpt();
    this.nextBlock = new Block({
      number: this.chain.headerBlock.header.number.plus(1),
      parent: this.chain.headerBlock.hash,
      stateRoot: '',
      receiptsRoot: '',
      transactionsRoot: '',
      logsBloom: new Uint8Array([]), // TODO
      difficulty: new BigNumber(0), // TODO
      cuLimit: new BigNumber(0), // TODO ,应该在此时根据上一个块的信息生成
      ts: Date.now(),
      cuUsed: new BigNumber(0),
      slice: [0, 0], // 忘了最开始设计这个字段的目的了，尴尬
      body: '',
    });
  };

  clearUpdates = () => {
    this.updates = new Map();
  };

  /**
   * 注册到智能合约的执行环境，获取账户数据
   * @param did
   * @returns
   */
  getAccount = async (did: string): Promise<Account> => {
    if (!this.updates.has(did)) {
      // 第一次从存储获取，后续从缓存获取，TODO 缓存会爆炸 GC
      const account = await this.getAccountFromDb(did);
      this.updates.set(did, account);
    }
    return this.updates.get(did)!;
  };

  getAccountFromDb = async (did: string): Promise<Account> => {
    console.log(did);

    const accountCid = await this.stateMpt.getKey(did);

    if (accountCid) {
      return await Account.fromCid(this.chain.db, accountCid);
    } else {
      // 如果没有此account就create
      const storageRoot = await this.chain.db.dag.put({});
      return newAccount(did, storageRoot);
    }
  };

  /**
   * 接收智能合约的执行结果，批量更新账户数据
   * @param account
   */
  addUpdates = async (
    trans: Transaction,
    updates: UpdateAccountI[],
    index: number,
  ) => {
    const tx = await this.addTransaction(trans);
    this.nextBlockBodyTrans.push(tx);

    // 生成单个交易的收据
    const receipt = new Receipt({
      blockNumber: this.nextBlock.header.number,
      updates,
      logs: [],
      status: 1,
      cuUsed: new BigNumber(0),
      from: trans.from,
      to: trans.recipient,
      transaction: tx,
      transactionIndex: index,
    });
    this.addReceipts(tx, receipt);

    for (const update of updates) {
      await this.addUpdate(update, trans);
    }
  };

  /**
   * 接收智能合约的执行结果，更新账户数据
   * @param account
   */
  addUpdate = async (update: UpdateAccountI, trans: Transaction) => {
    const account = await this.getAccount(update.account);
    if (update.ops.plus) {
      account.plusBlance(update.ops.plus, trans.ts.toString());
    }
    if (update.ops.minus) {
      account.minusBlance(update.ops.minus);
    }
    if (update.ops.state) {
      account.updateState(update.ops.state);
    }
    if (update.ops.error) {
      message.error(update.ops.error);
    }
    this.updates.set(account.account, account);
  };

  initMpt = async () => {
    // init stateMpt
    if (!this.stateMpt) {
      const stateRoot = this.chain.headerBlock.header.stateRoot;
      this.stateMpt = new Mpt(this.chain.db, stateRoot);
      await this.stateMpt.initRootTree();
    }

    // init transactionMpt
    if (!this.transactionMpt) {
      const transactionsRoot = this.chain.headerBlock.header.transactionsRoot;
      this.transactionMpt = new Mpt(this.chain.db, transactionsRoot);
      await this.transactionMpt.initRootTree();
    }

    // init receiptsMpt
    if (!this.receiptsMpt) {
      const receiptsRoot = this.chain.headerBlock.header.receiptsRoot;
      this.receiptsMpt = new Mpt(this.chain.db, receiptsRoot);
      await this.receiptsMpt.initRootTree();
    }
  };

  addTransaction = async (trans: Transaction) => {
    const transCid = await trans.commit(
      this.chain.db,
      this.nextBlock.header.number,
    );
    this.transactionMpt.updateKey(trans.hash, transCid);
    return trans.hash;
  };

  addReceipts = async (tx: string, receipt: Receipt) => {
    // TODO
    const receiptsCid = await receipt.commit(this.chain.db);
    this.receiptsMpt.updateKey(tx, receiptsCid);
  };

  /**
   * 提交当前区块的数据，进行打包
   */
  commit = async () => {
    for (const account of this.updates) {
      const newCid = await account[1].commit(this.chain.db);
      await this.stateMpt.updateKey(account[0], newCid);
    }

    // block body
    const body = await this.chain.db.dag.put(this.nextBlockBodyTrans);
    this.nextBlock.header.body = body.toString();
    this.nextBlock.body = {
      transactions: this.nextBlockBodyTrans,
    };

    // 新块的三棵树
    const stateRoot = await this.stateMpt.save();
    const transactionsRoot = await this.transactionMpt.save();
    const receiptRoot = await this.receiptsMpt.save();
    this.nextBlock.header.stateRoot = stateRoot.toString();
    this.nextBlock.header.transactionsRoot = transactionsRoot.toString();
    this.nextBlock.header.receiptsRoot = receiptRoot.toString();

    this.nextBlock.header.ts = Date.now();
    console.log(this.nextBlock);
    await this.nextBlock.genHash(this.chain.db);
    return this.nextBlock;
  };

  goToNext = async (nextCid: string) => {
    // 落文件
    this.chain.db.cache.put(skCacheKeys['sk-block'], nextCid);
  };
}
