import { EventBus } from '.';
import { message } from '../../utils/message';

export const lifecycleEvents = new EventBus();

// lifecycleEvents.addListener((name: lifecycleStap) => {})

export enum lifecycleStap {
  'initConfig' = 'initConfig',
  'creatingIpfs' = 'creatingIpfs',
  'startCreateSKChain' = 'startCreateSKChain',
  'checkingGenesisBlock' = 'checkingGenesisBlock',
  'checkedGenesisBlock' = 'checkedGenesisBlock',
  'initingSlice' = 'initingSlice',
  'initedSlice' = 'initedSlice',
  'startFilterPeers' = 'startFilterPeers',
  'filterPeersDone' = 'filterPeersDone',
}

Object.keys(lifecycleStap).forEach((key) => {
  lifecycleEvents.addListener(key, () => {
    message.info('on life cycle: ', key);
  });
});

// export const lifecycleDetile = {}
