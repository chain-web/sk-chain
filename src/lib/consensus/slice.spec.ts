import { genTestDb } from '../ipfs/db.node.spec';
import { SKDB } from '../ipfs/ipfs.interface';
import { Slice } from './slice';
import { equal } from 'assert';

describe('slice', async () => {
  let db: SKDB;
  let slice: Slice;
  before(async () => {
    db = await genTestDb();
    slice = new Slice(db);
  });

  after(async () => {
    await db.stop();
  });
  describe('gen next slice', () => {
    it('should next slice true', (done) => {
      equal(slice.nextSlice, 'o-l');
      done();
    });
  });

  // describe('when reasonable', function () {
  //   it('should highlight in yellow', function (done) {
  //     setTimeout(function () {
  //       done();
  //     }, 50);
  //   });
  // });

  // describe('when fast', function () {
  //   it('should not highlight', function (done) {
  //     setTimeout(function () {
  //       done();
  //     }, 10);
  //   });
  // });
});
