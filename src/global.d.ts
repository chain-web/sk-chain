import { Account } from 'mate/account';
import type { Ipld } from './src/lib/ipld/index';
import { errorCodes, accountOpCodes } from './lib/contract/code';

export interface SkJsrInterface {
  getAccount: (account: string) => Account;
  errorCodes: typeof errorCodes;
  accountOpCodes: typeof accountOpCodes;
  createDb: (keyType: 'base58' | 'base64') => Ipld;
}

declare global {
  interface Window {
    __sk__ipld__getAccount: Ipld['getAccount'];
    __sk__: SkJsrInterface;
  }

  declare var sk: SkJsrInterface;
}

export type ValueOf<T> = T[keyof T];

