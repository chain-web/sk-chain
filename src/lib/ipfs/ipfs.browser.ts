import { networkidType } from 'config/types';
import type { IPFS } from 'ipfs';
import type { DidJson } from 'lib/p2p/did';
import type { SKDB } from './ipfs.interface';
import { Cache } from './cache.browser';
import { skCacheKeys } from './key';
import { message } from 'utils/message';
import { bytes } from 'multiformats';

const IPFSGl = (window as any).Ipfs;

export const createIpfs = async (opts: {
  did: DidJson;
  networkid: networkidType;
}): Promise<SKDB> => {
  const ipfs = (await IPFSGl.create({
    init: {
      // 首次创建repo，用这个账户私钥
      privateKey: opts.did.privKey,
    },
    repo: opts.did.id,
    preload: { enabled: true, addresses: [] },
    config: {
      // 非首次创建的repo，用这个
      Identity: {
        PrivKey: opts.did.privKey,
        PeerID: opts.did.id,
      },
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
        // '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
      ],
      Swarm: {},
      Addresses: {
        Announce: [
          // 对外网暴露的地址
          // `/ip4/0.0.0.0/tcp/24642/ws/p2p-webrtc-star/`,
          // '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
          // '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
        ],
        // docker 内需要监听0.0.0.0
        // API: `/ip4/0.0.0.0/tcp/${network.api}`,
        // Gateway: `/ip4/0.0.0.0/tcp/${network.geteway}`,
        Swarm: [
          // 服务发现server
          `/dns4/wrtc-star1.zicui.net/tcp/443/wss/p2p-webrtc-star/`,
          // '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
          // '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
        ],
        // Delegates: [
        //   '/dns4/node0.delegate.ipfs.io/tcp/443/https',
        //   '/dns4/node1.delegate.ipfs.io/tcp/443/https',
        //   '/dns4/node2.delegate.ipfs.io/tcp/443/https',
        //   '/dns4/node3.delegate.ipfs.io/tcp/443/https',
        // ],
      },
      Pubsub: { Enabled: true },
    },
    EXPERIMENTAL: { ipnsPubsub: true },
  })) as IPFS;
  message.info('bitswap stats', await ipfs.stats.bitswap());
  message.info('repo stats', await ipfs.stats.repo());
  message.info('id: ', await ipfs.id());

  // const topic = 'fruit-of-the-day';
  // const receiveMsg = (msg: any) => console.log(msg);

  // await ipfs.pubsub.subscribe(topic, receiveMsg);
  // console.log(`subscribed to ${topic}`);
  // setInterval(async () => {
  //   await ipfs.pubsub.publish(topic, bytes.fromString(opts.did.id));
  //   console.log(`published to ${topic}`);
  // }, 4000);

  // const howManyPrees = async () => {
  //   console.log(await ipfs.swarm.peers());
  //   const peerInfos = await ipfs.swarm.addrs();
  //   console.log('peers count:', peerInfos.length);
  //   peerInfos.forEach((info) => {
  //     console.log(info.id);
  //     info.addrs.forEach((addr) => console.log(addr.toString()));
  //   });
  // };
  // setInterval(howManyPrees, 10000);

  const cache = new Cache(`sk_cache_${opts.did.id}_${opts.networkid}`);
  cache.put(skCacheKeys.accountId, opts.did.id);
  cache.put(skCacheKeys.accountPublicKey, opts.did.pubKey || '');
  cache.put(skCacheKeys.accountPrivKey, opts.did.privKey);
  return { ...ipfs, cache, CID: IPFSGl.CID };
};
