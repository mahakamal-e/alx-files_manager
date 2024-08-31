import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
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

// Controller for handling file operations
class FilesController {
  static async postUpload(req, res) {
    const { name, type, parentId, isPublic, data } = req.body;
    const token = req.headers['x-token'];

    try {
      const userId = await getUserId(token);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validation checks
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }

      const validTypes = ['folder', 'file', 'image'];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ error: 'Missing or invalid type' });
      }

      if (type !== 'folder' && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      if (parentId) {
        const parentFile = await dbClient.db.collection('files').findOne({ _id: parentId });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }

        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      // Create a file or folder
      const fileId = uuidv4();
      const newFile = {
        _id: fileId,
        userId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0
      };

      if (type !== 'folder') {
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        const localPath = path.join(folderPath, uuidv4());
        fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
        newFile.localPath = localPath;
      }

      await dbClient.db.collection('files').insertOne(newFile);

      return res.status(201).json(newFile);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default FilesController;
