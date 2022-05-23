import type { BitSet } from 'bitset';
import bs from 'bitset';
import { murmurhash3_32_gc } from './murmur3';

export class Bloom {
  constructor(buckets: number = 1000, hashes: number = 5) {
    this.numBuckets = buckets;
    this.numHashes = hashes;
    this.bitVector = new bs(this.numBuckets);
  }
  numBuckets: number;
  numHashes: number;
  bitVector: BitSet;

  hashify = (
    value: string,
    operator: (i: number, bitVector: BitSet) => void,
  ) => {
    // We can calculate many hash values from only a few actual hashes, using the method
    // described here: https://www.eecs.harvard.edu/~michaelm/postscripts/tr-02-05.pdf
    const hash1 = murmurhash3_32_gc(value, 0);
    const hash2 = murmurhash3_32_gc(value, hash1);

    // Generate indexes using the function:
    // h_i(x) = (h1(x) + i * h2(x)) % numBuckets
    for (let i = 0; i < this.numHashes; i++) {
      const index = Math.abs((hash1 + i * hash2) % this.numBuckets);
      operator(index, this.bitVector);
    }
  };

  add = (value: string) => {
    this.hashify(String(value), (index, bitVector) => {
      bitVector.set(index, 1);
    });
  };

  contains = (value: string) => {
    let result = true;

    this.hashify(String(value), (index, bitVector) => {
      if (!bitVector.get(index)) {
        result = false;
      }
    });

    return result;
  };

  getData = () => {
    return this.bitVector.toString();
  };

  loadData = (data: string) => {
    this.bitVector = new bs(data);
  };
}

/**
 * Estimate the false positive rate for a given set of usage parameters
 * @param numValues The number of unique values in the set to be added to the filter.
 * @param numBuckets The number of unique buckets (bits) in the filter
 * @param numHashes The number of hashes to use.
 * @return Estimated false positive percentage as a float.
 */
export const estimateFalsePositiveRate = (
  numValues: number,
  numBuckets: number,
  numHashes: number,
) => {
  // Formula for false positives is (1-e^(-kn/m))^k
  // k - number of hashes
  // n - number of set entries
  // m - number of buckets
  var expectedFalsePositivesRate = Math.pow(
    1 - Math.exp((-numHashes * numValues) / numBuckets),
    numHashes,
  );

  return expectedFalsePositivesRate;
};
