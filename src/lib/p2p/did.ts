import { create, createFromPrivKey, createFromB58String } from 'peer-id';
import { bytes } from 'multiformats';
import { randomBytes, secretbox } from 'tweetnacl';
import { message } from '../../utils/message';
import { base58btc } from 'multiformats/bases/base58';
import { __wbgtest_console_log } from 'cwjsr';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import * as lsm from 'libsodium-wrappers-sumo';

export interface DidJson {
  id: string; // sk did
  pubKey?: string; // libp2p
  privKey: string; // libp2p
}

// https://libsodium.gitbook.io/doc/advanced/ed25519-curve25519
// https://github.com/paulmillr/noble-ed25519#getsharedsecretprivatekey-publickey

// const prefix_SKw3 = new Uint8Array([193, 149, 185, 110]);
// const prefix_D7 = new Uint8Array([9, 60]);
// const prefix_peerId = new Uint8Array([0, 36, 8, 1, 18, 32]);

// 生成 libp2p de did
export const genetateDid = async (): Promise<DidJson> => {
  const did = await create({ keyType: 'Ed25519' });
  // message.info(did.toJSON(), did);
  const simpleDid = did.toJSON();
  const didJson: DidJson = {
    id: simpleDid.id, // remove first z
    privKey: simpleDid.privKey!,
    pubKey: simpleDid.pubKey!,
  };
  return didJson;
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

// 从libp2p私钥中解出ed priv
export const privKeyToEdPriv = (priv: string) => {
  const byte = uint8ArrayFromString(priv, 'base64pad');
  return byte.slice(4);
};

// 解析出nacl public key
export const parseBoxPubKey = (did: string) => {
  const byte = base58btc.decode(`z${did}`);
  const pku8 = byte.slice(6);
  const xpk = lsm.crypto_sign_ed25519_pk_to_curve25519(pku8);
  return xpk;
};

// 从ed priv 解析出nacl priv key
export const parseBoxPrivKey = (edPriv: Uint8Array) => {
  const xsk = lsm.crypto_sign_ed25519_sk_to_curve25519(edPriv);
  return xsk;
};

export const newNonce = () => randomBytes(secretbox.nonceLength);
(async () => {
  // await lsm.ready;
  // // 生成did
  // const did = await genetateDid();
  // const did2 = await genetateDid();
  // const priv = privKeyToEdPriv(did.privKey);
  // const priv2 = privKeyToEdPriv(did2.privKey);
  // // 计算x25519 pk sk
  // const xsk = parseBoxPrivKey(priv);
  // const xsk2 = parseBoxPrivKey(priv2);
  // const xpk = parseBoxPubKey(did.id);
  // const xpk2 = parseBoxPubKey(did2.id);
  // // 加密、解密
  // const msg = 'test-msg'
  // const nc = newNonce();
  // const box = lsm.crypto_box_easy(msg, nc, xpk2, xsk);
  // const unboxed = lsm.crypto_box_open_easy(box, nc, xpk, xsk2);
  // console.log('encode-decode succ: ', bytes.toString(unboxed) === msg);
})();

// genetateDid();

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
