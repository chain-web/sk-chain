import { CID } from 'multiformats';
import { SKDB } from './../ipfs/ipfs.interface';
export const getKey = async (db: SKDB, root: string, key: string) => {
  const rootTree = await db.dag.get(CID.parse(root))
  // TODO
  return ''
}