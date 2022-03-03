## 单独可以供浏览器端和node端(暂未实现)使用的主链

### 开发

```bash
npm run dev
npm link
```

### 使用

目标项目需要先引入IPFS
```html
  <script src="https://cdn.jsdelivr.net/npm/ipfs/dist/index.min.js"></script>
```

目标项目使用本地link
```bash 
npm link sk-chain
```

目标项目启动节点
```typescript
import { createNode, DidJson, SKChain } from 'sk-chain';
export class SkChain {
  sk!: SKChain;
  started = false;

  init = async (account: DidJson) => {
    this.sk = await createNode({
      networkid: 'testnet',
      account,
    });
    this.started = true;
  };
}
```