import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';
import { promisify } from 'util';

// Promisify fs functions for async/await
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

class FilesController {
    static async postUpload(req, res) {
        const token = req.get('X-Token');
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        if (!name || !data) return res.status(400).json({ error: 'Missing required fields' });

        try {
            // Generate a unique file ID and save file to the filesystem
            const fileId = uuidv4();
            const filePath = path.join(__dirname, '../uploads', fileId);
            await writeFileAsync(filePath, data, 'base64');

            // Save file metadata to MongoDB
            const db = dbClient.client.db(dbClient.dbName);
            const fileDocument = {
                _id: fileId,
                name,
                type,
                parentId,
                isPublic,
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await db.collection('files').insertOne(fileDocument);

            res.status(201).json({ id: fileId, name, type, parentId, isPublic });
        } catch (error) {
            console.error('File upload error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async getFile(req, res) {
        const token = req.get('X-Token');
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Missing file ID' });

        try {
            const db = dbClient.client.db(dbClient.dbName);
            const file = await db.collection('files').findOne({ _id: id });
            if (!file) return res.status(404).json({ error: 'File not found' });

            if (file.userId !== userId && !file.isPublic) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            res.status(200).json(file);
        } catch (error) {
            console.error('Get file error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async listFiles(req, res) {
        const token = req.get('X-Token');
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { parentId = 0, limit = 10, offset = 0 } = req.query;
        if (isNaN(limit) || isNaN(offset)) return res.status(400).json({ error: 'Invalid query parameters' });

        try {
            const db = dbClient.client.db(dbClient.dbName);
            const query = {
                parentId: parseInt(parentId, 10),
                $or: [{ userId }, { isPublic: true }],
            };

            const files = await db.collection('files')
                .find(query)
                .skip(parseInt(offset, 10))
                .limit(parseInt(limit, 10))
                .toArray();

            res.status(200).json(files);
        } catch (error) {
            console.error('List files error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export default FilesController;
