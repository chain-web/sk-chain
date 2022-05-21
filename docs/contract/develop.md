## development contract

sk-chain的智能合约运行时，是一个标准的JavaScript运行时，支持几乎所有的JS语法和内置函数，但为了合约代码更加健壮，并且方便在Dapp开发过程中更加方便的调用合约，建议使用Typescript进行进行合约开发，后续所有的例子也都是用TypeScript书写的。

### 与普通JavaScript不同的点

#### 合约必须是一个class
合约的入口文件需要导出一个 class 来承载合约逻辑，并且这个class需要继承sk-chain导出的BaseContract，例如：

```TypeScript
import { Address, constractHelper } from "sk-chain";

export class CoinContract extends constractHelper.BaseContract {
  constructor() {
    super();
    // 初始化代币余额
    this.balances = {
      "12D3KooWHdhPrGCqsjD8j6yiHfumdzxfRxyYNPxJKN99RfgtoRuq": 10000n,
    };
  }

  // private 不可被外部读取
  private balances: { [key: string]: BigInt };

  // public 可被外部调用
  public send = (receiver: Address, amount: BigInt) => {
    if (this.balances[receiver.did] > amount) {
      return;
    }
    if (!this.balances[receiver.did]) {
      this.balances[receiver.did] = 0n;
    }
    this.balances[receiver.did] += amount;
    this.balances[this.msg.sender.did] += amount;
  };
}
```

#### constructor

合约class的 constructor 方法，只会在部署合约时执行一次，后续调用合约时不会再被执行