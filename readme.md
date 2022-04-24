## 可以运行在浏览器端和node端的主链

![image](https://user-images.githubusercontent.com/11674258/164952721-c9aa1d89-9da1-4696-b0a1-932671cf72c6.png)


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
