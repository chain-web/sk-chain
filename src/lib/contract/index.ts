import { Ipld } from './../ipld/index';
import init, { evaluate } from 'cwjsr';
import { lifecycleEvents, lifecycleStap } from 'lib/events/lifecycle';
import { bytes } from 'multiformats';
import { message } from 'utils/message';
import { Transaction } from 'mate/transaction';

export class Contract {
  constructor(ipld: Ipld) {
    this.ipld = ipld;
  }

  ready = false;
  ipld: Ipld;

  public init = async () => {
    // 向智能合约内注入数据查询的方法
    window.__sk__ipld__getAccount = this.ipld.getAccount;
    if (init) {
      await (init as any)();
    }
    this.ready = true;
    lifecycleEvents.emit(lifecycleStap.initedContract);
  };

  /**
   * @description 把 js function 处理成code string后交给runtime去执行
   * @param code [Function] js function
   * @returns
   */
  runFunction = (code: Uint8Array, trans: Transaction): string => {
    const codeStr = bytes.toString(code);
    const runCode = `
    const cwjsrSk = __init__sk__()
    const __sk__ = {
      transMsg: {
        sender: '${trans.from}',
        ts: ${trans.ts}
      },
      constractHelper: {
        createSliceDb: cwjsrSk.createSliceDb,
        hash: cwjsrSk.genHash,
      }
    }
    ${codeStr}
    const run = () => {
      
    };
    run();
    `;
    console.log(runCode);
    return evaluate(runCode, BigInt(trans.cuLimit.toString()), {});
  };

  /**
   * @description 直接把code string交给runtime去执行
   * @param code [Uint8Array] js 代码的字符创
   * @returns
   */
  execCode = (code: Uint8Array) => {
    if (!this.ready) {
      message.error('Contract not ready');
      return;
    }
    // 这里是把js代码字符串给到wasm 的运行时
    // TODO 省去Uint8Array 转 string的过程，直接传递Uint8Array，减少两次解码消耗
    const jscode = bytes.toString(code);
    return evaluate(jscode, 10000n, {});
  };
}
