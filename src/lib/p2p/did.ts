import { create, createFromPrivKey, createFromB58String } from 'peer-id';
import { bytes } from 'multiformats';
import { box } from 'tweetnacl';
import { message } from '../../utils/message';
import { base58btc } from 'multiformats/bases/base58';
import { concat } from 'uint8arrays/concat';
import { __wbgtest_console_log } from 'cwjsr';
export interface DidJson {
  id: string; // sk did
  pubKey: string; // libp2p
  privKey: string; // libp2p
  edPriv: string; // ed25519
  edPub: string; // ed25519
}

const prefix_SKw3 = new Uint8Array([193, 149, 185, 110]);
const prefix_D7 = new Uint8Array([9, 60]);
const prefix_peerId = new Uint8Array([0, 36, 8, 1, 18, 32]);

// 生成 libp2p de did
export const genetateDid = async (): Promise<DidJson> => {
  const did = await create({ keyType: 'Ed25519' });
  // message.info(did.toJSON(), did);
  const simpleDid = did.toJSON();
  const concatedKey = did.privKey.bytes; // bytes 是 key, priv, pub 的拼接
  const boxPubId = box.keyPair.fromSecretKey(
    concatedKey.slice(4, 36),
  ).publicKey;
  const id = concat([prefix_SKw3, concatedKey.slice(36), boxPubId]);
  const edPriv = bytes.toHex(concatedKey.slice(4, 36));
  const edPub = bytes.toHex(concatedKey.slice(36));
  const didJson: DidJson = {
    id: base58btc.encode(id).substring(1), // remove first z
    privKey: simpleDid.privKey!,
    pubKey: simpleDid.pubKey!,
    edPriv,
    edPub,
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

// 解析出nacl public key
export const parseBoxPubKey = (bid: string) => {
  const byte = base58btc.decode(`z${bid}`);
  return byte.slice(2);
};

// 从 did 解析出libp2p peerID 和 nacl public id
export const parseSKDid = (did: string) => {
  if (did.substring(0, 4) !== 'SKw3') {
    throw new Error(`invalid did: ${did}`);
  }
  const byte = base58btc.decode(`z${did}`);
  const pubKey = byte.slice(4, 36);
  const peerId = concat([prefix_peerId, pubKey]);
  const b58PeerId = base58btc.encode(peerId).substring(1);
  const bid = base58btc
    .encode(concat([prefix_D7, byte.slice(36)]))
    .substring(1);
  return {
    bid,
    peerId: b58PeerId,
  };
};

// const newNonce = () => randomBytes(secretbox.nonceLength);
(async () => {
  // gen dids
  // const dids: DidJson[] = []
  // for (let index = 0; index < 5; index++) {
  //   const did = await genetateDid();
  //   dids.push(did)
  // }
  // console.log(JSON.stringify(dids))

  // keys, messages & other inputs can be Uint8Arrays or hex strings
  // Uint8Array.from([0xde, 0xad, 0xbe, 0xef]) === 'deadbeef'
  // const did = await genetateDid();
  // const addr = parseSKDid(did.id);
  // console.log(addr);
  // console.log(did, did.id.length)
  // const did2 = await genetateDid();
  // const privU8a = bytes.fromHex(did.edPriv);
  // const pubU8a = bytes.fromHex(did.edPub);
  // const message = bytes.fromString('cc nacl test');
  // const publicKey = await ed.getPublicKey(privU8a);
  // // console.log('publicKey', publicKey);
  // const x25519 = await ed.getSharedSecret(privU8a, pubU8a);
  // console.log('x25519', x25519);
  // // const signature = await ed.sign(message, privateKey);
  // // const isValid = await ed.verify(signature, message, publicKey);
  // const bk = box.keyPair.fromSecretKey(privU8a);
  // console.log(bk)
  // const bk2 = box.keyPair.fromSecretKey(bytes.fromHex(did2.edPriv));
  // console.log('did',did,bytes.toHex(bk.publicKey), bytes.toHex(bk.secretKey));
  // console.log('did2',did2,bk2,bytes.toHex(bk2.publicKey), bytes.toHex(bk2.secretKey));
  // const nonce = newNonce();
  // const boxed = box(
  //   message,
  //   nonce,
  //   bk2.publicKey,
  //   bk.secretKey,
  // );
  // console.log('boxed', boxed)
  // const unboxed = box.open(boxed, nonce, bk.publicKey, bk2.secretKey)
  // console.log('unboxed', bytes.toString(unboxed!))
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
