import init, { evaluate } from 'cwjsr/web/cwjsr';

let evalFunc: typeof evaluate;

export const getEval = async () => {
  if (!evalFunc) {
    if (init) {
      await (init as any)();
    }
    evalFunc = evaluate;
  }
  return evalFunc;
};
