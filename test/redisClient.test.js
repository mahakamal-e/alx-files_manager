import redisClient from '../utils/redis';
import { expect } from 'chai';

describe('Redis Client', function() {
  it('should connect to Redis', async function() {
    await redisClient.set('test_key', 'test_value');
    const value = await redisClient.get('test_key');
    expect(value).to.equal('test_value');
  });

  it('should delete a key', async function() {
    await redisClient.set('delete_key', 'delete_value');
    await redisClient.del('delete_key');
    const value = await redisClient.get('delete_key');
    expect(value).to.be.null;
  });
});
