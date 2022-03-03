import { createNode } from '../src';
import { isInDocker } from '../../config';
import { DidJson } from '../src/lib/p2p/did';
import { resolve } from 'path';
import { homedir } from 'os';
import BigNumber from 'bignumber.js';
const account: DidJson = {
  id: '12D3KooWL8qb3L8nKPjDtQmJU8jge5Qspsn6YLSBei9MsbTjJDr8',
  privKey:
    'CAESQOu2tC61UCD6utWQpWndm8HSVWxi88P7cP29ydv6iHaOmVBTlFvfBXPpjZJeFi/Ult6HUOcVd9OOkyDg5TDibdk=',
};

const run = async () => {
  const node = await createNode({
    networkid: 'testnet',
    account,
    storePath: { main: isInDocker ? '/app/db' : resolve(homedir(), './.skdb') },
  });
  setTimeout(() => {
    node.transaction({
      amount: new BigNumber(10),
      recipient: '12D3KooWL1NF6fdTJ9cucEuwvuX8V8KtpJZZnUE4umdLBuK15eUZ',
      payload: '',
    });
  }, 30000);
};

run();
