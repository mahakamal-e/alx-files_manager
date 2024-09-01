import { MongoClient } from 'mongodb';
import crypto from 'crypto';

const url = 'mongodb://localhost:27017';
const dbName = 'files_manager';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

const hashPassword = (password) => {
  const hash = crypto.createHash('sha256');
  hash.update(password);
  return hash.digest('hex');
};

const addUser = async () => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    const email = 'bob@dylan.com';
    const password = 'toto1234!';
    const hashedPassword = hashPassword(password);

    await usersCollection.insertOne({ email, password: hashedPassword });

    console.log('User added');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
};

addUser();
