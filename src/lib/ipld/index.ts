import { SKChainLibBase } from './../base';
import { SKChain } from './../../skChain';
import { Account, newAccount } from './../../mate/account';
import BigNumber from 'bignumber.js';
import { Mpt } from './mpt';
import { createEmptyStorageRoot } from './util';
import { ValueOf } from '../../global';
import { Block } from '../../mate/block';
import { Receipt } from '../../mate/receipt';
import { Transaction } from '../../mate/transaction';
import { message } from '../../utils/message';
import { errorCodes, accountOpCodes } from '../contract/code';
import { BloomFilter } from './logsBloom/bloomFilter';

export type UpdateOpCode =
  | ValueOf<typeof errorCodes>
  | ValueOf<typeof accountOpCodes>;

export type UpdateAccountI = {
  opCode: UpdateOpCode;
  value: string | BigNumber | object;
} & {
  account: Account['account']['did'];
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

  private preLoadAccount: Map<string, Account> = new Map();

  init = async () => {
    await this.initMpt();
    const headerBlock = await this.chain.getHeaderBlock();
    this.nextBlock = new Block({
      number: headerBlock.header.number.plus(1),
      parent: headerBlock.hash,
      stateRoot: '',
      receiptsRoot: '',
      transactionsRoot: '',
      logsBloom: new BloomFilter(),
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
   * 在交易执行前做数据准备
   * @param trans meta Transaction
   */
  preLoadByTrans = async (trans: Transaction) => {
    if (trans.payload) {
      // 调用智能合约
      if (trans.payload.mothed === 'constructor') {
        // 新建合约账户
        console.log(trans);
        const storageRoot = await createEmptyStorageRoot(this.chain.db);
        const codeCid = await this.chain.db.block.put(
          new Uint8Array(trans.payload.args[0]),
        );
        const account = newAccount(
          trans.recipient.did,
          storageRoot,
          codeCid.toV1(),
          trans.from.did,
        );
        this.preLoadAccount.set(account.account.did, account);
      }
    }
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
    const accountCid = await this.stateMpt.getKey(did);

    if (accountCid) {
      return await Account.fromCid(this.chain.db, accountCid);
    } else {
      const preloadAccount = this.preLoadAccount.get(did);
      if (preloadAccount) {
        // 主要针对新部署的合约账户
        this.preLoadAccount.delete(did);
        return preloadAccount;
      }
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
    this.nextBlock.header.logsBloom.add(tx);
    this.nextBlock.header.ts === trans.ts;
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
    switch (update.opCode) {
      case errorCodes['Insufficient balance']:
        message.error(update.value);
        break;
      case accountOpCodes.minus:
        account.minusBlance(update.value as BigNumber);
        break;
      case accountOpCodes.plus:
        account.plusBlance(update.value as BigNumber, trans.ts.toString());
        break;
      case accountOpCodes.updateState:
        const cid = await this.chain.db.dag.put([update.value]);
        account.updateState(cid);
        break;
      default:
        message.error('unknown op code');
        break;
    }
    this.updates.set(account.account.did, account);
  };

  initMpt = async () => {
    const headerBlock = await this.chain.getHeaderBlock();
    // init stateMpt
    const stateRoot = headerBlock.header.stateRoot;
    this.stateMpt = new Mpt(this.chain.db, stateRoot);
    await this.stateMpt.initRootTree();

    // init transactionMpt
    const transactionsRoot = headerBlock.header.transactionsRoot;
    this.transactionMpt = new Mpt(this.chain.db, transactionsRoot);
    await this.transactionMpt.initRootTree();

    // init receiptsMpt
    const receiptsRoot = headerBlock.header.receiptsRoot;
    this.receiptsMpt = new Mpt(this.chain.db, receiptsRoot);
    await this.receiptsMpt.initRootTree();
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
      // TODO 不是所有的账户都有更新，只有有更新的账户才会更新
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
    await this.nextBlock.genHash(this.chain.db);
    return this.nextBlock;
  };

  goToNext = async () => {
    this.nextBlockBodyTrans = [];
    this.updates.clear();
    await this.init();
  };
}
