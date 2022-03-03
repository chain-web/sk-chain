import type { IPFS } from 'ipfs-core';
import type { Cache } from './cache';
import type { Cache as Cacheb } from './cache.browser';
import type { CID } from 'ipfs';
export interface SKDB extends IPFS {
  cache: Cache | Cacheb;
  CID: typeof CID;
}
