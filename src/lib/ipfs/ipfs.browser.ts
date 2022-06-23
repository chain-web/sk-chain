import { IPFS, create } from 'ipfs-core';
import type { SKDB } from './ipfs.interface';
import { Cache } from './cache.browser';
import { skCacheKeys } from './key';
import { bytes, CID } from 'multiformats';
import { networkidType } from '../../config/types';
import { DidJson, parseSKDid } from '../p2p/did';
import { message } from '../../utils/message';
import { browserNetwork } from '../p2p/libp2p.browser';

export const createIpfs = async (opts: {
  did: DidJson;
  networkid: networkidType;
}): Promise<SKDB> => {
  const peerid = parseSKDid(opts.did.id);
  const ipfs = await create({
    init: {
      // 首次创建repo，用这个账户私钥
      privateKey: opts.did.privKey,
    },
    repo: peerid.peerId,
    preload: { enabled: true, addresses: [] },
    config: {
      // 非首次创建的repo，用这个
      Identity: {
        PrivKey: opts.did.privKey,
        PeerID: peerid.peerId,
      },
      Bootstrap: [],
      Swarm: {},
      Addresses: {
        Swarm: [
          // 服务发现server
          `/dns4/wrtc-star1.zicui.net/tcp/443/wss/p2p-webrtc-star/`,
          // '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
          // '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star',
        ],
      },
      Pubsub: { Enabled: true },
    },
    EXPERIMENTAL: { ipnsPubsub: true },
    libp2p: browserNetwork.createLibp2p,
  });
  message.info('id: ', await ipfs.id());

  const cache = new Cache(`sk_cache_${opts.did.id}_${opts.networkid}`);
  cache.put(skCacheKeys.accountId, opts.did.id);
  cache.put(skCacheKeys.accountPublicKey, opts.did.pubKey || '');
  cache.put(skCacheKeys.accountPrivKey, opts.did.privKey);

  // 添加默认的超时时间
  const dagGet = async (
    name: CID,
    options: Parameters<typeof ipfs.dag.get>[1],
  ) => ipfs.dag.get(name, { ...options, timeout: 30000 });
  const skdb = {
    ...ipfs,
    cache,
    dag: {
      ...ipfs.dag,
      get: dagGet,
    },
  } as unknown as SKDB;
  return skdb;
};
