import { equal } from 'assert';
import { TransactionAction } from '../../transaction';
import { BloomFilter } from './bloomFilter';

describe('BloomFilter', async () => {
  let bloomFilter: BloomFilter;
  before(async () => {
    bloomFilter = new BloomFilter();
  });
  describe('test', async () => {
    it('should add and has ok', () => {
      const allCount = TransactionAction.MAX_TRANS_LIMIT;
      for (let i = 0; i < allCount; i++) {
        const key = Math.random().toFixed(5);
        bloomFilter.add(key);
        equal(bloomFilter.contains(key), true);
      }
    });

    it('should has error reta ok', () => {
      const allCount = 10000;
      let errorCount = 0;

      for (let i = 0; i < allCount; i++) {
        const key = Math.random().toFixed(5);
        const has = bloomFilter.contains(key);
        if (has) {
          errorCount++;
        }
      }
      console.log('error rate: ', errorCount / allCount);
      equal(errorCount / allCount < 0.01, true);
    });
  });
});
