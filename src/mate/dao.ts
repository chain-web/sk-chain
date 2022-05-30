import { BloomFilter } from '../lib/ipld/logsBloom/bloomFilter';
import { Address } from './address';

export interface DaoMeta {
  owner: Dao['owner'];
  dbs: Dao['dbs'];
  accountBloom: Dao['accountBloom'];
}

// DAO, decentralized autonomous organization 元数据
export class Dao {
  constructor(meta: DaoMeta) {
    this.owner = meta.owner;
    this.dbs = meta.dbs;
    this.accountBloom = meta.accountBloom;
  }

  owner: Address;
  dbs: string[];
  accountBloom: BloomFilter;
}
