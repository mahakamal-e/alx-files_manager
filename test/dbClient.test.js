import dbClient from '../utils/db';
import { expect } from 'chai';

describe('DB Client', function() {
  before(async function() {
    await dbClient.connect();
  });

  it('should connect to MongoDB', async function() {
    const { db } = dbClient;
    expect(db).to.not.be.null;
  });

  after(async function() {
    await dbClient.close();
  });
});
