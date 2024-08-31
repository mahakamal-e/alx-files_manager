import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

const AppController = {
    async getStatus(req, res) {
        try {
            const redisAlive = redisClient.isAlive();
            const dbAlive = dbClient.isAlive();

            res.status(200).json({ redis: redisAlive, db: dbAlive });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    async getStats(req, res) {
        try {
            const usersCount = await dbClient.nbUsers();
            const filesCount = await dbClient.nbFiles();

            res.status(200).json({ users: usersCount, files: filesCount });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

export default AppController;
