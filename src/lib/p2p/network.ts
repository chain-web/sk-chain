// import Libp2p, { HandlerProps, MuxedStream } from 'libp2p';
// import { lifecycleEvents, LifecycleStap } from '../events/lifecycle';
// import { SKDB } from '../ipfs/ipfs';
// import { pipe } from 'it-pipe';
// import { encode, decode } from 'it-length-prefixed';
// import { PeerId } from 'libp2p-interfaces/src/topology';
// import { bytes } from 'multiformats';
// import { multiaddr } from 'ipfs';
// import { message } from '../../utils/message';

// // 广播自己是sk节点
// const SKPEER100 = '/sk/skpree/1.0.0';

// export class Network {
//   constructor(libp2p: Libp2p, db: SKDB) {
//     this.libp2p = libp2p;
//     this.db = db;
//     this.libp2p.handle(SKPEER100, this._onConnection);
//     this.filterPeers();
//     this.findSKPeers();
//   }
//   libp2p: Libp2p;
//   peers = new Map<string, { addrs: Set<string> }>();
//   db: SKDB;

//   // logger('libp2p', this.libp2p.dial);

//   filterSKPeers = async () => {
//     // 已经找到的sk节点，需要过滤
//     // TODO
//   };
//   filterPeers = async () => {
//     // 找到稳定的sk节点
//     lifecycleEvents.emit(LifecycleStap.startFilterPeers);
//     const peers = await this.db.swarm.peers();
//     message.info(peers.length);
//     const badPeerInfos = [];
//     for (let i = 0; i < peers.length; i++) {
//       const peer = peers[i];
//       const peerInfo = await this.db.ping(peer.peer);
//       for await (const pingInfo of peerInfo) {
//         if (pingInfo.text.match('Average')) {
//           const ms = pingInfo.text
//             .replace('Average latency: ', '')
//             .replace('ms', '');
//           if (+ms > 100) {
//             badPeerInfos.push(peerInfo);
//           }
//         }
//       }
//     }
//     message.info(badPeerInfos);

//     lifecycleEvents.emit(LifecycleStap.filterPeersDone);
//     setTimeout(this.filterPeers, 20000);
//   };
//   _onConnection = async ({ protocol, stream, connection }: HandlerProps) => {
//     try {
//       await pipe(stream, decode(), async (source) => {
//         for await (const data of source) {
//           try {
//             const msg = JSON.parse(bytes.toString(data.slice()));
//             if (protocol === SKPEER100) {
//               if (msg.n === 'sk') {
//                 const remoteAddr = connection.remoteAddr.toString();
//                 const remotePeer = connection.remotePeer.toB58String();
//                 if (!new multiaddr(remoteAddr).getPeerId()) {
//                   return;
//                 }
//                 if (!this.peers.has(remotePeer)) {
//                   this.peers.set(remotePeer, { addrs: new Set() });
//                 }
//                 this.db.swarm.connect(remoteAddr);
//                 this.peers.get(remotePeer)?.addrs.add(remoteAddr);
//               }
//             }
//           } catch (err) {
//             message.error(err);
//             break;
//           }
//         }
//       });
//     } catch (err) {
//       message.error(err);
//     }
//   };
//   findSKPeers = async () => {
//     // 只向外发送，告诉所有链接我的peer，我是sk
//     const peers = await this.db.swarm.peers();
//     message.info(peers.length, this.peers.size);
//     for (let i = 0; i < peers.length; i++) {
//       const peer = peers[i];
//       this.sendMessage(peer.addr.toString(), { n: 'sk' });
//     }

//     const pingSK = async (peer: string) => {
//       message.info('ping', peer);
//       const peerInfo = await this.db.ping(peer);
//       for await (const pingInfo of peerInfo) {
//         if (!pingInfo.success) {
//           this.peers.delete(peer);
//         }
//       }
//     };

//     for (const peer of this.peers.keys()) {
//       pingSK(peer);
//     }

//     setTimeout(this.findSKPeers, 10000);
//   };
//   sendMessage = async (peer: PeerId | string, msg: any) => {
//     // logger('sendMessage to ', peer, msg);
//     try {
//       const connection = await this.libp2p.dial(peer);
//       const { stream, protocol } = await connection.newStream([SKPEER100]);

//       let serialized: Uint8Array;
//       switch (protocol) {
//         case SKPEER100:
//           serialized = bytes.fromString(JSON.stringify(msg));
//           break;
//         default:
//           throw new Error('Unknown protocol: ' + protocol);
//       }

//       // Note: Don't wait for writeMessage() to complete
//       writeMessage(stream, serialized);
//     } catch (error: any) {
//       if (error.code === 'ERR_UNSUPPORTED_PROTOCOL') {
//         // 其他ipfs节点未监听这个协议，忽略
//       } else if (error.code === 'ERR_INVALID_MULTIADDR') {
//         // tcp，但它不是libp2p地址
//       } else {
//         message.error(error.code);
//       }
//     }
//   };
// }

// async function writeMessage(stream: MuxedStream, msg: Uint8Array) {
//   try {
//     await pipe([msg], encode(), stream);
//   } catch (err) {
//     message.error(err);
//   }
// }


export default ''