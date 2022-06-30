/* eslint-disable @typescript-eslint/no-var-requires */
import { createLibp2p, Libp2p, Libp2pOptions } from 'libp2p';
import { Bootstrap } from '@libp2p/bootstrap';
import { Mplex } from '@libp2p/mplex';
import { MulticastDNS } from '@libp2p/mdns';
import { KadDHT } from '@libp2p/kad-dht';
import { Noise } from '@chainsafe/libp2p-noise';
import { FloodSub } from '@libp2p/floodsub';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';

import { WebRTCStar } from '@libp2p/webrtc-star';
import * as wrtc from 'wrtc';
import { Libp2pFactoryFn } from 'ipfs-core';
import { RecursivePartial } from '@libp2p/interfaces';
import type { Transport } from '@libp2p/interface-transport'

class Network {
  private libp2p: any;
  webRtcStar = new WebRTCStar({ wrtc });

  genlibp2p = async () => {
    // this.libp2p = createLibp2p(this.config);
    return this.libp2p;
  };

  createLibp2p: Libp2pFactoryFn = (opts) => {
    const peerId = opts.peerId;
    const bootstrapList = opts.config.Bootstrap || [];
    const ds = opts.datastore;
    // console.log(opts);
    const config: Libp2pOptions = {
      ...opts.libp2pOptions,
      peerId,
      datastore: ds,
      transports: [this.webRtcStar as any],
      connectionEncryption: [new Noise()],
      streamMuxers: [new Mplex() as any],
      peerDiscovery: [
        this.webRtcStar.discovery,
        // new MulticastDNS({
        //   interval: 1e4,
        // }) as any,
        // new Bootstrap({
        //   interval: 6e4,
        //   list: bootstrapList,
        // }),
      ],
      pubsub: new GossipSub({ allowPublishToZeroPeers: true }),
      dht: new KadDHT(),
      connectionManager: {
        maxParallelDials: 150, // 150 total parallel multiaddr dials
        maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
        dialTimeout: 10e3, // 10 second dial timeout per peer dial
        autoDial: true,
      },
      nat: {
        enabled: false,
      },
      relay: {
        enabled: true,
        hop: {
          enabled: true,
          active: true,
        },
      },
      metrics: {
        enabled: true,
        computeThrottleMaxQueueSize: 1000, // How many messages a stat will queue before processing
        computeThrottleTimeout: 2000, // Time in milliseconds a stat will wait, after the last item was added, before processing
        movingAverageIntervals: [
          // The moving averages that will be computed
          60 * 1000, // 1 minute
          5 * 60 * 1000, // 5 minutes
          15 * 60 * 1000, // 15 minutes
        ],
        maxOldPeersRetention: 50, // How many disconnected peers we will retain stats for
      },
    };
    return createLibp2p(config);
  };
}

export const nodeNetwork = new Network();
