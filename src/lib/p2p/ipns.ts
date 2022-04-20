import { validate } from 'ipns/validator';
import { ipnsSelector } from 'ipns/selector';
import { PublicKey } from 'libp2p/src/peer-store/key-book';

export const validator = {
  func: (key: any, record: PublicKey) => validate(record, key),
};

export function selector(_k: any, records: [Uint8Array, Uint8Array[]]) {
  return ipnsSelector(records[0], records[1]);
}
