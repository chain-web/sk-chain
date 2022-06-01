import { SKChain } from './../../skChain';
import { SKChainLibBase } from './../base';
import type { MessageHandlerFn } from 'ipfs-core-types/src/pubsub';
import { lifecycleEvents, LifecycleStap } from '../events/lifecycle';
import { SKDB } from '../ipfs/ipfs.interface';
import { message } from '../../utils/message';
import { CID, bytes } from 'multiformats';

type SlicePubData =
  | {
      blockRoot: string;
      blockHeight: string;
      ready: true; // 同步完成，可以打包共识
      ts: number;
    }
  | {
      ts: number;
      ready?: false;
    };

export class Slice extends SKChainLibBase {
  constructor(chain: SKChain) {
    super(chain);
    this.peerId = this.chain.db.cache.get('accountId');
    this.slice = this.chain.db.cache.get(this.sliceCacheName) || 'o';
  }
  // 单个分片最大节点数
  static maxCount = 128;
  // 单个分片最小节点数
  static minCount = 64;
  // 发布自己活跃的信号间隔
  static pubTimeout = 6 * 1000;
  // 节点不活跃后被判定为离线的时间间隔
  static peerOfflineTimeout = Slice.pubTimeout * 4;
  // 将一个blockRoot作为可信的最小权重，每收到一次slice，相应blockRoot权重+1
  static minCerdibleWeight = 2;

  peerId: string;
  _slice!: string;
  nextSlice!: string;
  sliceCacheName = 'sk-slice';
  slicePeersCacheName = 'sk-slice-peers';
  curPeers: Map<string, { ts: number; ready: boolean }> = new Map();

  blockRootMap: {
    [key: string]: {
      weight: number;
      blockHeight: string;
    };
  } = {};

  syncing = false;

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
    lifecycleEvents.emit(LifecycleStap.initingSlice);

    // 把缓存里的当前节点peers拿出来
    const cid = this.chain.db.cache.get(this.slicePeersCacheName);
    if (cid) {
      try {
        const cidObj = CID.parse(cid);
        // TODO 这里可能会长时间不相应，待排查
        const peers = await this.chain.db.dag.get(cidObj, { timeout: 5000 });
        peers.value.forEach((ele: string) => {
          this.curPeers.set(ele, {
            ts: Date.now(),
            ready: this.chain.consensus.isReady(),
          });
        });
      } catch (error) {
        console.log(error);
      }
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

    lifecycleEvents.emit(LifecycleStap.initedSlice);
  };
  private initSliceSubscribe = async () => {
    // 监听当前分片
    await this.chain.db.pubsub.subscribe(
      this.slice,
      this.handelSubSliceMessage,
    );
  };

  private handelSubSliceMessage: MessageHandlerFn = async (data) => {
    const slicePubData: SlicePubData = JSON.parse(bytes.toString(data.data));
    if (data.from !== this.chain.did) {
      this.addToBlockRootMap(slicePubData);
    }
    this.curPeers.set(data.from, {
      ts: slicePubData.ts,
      ready: Boolean(slicePubData.ready),
    });
    // 如果节点数大于当前分片最大数量，则二分，如果小于最小，则回到上一分片
    if (this.curPeers.size > Slice.maxCount) {
      this.chain.db.pubsub.unsubscribe(this.slice);
      this.slice = this.nextSlice;
      await this.initSliceSubscribe();
    }
    if (this.curPeers.size < Slice.minCount) {
      if (this.slice === 'o') {
        // 还未分片
        return;
      }
      this.chain.db.pubsub.unsubscribe(this.slice);
      this.slice = this.slice.substring(0, this.slice.length - 2);
      await this.initSliceSubscribe();
    }
  };

  // 更新blockRootMap中新收到的blockRoot的权重
  addToBlockRootMap = async (data: SlicePubData) => {
    if (data.ready) {
      let cur = this.blockRootMap[data.blockRoot];
      if (!cur) {
        cur = {
          weight: 0,
          blockHeight: data.blockHeight,
        };
      }
      cur.weight++;
      this.blockRootMap[data.blockRoot] = cur;
      this.checkToSyncBlock();
    }
  };

  checkToSyncBlock = async () => {
    if (this.syncing) {
      return;
    }
    const blockRoot = await this.chain.blockService.blockRoot.rootCid;
    let curRoots = Object.keys(this.blockRootMap).filter((ele) => {
      return this.blockRootMap[ele].weight >= Slice.minCerdibleWeight;
    });
    curRoots = curRoots.sort((a, b) => {
      return this.blockRootMap[b].weight - this.blockRootMap[a].weight;
    });
    if (curRoots.length > 0) {
      if (curRoots[0] !== blockRoot) {
        this.syncing = true;
        try {
          await this.chain.blockService.syncFromBlockRoot(curRoots[0]);
        } catch (error) {
          message.error('sync block error: ', error);
          this.syncing = false;
        }
        this.syncing = false;
      } else {
        this.chain.consensus.setIsReady(true);
      }
    }
  };

  /**
   * 定时发消息，通知其他节点自己在哪个分片
   */
  private pubSlice = async () => {
    let slicePubData: SlicePubData = {
      ts: Date.now(),
    };
    if (this.chain.consensus.isReady()) {
      slicePubData = {
        ...slicePubData,
        ready: true,
        blockHeight: this.chain.blockService.checkedBlockHeight.toString(),
        blockRoot: this.chain.blockService.blockRoot.rootCid,
      };
    }
    await this.chain.db.pubsub.publish(
      this.slice,
      bytes.fromString(JSON.stringify(slicePubData)),
    );
    await this.refreshCurrPeers();
    setTimeout(() => {
      this.pubSlice();
    }, Slice.pubTimeout);
  };

  /**
   * 检查之前收到广播的节点是否已经长时间不活跃
   */
  private refreshCurrPeers = async () => {
    const keys = [];
    for (const key of this.curPeers.keys()) {
      const keyString = key.toString();
      if (
        Date.now() - (this.curPeers.get(keyString)?.ts || 0) >
        Slice.peerOfflineTimeout
      ) {
        this.curPeers.delete(keyString);
      } else {
        keys.push(keyString);
      }
    }

    // 把活跃的节点列表写到文件，下次冷启动时使用
    const cid = await this.chain.db.dag.put(keys);
    this.chain.db.cache.put(this.slicePeersCacheName, cid.toString());
  };

  private save = () => {
    // 把当前自己的分片信息写入到文件
    this.chain.db.cache.put(this.sliceCacheName, this.slice);
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
