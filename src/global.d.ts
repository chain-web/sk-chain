import type { Ipld } from './src/lib/ipld/index';

declare global {
  interface Window {
    __sk__ipld__getAccount: Ipld['getAccount'];
  }
}
