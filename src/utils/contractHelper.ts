import { Address } from 'mate/address';
import {ContractResultItem as CRI} from '../lib/contract'

export type SliceKeyType = 'base58' | 'base32';

export namespace ConstractHelper {
  export type SliceDb<T> = {
    get: (key: string) => T;
    has: (key: string) => boolean;
    delete: (key: string) => void;
    set: (key: string, value: T) => void;
  };
  export type ContractResultItem = CRI;
}

class SliceDb<T> implements ConstractHelper.SliceDb<T> {
  constructor(keyType: SliceKeyType) {
    this.keyType = keyType;
  }
  // TODO 用keyType，用来做分片存储
  keyType: SliceKeyType;
  db: Map<string, T> = new Map();

  get = this.db.get as ConstractHelper.SliceDb<T>['get'];
  set = this.db.set;
  has = this.db.has;
  delete = this.db.delete;
}

const createSliceDb = <T = any>(keyType: SliceKeyType) => {
  return new SliceDb<T>(keyType);
};

const hash = (str: string) => {
  return sk.genCidString(str);
};

class BaseContract {
  msg = {
    sender: new Address(''),
    ts: 0,
  };
}
export const constractHelper = {
  createSliceDb,
  BaseContract,
  hash,
  log: console.log,
};
