import { createLibp2p, Libp2p, Libp2pOptions } from 'libp2p';
// @ts-expect-error - no types
import WS from 'libp2p-websockets';
import { KadDHT } from '@libp2p/kad-dht';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { WebRTCStar } from '@libp2p/webrtc-star';
import { Libp2pFactoryFn } from 'ipfs-core/dist/src/types';
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'
import { Bootstrap } from '@libp2p/bootstrap'

export class Network {
  private libp2p?: Promise<Libp2p>;
  webRtcStar = new WebRTCStar();

  constructor () {
    this.checkNetwork();
  }

  checkNetwork = async () => {
    if (this.libp2p) {
      // const lp = await this.libp2p
      // const ps = await lp.getPeers()
      // console.log('peers',ps)
      // const conns = await lp.getConnections()
      // console.log('conns', conns)
      // const topice = lp.pubsub.getTopics();
      // console.log('topice', topice)
      setTimeout(() => {
        this.checkNetwork()
      }, 10000);
    } else {
      setTimeout(() => {
        this.checkNetwork()
      }, 10000);
    }
  }

  genlibp2p = async () => {
    // this.libp2p = createLibp2p(this.config);
    return this.libp2p;
  };

  createLibp2p: Libp2pFactoryFn = (opts) => {
    const peerId = opts.peerId;
    const ds = opts.datastore
    const config: Libp2pOptions = {
      ...opts.libp2pOptions,
      peerId,
      datastore: ds,
      transports: [this.webRtcStar as any],
      connectionEncryption: [new Noise()],
      streamMuxers: [new Mplex() as any],
      peerDiscovery: [this.webRtcStar.discovery],
      connectionManager: {
        maxParallelDials: 150, // 150 total parallel multiaddr dials
        maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
        dialTimeout: 10e3, // 10 second dial timeout per peer dial
        autoDial: true,
      },
      nat: {
        enabled: false,
      },
      metrics: {
        enabled: true,
      },
    };
    this.libp2p = createLibp2p(config);
    return this.libp2p;
  };
}

export const browserNetwork = new Network();
