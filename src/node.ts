import { configMap } from './config/index';
import { SKChain } from './skChain';
import { networkid } from './config/testnet.config';
import { lifecycleEvents, lifecycleStap } from './lib/events/lifecycle';
import type { SKChainOption } from './skChain';
import { createIpfs } from './lib/ipfs/ipfs';
import type { DidJson } from './lib/p2p/did';
import { resolve } from 'path';
import { homedir } from 'os';
import { CreateNodeConfig } from 'index';

const config = configMap.testnet;

// 生成节点的工厂函数
export const create = async (
  cfg: Partial<CreateNodeConfig>,
): Promise<any> => {
  const allCfg = await initCreateOption(cfg);
  lifecycleEvents.emit(lifecycleStap.creatingIpfs);

  const ipfs = await createIpfs({
    did: allCfg.account,
    storePath: allCfg.storePath!,
    network: allCfg.network!,
    networkid,
  });
  const opts: SKChainOption = {
    ...allCfg,
    genesis: config.genesis,
    db: ipfs,
  };
  const skc = new SKChain(opts);
  await skc.init();
  return skc;

  // lifecycleEvents.emit(lifecycleStap.initConfig);
  // const skc = new SKChain(opts);
  // await skc.init();
  // return skc;
};

// 初始化配置项，补充缺省
const initCreateOption = async (
  config: Partial<CreateNodeConfig>,
): Promise<CreateNodeConfig> => {
  config.storePath = config.storePath || {
    main: resolve(homedir(), './.skdb'),
  };
  return {
    networkid: config.networkid || networkid,
    account: config.account as DidJson,
    // 这里merge有问题
    storePath: config.storePath as { main: string },
    network: {
      tcp: config.network?.tcp || 4002,
      ws: config.network?.ws || 4003,
      api: config.network?.api || 6001,
      geteway: config.network?.geteway || 9091,
    },
  };
};
