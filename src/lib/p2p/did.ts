import { create, createFromPrivKey, createFromB58String } from 'peer-id';
import { bytes } from 'multiformats';
import { box } from 'tweetnacl';
import { message } from '../../utils/message';

export interface DidJson {
  id: string; // libp2p
  pubKey: string; // libp2p
  privKey: string; // libp2p
  edPriv: string; // ed25519
  edPub: string; // ed25519
  boxId: string; // 非对称数据加密id
}

// 生成 libp2p de did
export const genetateDid = async (): Promise<DidJson> => {
  const did = await create({ keyType: 'Ed25519' });
  // message.info(did.toJSON(), did);
  const simpleDid = did.toJSON();
  const concatedKey = did.privKey.bytes; // bytes 是 key, priv, pub 的拼接
  const edPriv = bytes.toHex(concatedKey.slice(4, 36));
  const edPub = bytes.toHex(concatedKey.slice(36));
  const boxId = bytes.toHex(
    box.keyPair.fromSecretKey(concatedKey.slice(4, 36)).publicKey,
  );
  const didJson: DidJson = {
    id: simpleDid.id,
    privKey: simpleDid.privKey!,
    pubKey: simpleDid.pubKey!,
    edPriv,
    edPub,
    boxId,
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

// const newNonce = () => randomBytes(secretbox.nonceLength);
// (async () => {
//   // keys, messages & other inputs can be Uint8Arrays or hex strings
//   // Uint8Array.from([0xde, 0xad, 0xbe, 0xef]) === 'deadbeef'
//   const did = await genetateDid();
//   const did2 = await genetateDid();
//   const privU8a = bytes.fromHex(did.edPriv);
//   const pubU8a = bytes.fromHex(did.edPub);
//   const message = bytes.fromString('cc nacl test');
//   const publicKey = await ed.getPublicKey(privU8a);
//   // console.log('publicKey', publicKey);
//   const x25519 = await ed.getSharedSecret(privU8a, pubU8a);
//   console.log('x25519', x25519);
//   // const signature = await ed.sign(message, privateKey);
//   // const isValid = await ed.verify(signature, message, publicKey);
//   const bk = box.keyPair.fromSecretKey(privU8a);
//   console.log(bk)
//   const bk2 = box.keyPair.fromSecretKey(bytes.fromHex(did2.edPriv));
//   console.log('did',did,bytes.toHex(bk.publicKey), bytes.toHex(bk.secretKey));
//   console.log('did2',did2,bk2,bytes.toHex(bk2.publicKey), bytes.toHex(bk2.secretKey));
//   const nonce = newNonce();
//   const boxed = box(
//     message,
//     nonce,
//     bk2.publicKey,
//     bk.secretKey,
//   );
//   console.log('boxed', boxed)

//   const unboxed = box.open(boxed, nonce, bk.publicKey, bk2.secretKey)
//   console.log('unboxed', bytes.toString(unboxed!))
// })();

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
