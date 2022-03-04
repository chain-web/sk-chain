import { DidJson } from '../p2p/did';
import { SKDB } from './ipfs.interface';
import { resolve } from 'path';
import { homedir } from 'os';
import { equal } from 'assert';
import { createIpfs } from './ipfs';
const account: DidJson = {
  id: '12D3KooWL8qb3L8nKPjDtQmJU8jge5Qspsn6YLSBei9MsbTjJDr8',
  privKey:
    'CAESQOu2tC61UCD6utWQpWndm8HSVWxi88P7cP29ydv6iHaOmVBTlFvfBXPpjZJeFi/Ult6HUOcVd9OOkyDg5TDibdk=',
};

export const genTestDb = () =>
  createIpfs({
    did: account,
    storePath: { main: resolve(homedir(), './.skdb') },
    network: { tcp: 3002, ws: 3003, api: 6011, geteway: 9029 },
    networkid: 'testnet',
  });

describe('db', async () => {
  let db: SKDB;
  before(async () => {
    db = await genTestDb();
  });

  after(async () => {
    await db.stop();
  });
  describe('cache', async () => {
    const key = Math.random().toFixed(5);
    it('should db cache put ok', () => {
      db.cache.put(key, key);
    });
    it('should db cache get ok', () => {
      equal(key, db.cache.get(key));
    });
  });

  // describe('when reasonable', function () {
  //   it('should highlight in yellow', function (done) {
  //     setTimeout(function () {
  //       done();
  //     }, 50);
  //   });
  // });
});
