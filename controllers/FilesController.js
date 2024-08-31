import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import File from '../models/File';
import User from '../models/User';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const postUpload = async (req, res) => {
  try {
    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    const token = req.headers['x-token'];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }
    
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }
    
    if (parentId) {
      const parentFile = await File.findById(parentId);
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    
    let localPath = null;
    if (type !== 'folder') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      await mkdir(folderPath, { recursive: true });
      const fileId = uuidv4();
      localPath = path.join(folderPath, fileId);
      await writeFile(localPath, Buffer.from(data, 'base64'));
    }
    
    const file = new File({
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    });
    
    await file.save();
    
    res.status(201).json(file);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  postUpload,
};
