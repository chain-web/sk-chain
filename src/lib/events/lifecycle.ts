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
  'initingBlockService' = 'initingBlockService',
  'checkingBlockIndex' = 'checkingBlockIndex',
  'checkedBlockIndex' = 'checkedBlockIndex',
  'initedBlockService' = 'initedBlockService',
  'initingHeaderBlock' = 'initingHeaderBlock',
  'initedHeaderBlock' = 'initedHeaderBlock',
  'initingSlice' = 'initingSlice',
  'initedSlice' = 'initedSlice',
  'initedContract' = 'initedContract',
}

Object.keys(lifecycleStap).forEach((key) => {
  lifecycleEvents.addListener(key, (...data) => {
    message.info('on life cycle: ', key, ...data);
  });
});

// export const lifecycleDetile = {}
