import { createNode } from '../src';
import { DidJson } from '../src/lib/p2p/did';
import { resolve } from 'path';
import { homedir } from 'os';
import { isInDocker } from '../../config';
const account3: DidJson = {
  id: '12D3KooWHdhPrGCqsjD8j6yiHfumdzxfRxyYNPxJKN99RfgtoRuq',
  privKey:
    'CAESQI/1ln/U9+4X+ovu4pb25U3jousyHSsR9YgXWi2/54DUdCHYam0uBGfydH5OZY1b70ihgEcYUKZTY5XkhtTEFZg=',
  pubKey: 'CAESIHQh2GptLgRn8nR+TmWNW+9IoYBHGFCmU2OV5IbUxBWY',
};

const account4: DidJson = {
  id: '12D3KooWE4cb6m9DWsdsQh1gV8BzRdMhQkgeQcyGidDsug5uUoRz',
  privKey:
    'CAESQJuIaXd+gDMgfLaBJxXehmFqsAx2zGpPu2qdVBOJQtoMPxUvBprLeqShXIbZwVQ4QQJilXTqCqUcXCzsfPvHCdk=',
  pubKey: 'CAESID8VLwaay3qkoVyG2cFUOEECYpV06gqlHFws7Hz7xwnZ',
};
const account5: DidJson = {
  id: '12D3KooWJHQ8kvM97Fz7i5CN3chfeRSrG51soNayhGHSeaqdDT5v',
  privKey:
    'CAESQAXiGJ17LnMgZrFCaMOoil1i289FG0drAFR5WrzSn2fffcpmYl6JkHXPcrjD2AcyLrHxiffG/4VntnY2wGwWnKU=',
  pubKey: 'CAESIH3KZmJeiZB1z3K4w9gHMi6x8Yn3xv+FZ7Z2NsBsFpyl',
};

createNode({
  networkid: 'testnet',
  account: account3,
  storePath: { main: isInDocker ? '/app/db' : resolve(homedir(), './.skdb3') },
  network: { tcp: 3032, ws: 3033, api: 6031, geteway: 9039 },
});
createNode({
  networkid: 'testnet',
  account: account4,
  storePath: { main: isInDocker ? '/app/db' : resolve(homedir(), './.skdb4') },
  network: { tcp: 3042, ws: 3043, api: 6041, geteway: 9049 },
});
createNode({
  networkid: 'testnet',
  account: account5,
  storePath: { main: isInDocker ? '/app/db' : resolve(homedir(), './.skdb5') },
  network: { tcp: 3052, ws: 3053, api: 6051, geteway: 9059 },
});
