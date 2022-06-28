## A blockchain that can run on the Browser and the nodeJs

![image](https://user-images.githubusercontent.com/11674258/164952721-c9aa1d89-9da1-4696-b0a1-932671cf72c6.png)


### dev local

```bash
npm run dev
npm link
```

### 

first import IPFS
```html
  <script src="https://cdn.jsdelivr.net/npm/ipfs/dist/index.min.js"></script>
```

use npm link
```bash 
npm link sk-chain
```

run node
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


### Tips

use `node_extra_ca_certs_mozilla_bundle` in NodeJs sk-chain node to connect https
