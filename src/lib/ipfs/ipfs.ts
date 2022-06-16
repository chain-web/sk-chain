// import { AbortSignal } from 'abort-controller';
import { create } from 'ipfs-core';
import { resolve } from 'path';
import { Cache } from './cache';
import { DidJson } from '../p2p/did';
import { libp2pBundle } from '../p2p/libp2p';
import { networkidType } from '../../config/types';
import { skCacheKeys } from './key';
import { message } from '../../utils/message';
import { SKDB } from './ipfs.interface';
import { CID } from 'multiformats';

export interface NetworkConfig {
  tcp: number;
  ws: number;
  api: number;
  geteway: number;
}
export const createIpfs = async ({
  did,
  storePath,
  network,
  networkid,
}: {
  did: DidJson;
  storePath: { main: string };
  network: NetworkConfig;
  networkid: networkidType;
}): Promise<SKDB> => {
  // Create the repo
  const repo = storePath.main;
  // 不知道为什么，ipfs与SKDB ipfs不符
  const ipfs: any = await create({
    // repo: ossRepo,
    init: {
      // 首次创建repo，用这个账户私钥
      privateKey: did.privKey,
    },
    repo,
    config: {
      // // 非首次创建的repo，用这个
      // Identity: {
      //   PrivKey:
      //     'CAESQOu2tC61UCD6utWQpWndm8HSVWxi88P7cP29ydv6iHaOmVBTlFvfBXPpjZJeFi/Ult6HUOcVd9OOkyDg5TDibdk=',
      //   PeerID: '12D3KooWL8qb3L8nKPjDtQmJU8jge5Qspsn6YLSBei9MsbTjJDr8',
      // },
      Bootstrap: [
        // '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/p2p/12D3KooWCGXedZZsaSNLmpQKXewHKuqzU8ZzfXymQnZsUvwreiXL',
        // '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        // '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
        // '/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp',
        // '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
        // '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
        // '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
        // '/dns4/node1.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6',
        // '/dns4/node2.preload.ipfs.io/tcp/443/wss/p2p/QmV7gnbW5VTcJ3oyM2Xk1rdFBJ3kTkvxc87UFGsun29STS',
        // '/dns4/node3.preload.ipfs.io/tcp/443/wss/p2p/QmY7JB6MQXhxHvq7dBDh4HpbH29v4yE9JRadAVpndvzySN',
        // '/ip4/47.99.47.82/tcp/4002/p2p/12D3KooWDd6gAZ1Djtt4bhAG7djGKM32ETxiiiJCCWnH5ypK2csa',
        // '/ip4/0.0.0.0/tcp/24642/ws/p2p-webrtc-star',
      ],
      API: {
        // HTTPHeaders: {
        //   'Access-Control-Allow-Origin': ['*'],
        //   'Access-Control-Allow-Credentials': ['true'],
        // },
      },
      Swarm: {},
      Addresses: {
        Swarm: [`/dns4/wrtc-star1.zicui.net/tcp/443/wss/p2p-webrtc-star/`],
      },
      Pubsub: { Enabled: true },
    },
    EXPERIMENTAL: { ipnsPubsub: true },
    libp2p: libp2pBundle,
  });
  // console.log('ipfs created');
  // const obj = {
  //   a: 1,
  //   b: {
  //     c: [1, 2, 3],
  //   },
  // };
  // const httpApi = new HttpApi(ipfs);
  // await httpApi.start();
  // console.log(httpApi.apiAddr.toString() + '-');

  // const httpGateway = new HttpGateway(ipfs);
  // await httpGateway.start();
  // console.log('isonline', ipfs.isOnline());

  const cache = new Cache(resolve(repo, `./sk_cache_${networkid}`));
  cache.put(skCacheKeys.accountId, did.id);
  cache.put(skCacheKeys.accountPublicKey, did.pubKey || '');
  cache.put(skCacheKeys.accountPrivKey, did.privKey);
  // 添加默认的超时时间
  const dagGet = async (
    name: CID,
    options: Parameters<typeof ipfs.dag.get>[1],
  ) => ipfs.dag.get(name, { ...(options as Object), timeout: 30000 });
  const dagPut = async (
    name: CID,
    val: Parameters<typeof ipfs.dag.put>[1],
    options: Parameters<typeof ipfs.dag.put>[2],
  ) => {
    return ipfs.dag.put(name, val, { ...(options as Object), timeout: 30000 });
  };
  const skdb = {
    ...ipfs,
    cache,
    dag: {
      ...ipfs.dag,
      put: dagPut,
      get: dagGet,
    },
  };
  return skdb;
};
