## Transaction

#### 发起交易

```TypeScript
chain.transaction({
  amount: new BigNumber(TRANS_AMOUNT),
  recipient: new Address(TRANS_TO),
});
```

#### 调用合约
调用合约也是通过交易实现的，如果不想了解调用合约的细节，建议直接查看[调用合约](../contract/call%20contract.md)

```ts
chain.transaction({
  amount: new BigNumber(0),
  recipient: new Address(CONTRACT_ADDRESS),
  payload: {
    mothed: 'send', // 调用的合约方法
    args: [10] // 传给合约函数的参数
  }
});
```