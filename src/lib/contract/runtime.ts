import { evaluate } from 'cwjsr';
import { bytes } from 'multiformats';

export const execCode = (code: Uint8Array) => {
  // 这里是把js代码字符串给到wasm 的运行时
  // TODO 省去Uint8Array 转 string的过程，直接传递Uint8Array，减少两次解码消耗
  const jscode = bytes.toString(code);
  evaluate(jscode);
};
