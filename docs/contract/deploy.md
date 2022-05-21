## Deploy Contract

```TypeScript
import { createNode } from 'sk-chain';
import contractCode from './contractCode';

const account = {
  id: '12D3KooWL1NF6fdTJ9cucEuwvuX8V8KtpJZZnUE4umdLBuK15eUZ',
  privKey: '******',
},

const chain = await createNode({
  networkid: 'testnet',
  account,
});

const res = await chain.deploy({ payload: contractCode })

console.log('deploy trans send, contract address: ', res.account)
```