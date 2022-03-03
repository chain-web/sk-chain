import * as mainConfig from './mainnet.config';
import * as testConfig from './testnet.config';
export const configMap = {
  mainnet: mainConfig,
  testnet: testConfig,
};

// export const isBrowser = (() => {
//   try {
//     window.navigator;
//     return true;
//   } catch (error) {
//     return false;
//   }
// })();
