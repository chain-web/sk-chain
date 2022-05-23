import { TransactionAction } from './../transaction/index';
// @ts-ignore:next-line
import bloom from 'bloom.js';

export class BloomFilter {
  constructor() {
    this.bloom = new bloom(TransactionAction.MAX_TRANS_LIMIT * 20, 5);
  }
  bloom;

  add = (key: string) => this.bloom.add(key);

  contains = (key: string) => this.bloom.contains(key);
}
