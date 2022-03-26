/* eslint-disable no-console */
import * as packageJson from '../../package.json'

type BaseSKMessageFunc = (...msg: any[]) => void;

export class SKMessage {
  constructor(opts?: Partial<Record<'info' | 'error', BaseSKMessageFunc>>) {
    this.info = opts?.info || SKMessage.defaultInfo;
    this.error = opts?.error || SKMessage.defaultError;
  }
  info: BaseSKMessageFunc;
  error: BaseSKMessageFunc;

  static logger = (...msg: any) => {
    console.log(`sk-v${packageJson.version}:`, ...msg)
  };
  static error = (...msg: any) => {
    console.error(`sk-v${packageJson.version}:`, ...msg)
  };;

  static defaultInfo: BaseSKMessageFunc = (...msg) => {
    SKMessage.logger(...msg);
  };
  static defaultError: BaseSKMessageFunc = (...msg) => {
    SKMessage.error(...msg);
  };
}

export const message = new SKMessage();
