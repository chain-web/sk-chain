import { getEval } from './cwjsr/node';
import { evaluate } from 'cwjsr';
import { bytes } from 'multiformats';
import { SliceKeyType } from '../../utils/contractHelper';
import { Transaction } from '../../mate/transaction';
import { message } from '../../utils/message';
import { lifecycleEvents, LifecycleStap } from '../events/lifecycle';

export interface ContractResult {
  saves: ContractResultSaveItem[];
  funcReturn: any;
}

export interface ContractResultSaveItem {
  key: string;
  value: { [key: string]: any };
  type: 'object' | 'sk_slice_db';
  keyType?: SliceKeyType;
}

export class Contract {
  constructor() {}

  ready = false;
  evaluate!: typeof evaluate;

  public init = async () => {
    const evalFunc = await getEval();
    this.evaluate = evalFunc;
    this.ready = true;
    lifecycleEvents.emit(LifecycleStap.initedContract);
  };

  /**
   * @description 把 js function 处理成code string后交给runtime去执行
   * @param code [Function] js function
   * @returns
   */
  runFunction = (
    code: Uint8Array,
    trans: Transaction,
    storage: string,
  ): ContractResult => {
    const codeStr = bytes.toString(code);
    let mothed = trans.payload?.mothed;
    const runCode = `
    const baseContractKey = ['msg']
    const cwjsrSk = __init__sk__()
    const __sk__ = {
      log: cwjsrSk.log,
      transMsg: {
        sender: {did: '${trans.from.did}'},
        ts: ${trans.ts}
      },
      constractHelper: {
        createSliceDb: (keyType) => {
          return {
            get (key) {
              return this.data[key];
            },
            set (key, val) {
              this.data[key] = val;
            },
            delete (key) {
              delete this.data[key];
            },
            data: {},
            type: 'sk_slice_db',
            keyType: keyType
          }
        },
        hash: cwjsrSk.genRawHash,
        log: cwjsrSk.log,
      }
    }
    ${codeStr}
    const run = () => {
      let funcReturn;
      ${(() => {
        if (mothed !== 'constructor' && storage) {
          let loadDataCode = `let savedData = JSON.parse('${storage}')`;
          loadDataCode += `
          savedData.forEach(ele => {
            if (ele.type === 'sk_slice_db') {
              __sk__contract[ele.key] = __sk__.constractHelper.createSliceDb(ele.keyType);
              __sk__contract[ele.key].data = ele.value;
            } else {
              __sk__contract[ele.key] = ele.value;
            }
          })
          `;
          loadDataCode += `
          funcReturn = __sk__contract.${mothed}(${trans.payload?.args
            .map((ele) => `'${ele}'`)
            .join(',')})
          `;
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
        if (type === 'object' && ele.type === 'sk_slice_db') {
          return {
            key: key,
            value: ele.data,
            type: 'sk_slice_db',
            keyType: ele.keyType
          }
        }
        return {
          key,
          type,
          value: ele
        }
      }).filter(ele => !!ele)
      return JSON.stringify({saves, funcReturn});
    };
    run();
    `;
    console.log(runCode);
    let result = this.evaluate(runCode, BigInt(trans.cuLimit.toString()), {});
    result = result.replace(/(\"$)|(^\")/g, '');
    return JSON.parse(result);
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
    return this.evaluate(jscode, 10000n, {});
  };
}
