import { create, createFromPrivKey, createFromB58String } from 'peer-id';
import { bytes } from 'multiformats';
import { message } from '../../utils/message';

export interface DidJson {
  id: string;
  pubKey?: string;
  privKey: string;
}

// 生成 libp2p de did
export const genetateDid = async () => {
  const did = await create({ keyType: 'Ed25519' });
  // logger(did.toJSON());
  return did.toJSON() as DidJson;
};

// 签名
// 使用ED25519，参考 libp2p-crypto/src/keys
export const signById = async (priv: string, data: Uint8Array) => {
  const PeerId = await createFromPrivKey(priv);
  const signature = new Uint8Array(await PeerId.privKey.sign(data));
  // message.info(signature);
  const signStr = bytes.toHex(signature);
  // message.info(bytes.fromHex(signStr));
  return signStr;
};

// 验证签名
export const verifyById = async (
  id: string,
  signature: string,
  data: Uint8Array,
) => {
  // message.info(signature);
  const PeerId = await createFromB58String(id);
  const verifyed = await PeerId.pubKey.verify(data, bytes.fromHex(signature));
  return verifyed;
};

genetateDid();

// const testDid = async () => {
//   // 验证一下did生成的每一位的随机性，确实是随机的
//   const dids = [];
//   for (let i = 0; i < 10000; i++) {
//     const did = await genetateDid();
//     dids.push(did.id);
//   }
//   const resMap = {
//     up: 0,
//     down: 0,
//   };
//   dids.forEach((ele) => {
//     const last = ele.substr(ele.length - 1, 1);
//     if (getCharCodeIsUp(last)) {
//       resMap.up = resMap.up + 1;
//     } else {
//       resMap.down = resMap.down + 1;
//     }
//   });
//   logger(resMap);
// };

// testDid();

// 1-9
// 'A' 'B' 'C' 'D' 'E' 'F' 'G' 'H'     'J' 'K' 'L' 'M' 'N'     'P' 'Q' 'R' 'S' 'T' 'U' 'V' 'W' 'X' 'Y' 'Z'

// 'a' 'b' 'c' 'd' 'e' 'f' 'g' 'h' 'i' 'j' 'k'     'm' 'n' 'o' 'p' 'q' 'r' 's' 't' 'u' 'v' 'w' 'x' 'y' 'z'
