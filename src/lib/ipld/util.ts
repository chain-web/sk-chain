import {
  createLink,
  createNode,
  PBLink,
  PBNode,
  encode,
  ByteView,
} from '@ipld/dag-pb';
import { bytes } from 'multiformats';

export const createEmptyNode = (name: string) => {
  return createNode(bytes.fromString(name), []);
};
