import { configMap } from './config/index';
import { networkidType } from './config/types';
import { SKChain } from './skChain';
import { networkid } from './config/testnet.config';
import { lifecycleEvents, LifecycleStap } from './lib/events/lifecycle';
import type { SKChainOption } from './skChain';
import type { DidJson } from './lib/p2p/did';
import { createIpfs } from './lib/ipfs/ipfs.browser';

export interface CreateBrowserNodeConfig {
  // 网络id
  networkid: networkidType;
  // 账户
  account: DidJson;
}

const config = configMap.testnet;

// 生成节点的工厂函数
export const create = async (
  cfg: Partial<CreateBrowserNodeConfig>,
): Promise<any> => {
  const allCfg = await initCreateOption(cfg);
  lifecycleEvents.emit(LifecycleStap.creatingIpfs);

  const ipfs = await createIpfs({
    did: allCfg.account,
    networkid,
  });
  lifecycleEvents.emit(LifecycleStap.createdIpfs);
  const opts: SKChainOption = {
    ...allCfg,
    genesis: config.genesis,
    db: ipfs,
  };
  lifecycleEvents.emit(LifecycleStap.initConfig);
  const skc = new SKChain(opts);
  await skc.init();
  return skc;

  // const skc = new SKChain(opts);
  // await skc.init();
  // return skc;
};

// 初始化配置项，补充缺省
const initCreateOption = async (
  config: Partial<CreateBrowserNodeConfig>,
): Promise<CreateBrowserNodeConfig> => {
  return {
    networkid: config.networkid || networkid,
    account: config.account as DidJson,
  };
};
