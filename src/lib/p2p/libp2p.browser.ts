import { createLibp2p, Libp2pOptions } from 'libp2p';
// @ts-expect-error - no types
import WS from 'libp2p-websockets';
import { KadDHT } from '@libp2p/kad-dht';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { validator, selector } from './ipns';
import { WebRTCStar } from '@libp2p/webrtc-star';
import { Libp2pFactoryFn } from 'ipfs-core/dist/src/types';
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'
import { Bootstrap } from '@libp2p/bootstrap'

export class Network {
  private libp2p: any;
  webRtcStar = new WebRTCStar();

  genlibp2p = async () => {
    // this.libp2p = createLibp2p(this.config);
    return this.libp2p;
  };

  createLibp2p: Libp2pFactoryFn = (opts) => {
    const peerId = opts.peerId;
    const bootstrapList = opts.config.Bootstrap || [];
    const announce = opts.config.Addresses?.Announce || [];
    const listen = opts.config.Addresses?.Swarm || [];
    const ds = opts.datastore
    console.log(opts)
    const config: Libp2pOptions = {
      ...opts.libp2pOptions,
      peerId,
      datastore: ds,
      transports: [this.webRtcStar],
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
    return createLibp2p(config);
  };
}

export const browserNetwork = new Network();
