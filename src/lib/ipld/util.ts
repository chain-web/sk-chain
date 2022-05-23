import {
  createLink,
  createNode,
  PBLink,
  PBNode,
  encode,
  ByteView,
} from '@ipld/dag-pb';
import { bytes } from 'multiformats';
import { SKDB } from '../ipfs/ipfs.interface';

export const createEmptyNode = (name: string) => {
  return createNode(bytes.fromString(name), []);
};

export const createEmptyNodeCid = async (name: string, db: SKDB) => {
  const storageRoot = await db.dag.put(createEmptyNode(name));
  return storageRoot;
};

// generate init account storageRoot
export const createEmptyStorageRoot = async (db: SKDB) => {
  return await db.dag.put([]);
};
