import crypto from 'crypto';
import dbClient from '../utils/db'; // Import the DBClient instance

const hashPassword = (password) => crypto.createHash('sha1').update(password).digest('hex');

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
      await dbClient.connect(); // Ensure connection is established
    }

    const { db } = dbClient;
    const usersCollection = db.collection('users');

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Create new user
    const hashedPassword = hashPassword(password);
    const newUser = { email, password: hashedPassword };
    const result = await usersCollection.insertOne(newUser);

    // Respond with the new user
    return res.status(201).json({ id: result.insertedId, email: newUser.email });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default {
  postNew,
};
