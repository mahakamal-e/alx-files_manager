import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import sha1 from 'sha1';

// Utility function to hash passwords
const hashPwd = (password) => sha1(password);

// Utility function to extract user credentials from Basic Auth header
const getUserCredentials = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { email: null, password: null };
  }

  const base64Credentials = authHeader.split(' ')[1];
  const decodedToken = Buffer.from(base64Credentials, 'base64').toString('ascii');
  if (!decodedToken) {
    return { email: null, password: null };
  }

  const [email, password] = decodedToken.split(':');
  return { email, password };
};

// Utility function to retrieve user ID from Redis
const getUserId = async (tokenFromHeaders) => {
  if (!tokenFromHeaders) {
    return null;
  }

  const redisKey = `auth_${tokenFromHeaders}`;
  const userId = await redisClient.get(redisKey);
  return userId;
};

class AuthController {
  static async getConnect(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const { email, password } = getUserCredentials(authHeader);

      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!dbClient.isAlive()) {
        await dbClient.connect();
      }

      const { db } = dbClient;
      const usersCollection = db.collection('users');
      const hashedPassword = hashPwd(password);
      const user = await usersCollection.findOne({ email, password: hashedPassword });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      const redisKey = `auth_${token}`;
      const dayDuration = 3600 * 24;

      await redisClient.set(redisKey, user._id.toString(), dayDuration);

      return res.status(200).json({ token });
    } catch (err) {
      console.error(err);
      return res.status(500).send('Internal server error');
    }
  }

  static async getDisconnect(req, res) {
    try {
      const token = req.headers['x-token'];
      const redisKey = `auth_${token}`;
      
      const result = await redisClient.del(redisKey);

      if (result === 0) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(204).send('');
    } catch (err) {
      console.error(err);
      return res.status(500).send('Internal server error');
    }
  }
}

export default AuthController;
