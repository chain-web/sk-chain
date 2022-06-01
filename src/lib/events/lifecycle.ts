import { EventBus } from '.';
import { message } from '../../utils/message';

// sk-chain lifecycle

export enum LifecycleStap {
  'initConfig' = 'initConfig', // 节点启动前，初始化节点配置
  'creatingIpfs' = 'creatingIpfs', // 节点启动前，初始化IPFS
  'startCreateSKChain' = 'startCreateSKChain', // 节点启动
  'checkingGenesisBlock' = 'checkingGenesisBlock', // 开始检查创世区块
  'checkedGenesisBlock' = 'checkedGenesisBlock', // 创世区块检查成功
  'initingBlockService' = 'initingBlockService', // 开始初始化区块存储模块
  'checkingBlockIndex' = 'checkingBlockIndex', // 初始化区块存储模块-检查本地区块合法性
  'checkedBlockIndex' = 'checkedBlockIndex', // 初始化区块存储模块-检查本地区块合法性成功
  'initedBlockService' = 'initedBlockService', // 初始化区块存储模块成功
  'syncingHeaderBlock' = 'syncingHeaderBlock', // 从其他节点同步区块中
  'initingIpld' = 'initingIpld', // 开始初始化IPLD
  'initedIpld' = 'initedIpld', // 初始化IPLD成功
  'initingTransaction' = 'initingTransaction', // 开始初始化交易模块
  'initedTransaction' = 'initedTransaction', // 交易模块初始化成功
  'initingSlice' = 'initingSlice', // 开始初始化分片共识模块
  'initedSlice' = 'initedSlice', // 分片共识初始化成功
  'initedConsensus' = 'initedConsensus', // 分片共识初始化成功
  'initedContract' = 'initedContract', // 智能合约模块初始化成功
  'newBlock' = 'newBlock', // 更新本地块头
}

export const lifecycleEvents = new EventBus(LifecycleStap);

lifecycleEvents.onEmit((key, ...data) => {
  message.info('on life cycle: ', key, ...data);
});
