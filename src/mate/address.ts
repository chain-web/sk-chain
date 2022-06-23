import { parseSKDid } from '../lib/p2p/did';

export class Address {
  constructor(address: string) {
    const skdid = parseSKDid(address);
    this.did = address;
    this.peerid = skdid.peerId;
    this.bid = skdid.bid;
  }
  did: string; // sk did
  peerid: string; // libp2p peerid
  bid: string; // nacl box public id
}
