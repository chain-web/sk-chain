## events

为了能让外部应用感知当前节点的状态信息，在节点启动和运行过程中会emit各种事件，
外部应用从chain.lifecycleEvents订阅这些事件

#### 事件列表

```TypeScript
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
  'initedContract' = 'initedContract', // 智能合约模块初始化成功
  'newBlock' = 'newBlock', // 更新本地块头
}
```
 
more [events file]('https://github.com/chain-web/sk-chain/blob/master/src/lib/events/lifecycle.ts')

#### 代码实例

```TypeScript
chain.lifecycleEvents.onEmit((key, ..._data) => {
  if (key === LifecycleStap.newBlock) {
    console.log('BLOCK_HEIGHT_CHAIGE');
  }
});
```