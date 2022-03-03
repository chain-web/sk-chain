import { createNode } from '../src';
import { DidJson } from '../src/lib/p2p/did';
import { resolve } from 'path';
import { homedir } from 'os';
import { isInDocker } from '../../config';
import BigNumber from 'bignumber.js';
const account: DidJson = {
  id: '12D3KooWL1NF6fdTJ9cucEuwvuX8V8KtpJZZnUE4umdLBuK15eUZ',
  privKey:
    'CAESQH+DR5TwHgEeKT/y/C8q3ixRVLOmIVeokvSmhZObWvrVl2ZX0c+MNcSLKy51EIwvS8y8gcVbIxmp0sJlztYRA1I=',
};

const run = async () => {
  const node = await createNode({
    networkid: 'testnet',
    account,
    storePath: {
      main: isInDocker ? '/app/db' : resolve(homedir(), './.skdb2'),
    },
    network: { tcp: 3002, ws: 3003, api: 6011, geteway: 9029 },
  });
  setTimeout(() => {
    node.transaction({
      amount: new BigNumber(10),
      recipient: '12D3KooWL8qb3L8nKPjDtQmJU8jge5Qspsn6YLSBei9MsbTjJDr8',
      payload: '',
    });
  }, 30000);
};

run();
