export type KeyType = 'base58' | 'base32';

export namespace ConstractHelper {
  export type SliceDb<T> = {
    get: (key: string) => T;
    delete: (key: string) => void;
    set: (key: string, value: T) => void;
  };
}

const createSliceDb = <T = any>(keyType: KeyType) => {
  // 关联一个ipld实例到合约，用来做分片存储
  sk.createDb(keyType);
  return new Map() as ConstractHelper.SliceDb<T>;
};

const hash = (str: string) => {
  return sk.genCidString(str);
};

class BaseContract {
  msg = {
    sender: '',
    ts: 0,
  };
}
export const constractHelper = {
  createSliceDb,
  BaseContract,
  hash,
};
