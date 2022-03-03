/* eslint-disable @typescript-eslint/no-var-requires */
const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const Bootstrap = require('libp2p-bootstrap');
const KadDHT = require('libp2p-kad-dht');
const MPLEX = require('libp2p-mplex');
const MulticastDNS = require('libp2p-mdns');
const { NOISE } = require('@chainsafe/libp2p-noise');
const GossipSub = require('libp2p-gossipsub');
const WS = require('libp2p-websockets');
import { Libp2pFactoryFn } from 'ipfs-core';

export let network: Promise<typeof Libp2p>;

export const libp2pBundle: Libp2pFactoryFn = (opts) => {
  // Set convenience variables to clearly showcase some of the useful things that are available
  const peerId = opts.peerId;
  const bootstrapList = opts.config.Bootstrap;
  const announce = opts.config.Addresses?.Announce || [];
  const listen = opts.config.Addresses?.Swarm || [];

  network = Libp2p.create({
    peerId,
    addresses: {
      listen,
      announce,
    },
    // Lets limit the connection managers peers and have it check peer health less frequently
    connectionManager: {
      minConnections: 20,
      maxConnections: 200,
      pollInterval: 5000,
    },
    modules: {
      transport: [TCP, WS],
      streamMuxer: [MPLEX],
      connEncryption: [NOISE],
      peerDiscovery: [MulticastDNS, Bootstrap],
      dht: KadDHT,
      pubsub: GossipSub,
    },
    config: {
      peerDiscovery: {
        autoDial: true, // auto dial to peers we find when we have less peers than `connectionManager.minPeers`
        mdns: {
          interval: 10000,
          enabled: true,
        },
        bootstrap: {
          interval: 30e3,
          enabled: true,
          list: bootstrapList,
        },
      },
      // Turn on relay with hop active so we can connect to more peers
      relay: {
        enabled: true,
        hop: {
          enabled: true,
          active: true,
        },
      },
      dht: {
        enabled: true,
        kBucketSize: 20,
        randomWalk: {
          enabled: true,
          interval: 10e3, // This is set low intentionally, so more peers are discovered quickly. Higher intervals are recommended
          timeout: 2e3, // End the query quickly since we're running so frequently
        },
      },
      pubsub: {
        enabled: true,
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
