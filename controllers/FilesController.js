import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import { Base64 } from 'js-base64';

const url = process.env.DB_URL; // Your MongoDB connection string
const dbName = process.env.DB_NAME || 'files_manager'; // Database name

class FilesController {
  static async postUpload(req, res) {
    const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
      await client.connect();
      const db = client.db(dbName);
      const filesCollection = db.collection('files');
      const usersCollection = db.collection('users');

      const { name, type, parentId = '0', isPublic = false, data } = req.body;
      const userId = req.userId; // Assuming you've set userId based on the token

      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });

      if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

      let parentFile = null;
      if (parentId !== '0') {
        parentFile = await filesCollection.findOne({ _id: ObjectId(parentId) });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
      }

      const fileData = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId === '0' ? '0' : ObjectId(parentId),
      };

      if (type === 'folder') {
        const result = await filesCollection.insertOne(fileData);
        return res.status(201).json(result.ops[0]);
      }

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const localPath = path.join(folderPath, uuidv4());
      fs.writeFileSync(localPath, Base64.decode(data));

      fileData.localPath = localPath;
      const result = await filesCollection.insertOne(fileData);

      return res.status(201).json(result.ops[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      await client.close();
    }
  }
}

export default FilesController;
