import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import hashPassword from '../utils/utils';

const getConnect = async (req, res) => {
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

  try {
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
    const key = `auth_${token}`;
    await redisClient.setex(key, 24 * 60 * 60, user._id.toString());

    return res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getDisconnect = async (req, res) => {
  const token = req.headers['x-token'];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;

  try {
    const result = await redisClient.del(key);

    if (result === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default {
  getConnect,
  getDisconnect,
};
