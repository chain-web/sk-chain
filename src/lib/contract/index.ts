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
    let mothed = trans.payload?.mothed;
    console.log(trans.payload);
    if (mothed === 'constructor') {
      mothed = '__sk__constructor';
    }
    console.log(mothed);
    const runCode = `
    const baseContractKey = ['msg']
    const cwjsrSk = __init__sk__()
    const __sk__ = {
      log: cwjsrSk.log,
      transMsg: {
        sender: '${trans.from}',
        ts: ${trans.ts}
      },
      constractHelper: {
        createSliceDb: () => new Map(),
        hash: cwjsrSk.genHash,
      }
    }
    ${codeStr}
    const run = () => {
      __sk__contract.${mothed}();
      const saves = Object.keys(__sk__contract).map(key => {
        let ele = __sk__contract[key];
        const type = typeof ele;
        if (baseContractKey.includes(key) || type === 'function') {
          return
        }
        if (type === 'object') {
          ele = JSON.stringify(ele);
        }
        __sk__.log(typeof ele)
        return {
          key,
          type,
          value: ele
        }
      }).filter(ele => !!ele)
      return saves;
    };
    run();
    `;
    // console.log(runCode);
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
