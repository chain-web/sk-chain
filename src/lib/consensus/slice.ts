import type { MessageHandlerFn } from 'ipfs-core-types/src/pubsub';
import { lifecycleEvents, lifecycleStap } from '../events/lifecycle';
import { SKDB } from '../ipfs/ipfs.interface';
import { message } from '../../utils/message';

export class Slice {
  constructor(db: SKDB) {
    this.db = db;
    this.peerId = this.db.cache.get('accountId');
    this.slice = this.db.cache.get(this.sliceCacheName) || 'o';
  }
  // 单个分片最大节点数
  static maxCount = 128;
  // 单个分片最小节点数
  static minCount = 64;
  // 发布自己活跃的信号间隔
  static pubTimeout = 8 * 1000;
  // 节点不活跃后被判定为离线的时间间隔
  static peerOfflineTimeout = Slice.pubTimeout * 4;
  db: SKDB;
  peerId: string;
  _slice!: string;
  nextSlice!: string;
  sliceCacheName = 'sk-slice';
  slicePeersCacheName = 'sk-slice-peers';
  curPeers: Map<string, { ts: number }> = new Map();

  set slice(str: string) {
    // 主要是为了能自动更新nextSlice
    this._slice = str;
    this.nextSlice = this.getNextSlice(str);
    this.save();
  }

  get slice() {
    return this._slice;
  }

  private getNextSlice = (str: string) => {
    const length = str.split('-').length;
    const isL = this.checkIsL(length - 1);
    return `${str}-${isL ? 'l' : 'r'}`;
  };

  public init = async () => {
    lifecycleEvents.emit(lifecycleStap.initingSlice);

    // 把缓存里的当前节点prees拿出来
    const cid = this.db.cache.get(this.slicePeersCacheName);
    if (cid) {
      const cidObj = this.db.CID.parse(cid);
      const peers = await this.db.dag.get(cidObj);
      peers.value.forEach((ele: string) => {
        this.curPeers.set(ele, { ts: Date.now() });
      });
    }

    const sliceArr = this.slice.split('-');
    let curSlice = '';
    sliceArr.forEach((ele, i) => {
      curSlice = curSlice + ele;
      const isL = this.checkIsL(i);
      // if (this.slice === 'o') {
      //   // 还未分片
      //   if () {}
      // }
      // if (ele === 'l') {
      // }
      // if (ele === 'r') {
      // }
    });
    this.initSliceSubscribe();
    this.pubSlice();
    lifecycleEvents.emit(lifecycleStap.initedSlice);
  };
  private initSliceSubscribe = async () => {
    // 监听当前分片
    await this.db.pubsub.subscribe(this.slice, this.handelSubSliceMessage);
  };

  private handelSubSliceMessage: MessageHandlerFn = async (data) => {
    this.curPeers.set(data.from, { ts: Date.now() });
    // 如果节点数大于当前分片最大数量，则二分，如果小于最小，则回到上一分片
    if (this.curPeers.size > Slice.maxCount) {
      this.db.pubsub.unsubscribe(this.slice);
      this.slice = this.nextSlice;
      await this.initSliceSubscribe();
    }
    if (this.curPeers.size < Slice.minCount) {
      if (this.slice === 'o') {
        // 还未分片
        return;
      }
      this.db.pubsub.unsubscribe(this.slice);
      this.slice = this.slice.substring(0, this.slice.length - 2);
      await this.initSliceSubscribe();
    }
  };

  private pubSlice = async () => {
    await this.db.pubsub.publish(this.slice, new Uint8Array([]));
    await this.refreshCurrPeers();
    setTimeout(() => {
      this.pubSlice();
    }, Slice.pubTimeout);
  };

  private refreshCurrPeers = async () => {
    const keys = [];
    for (const key of this.curPeers.keys()) {
      if (
        Date.now() - (this.curPeers.get(key)?.ts || 0) >
        Slice.peerOfflineTimeout
      ) {
        this.curPeers.delete(key);
      } else {
        keys.push(key);
      }
    }
    const cid = await this.db.dag.put(keys);
    this.db.cache.put(this.slicePeersCacheName, cid.toString());
  };

  private save = () => {
    this.db.cache.put(this.sliceCacheName, this.slice);
  };

  // 根据peerId和目前所在分片，确定下一分片
  private checkIsL = (index: number) => {
    const last = this.peerId.substr(this.peerId.length - (1 + index), 1);
    return Slice.getCharCodeIsUp(last);
  };

  public static getCharCodeIsUp = (char: string) => {
    const up = [
      '1',
      '4',
      '5',
      '8',
      '9',
      'b',
      'e',
      'f',
      'i',
      'j',
      'n',
      'o',
      'r',
      's',
      'u',
      'x',
      'y',
      'B',
      'C',
      'F',
      'G',
      'K',
      'L',
      'N',
      'Q',
      'S',
      'U',
      'W',
      'Z',
    ];
    return up.includes(char);
  };
}
