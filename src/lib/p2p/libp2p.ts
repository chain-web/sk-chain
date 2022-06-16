/* eslint-disable @typescript-eslint/no-var-requires */
import { createLibp2p, Libp2p } from 'libp2p';
import { Bootstrap } from '@libp2p/bootstrap';
import { Mplex } from '@libp2p/mplex';
import { MulticastDNS } from '@libp2p/mdns';
import { TCP } from '@libp2p/tcp';
import { KadDHT } from '@libp2p/kad-dht';
import { Noise } from '@chainsafe/libp2p-noise';
import { FloodSub } from '@libp2p/floodsub';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';

import { WebRTCStar } from '@libp2p/webrtc-star';
import * as wrtc from 'wrtc';
import { Libp2pFactoryFn } from 'ipfs-core';

export let network: Promise<Libp2p>;
// const WRTC = new WebRTCStar({ wrtc: wrtc })
const transportKey = WebRTCStar.prototype[Symbol.toStringTag];
export const libp2pBundle: Libp2pFactoryFn = (opts) => {
  // Set convenience variables to clearly showcase some of the useful things that are available
  const peerId = opts.peerId;
  const bootstrapList = opts.config.Bootstrap || [];
  const announce = opts.config.Addresses?.Announce || [];
  const listen = opts.config.Addresses?.Swarm || [];

  network = createLibp2p({
    peerId,
    addresses: {
      listen,
      announce,
    },
    // Lets limit the connection managers peers and have it check peer health less frequently
    connectionManager: {
      minConnections: 20,
      maxConnections: 200,
      autoDialInterval: 5000,
    },
    transports: [new WebRTCStar({ wrtc: wrtc })],
    pubsub: new GossipSub(),
    connectionEncryption: [new Noise()],
    peerDiscovery: [
      new MulticastDNS({
        interval: 1e4,
      }) as any,
      new Bootstrap({
        interval: 6e4,
        list: bootstrapList,
      }),
    ],
    dht: new KadDHT(),
    //   // pubsub: GossipSub,
    // },
    streamMuxers: [new Mplex() as any],
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
  });
  return network;
};
