import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

// Hashing function for passwords
const hashPassword = (password) => {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
};

class AuthController {
  static async getConnect(req, res) {
    try {
      // Extract Basic Auth credentials
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const base64Credentials = authHeader.replace('Basic ', '');
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8').split(':');
      const email = credentials[0];
      const password = credentials[1];

      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!dbClient.isAlive()) {
        await dbClient.connect();
      }

      const { db } = dbClient;
      const usersCollection = db.collection('users');
      const hashedPassword = hashPassword(password);
      const user = await usersCollection.findOne({ email, password: hashedPassword });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const redisKey = `auth_${token}`;
      const dayDuration = 3600 * 24; // 24 hours

      // Set the token in Redis with an expiration time
      await redisClient.set(redisKey, user._id.toString(), 'EX', dayDuration);

      return res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getDisconnect(req, res) {
    try {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const redisKey = `auth_${token}`;

      // Delete the token from Redis
      const result = await redisClient.del(redisKey);

      if (result === 0) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AuthController;
