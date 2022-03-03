/* eslint-disable no-console */

type BaseSKMessageFunc = (...msg: any[]) => void;

export class SKMessage {
  constructor(opts?: Partial<Record<'info' | 'error', BaseSKMessageFunc>>) {
    this.info = opts?.info || SKMessage.defaultInfo;
    this.error = opts?.error || SKMessage.defaultError;
  }
  info: BaseSKMessageFunc;
  error: BaseSKMessageFunc;

  static logger = console.log;
  static error = console.error;

  static defaultInfo: BaseSKMessageFunc = (...msg) => {
    SKMessage.logger(...msg);
  };
  static defaultError: BaseSKMessageFunc = (...msg) => {
    SKMessage.error(...msg);
  };
}

export const message = new SKMessage();
