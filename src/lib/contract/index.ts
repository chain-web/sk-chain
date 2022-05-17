import { Ipld } from './../ipld/index';
import init, { evaluate } from 'cwjsr';
import { lifecycleEvents, lifecycleStap } from 'lib/events/lifecycle';
import { bytes } from 'multiformats';
import { message } from 'utils/message';
import { Transaction } from 'mate/transaction';

export class Contract {
  constructor() {}

  ready = false;

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
  runFunction = (
    code: Uint8Array,
    trans: Transaction,
    storage: string[],
  ): string => {
    const codeStr = bytes.toString(code);
    let mothed = trans.payload?.mothed;
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
        log: cwjsrSk.log,
      }
    }
    ${codeStr}
    const run = () => {
      ${(() => {
        if (mothed !== 'constructor' && storage[0]) {
          let loadDataCode = `let savedData = JSON.parse('${storage[0]}')`;
          loadDataCode +=  `
          savedData.forEach(ele => {
            __sk__contract[ele.key] = ele.value;
          })
          `
          loadDataCode += `
          __sk__contract.${mothed}(${trans.payload?.args.map(ele => `'${ele}'`).join(',')})
          `
          return loadDataCode;
        }
        return '__sk__contract.__sk__constructor();';
      })()}
      const saves = Object.keys(__sk__contract).map(key => {
        let ele = __sk__contract[key];
        const type = typeof ele;
        if (baseContractKey.includes(key) || type === 'function') {
          return
        }
        // if (type === 'object') {
        //   ele = JSON.stringify(ele);
        // }
        __sk__.log(typeof ele)
        return {
          key,
          type,
          value: ele
        }
      }).filter(ele => !!ele)
      return JSON.stringify(saves);
    };
    run();
    `;
    console.log(runCode);
    let result = evaluate(runCode, BigInt(trans.cuLimit.toString()), {});
    result = result.replace(/(\"$)|(^\")/g, "");
    return result;
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
