import { CID } from 'multiformats';
import { SKDB } from './../ipfs/ipfs.interface';
import {
  createLink,
  createNode,
  PBLink,
  PBNode,
  encode,
  ByteView,
} from '@ipld/dag-pb';

/**
 * mpt
 * 基础数据结构
 */
export class Mpt {
  constructor(db: SKDB, root: string) {
    this.db = db;
    this.root = root;
  }

  db: SKDB;
  root: string;
  rootTree!: PBNode;

  initRootTree = async () => {
    this.rootTree = (await this.db.dag.get(CID.parse(this.root))).value;
  };

  getKey = async (key: string): Promise<string | undefined> => {
    // TODO MPT
    const contentCid = this.rootTree.Links.find((ele) => ele.Name === key);
    if (contentCid) {
      return contentCid.Hash.toString();
    }
  };
}
