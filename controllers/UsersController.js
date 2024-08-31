import crypto from 'crypto';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI; // Make sure to set this environment variable
const client = new MongoClient(uri);
const dbName = 'files_manager';
const collectionName = 'users';

const hashPassword = (password) => {
    return crypto.createHash('sha1').update(password).digest('hex');
};

const postNew = async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
        return res.status(400).json({ error: 'Missing password' });
    }

    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection(collectionName);

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
        res.status(201).json({ id: result.insertedId, email: newUser.email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await client.close();
    }
};

export default {
    postNew,
};
