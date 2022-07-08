import { CreateBrowserNodeConfig } from '../node.browser';

export const checkInitOption = (config: Partial<CreateBrowserNodeConfig>) => {
  if (!config.account?.id || !config.account?.privKey) {
    throw new Error('[sk init config]: shuld provide account, id and privKey');
  }
};
