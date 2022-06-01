import { IPFS } from 'ipfs-core';
import type { Cache } from './cache';
import type { Cache as Cacheb } from './cache.browser';
export interface SKDB extends IPFS {
  cache: Cache | Cacheb;
}
