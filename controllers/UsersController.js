import { MongoClient } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import hashPassword from '../utils/utils';

const postNew = async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Missing password' });
  }

  try {
    if (!dbClient.isAlive()) {
      await dbClient.connect();
    }

    const { db } = dbClient;
    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = hashPassword(password);
    const result = await usersCollection.insertOne({ email, password: hashedPassword });

    return res.status(201).json({ id: result.insertedId, email });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getMe = async (req, res) => {
  const token = req.headers['x-token'];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const key = `auth_${token}`;

  try {
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!dbClient.isAlive()) {
      await dbClient.connect();
    }

    const { db } = dbClient;
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: new MongoClient.ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default {
  postNew,
  getMe,
};
