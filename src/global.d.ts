import { SKDB } from './src/lib/ipfs/ipfs.interface';
import { Account } from './src/mate/account';
import type { Ipld } from './src/lib/ipld/index';
import { errorCodes, accountOpCodes } from './lib/contract/code';
import { KeyType } from './src/utils/contractHelper';

export interface SkJsrInterface {
  getAccount: (account: string) => Account;
  errorCodes: typeof errorCodes;
  accountOpCodes: typeof accountOpCodes;
  createDb: (keyType: KeyType) => Ipld; // TODO
  genCidString: (str: string) => string; // TODO
}

declare global {
  interface Window {
    __sk__: SkJsrInterface;
  }

  declare var sk: SkJsrInterface;
}

export type ValueOf<T> = T[keyof T];

