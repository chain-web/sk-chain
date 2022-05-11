export type KeyType = 'base58' | 'base64';

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

class BaseContract {
  msg = {
    sender: '',
  };
}
export const constractHelper = {
  createSliceDb,
  BaseContract,
};
