import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const authorization = req.header('Authorization').split(' ')[1];
    const credentials = Buffer.from(authorization, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');
    const collection = dbClient.client.db().collection('users');
    const hashPassword = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex');
    const findUser = await collection
      .find({
        email,
        password: hashPassword,
      })
      .toArray();
    if (!findUser) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    const token = uuidv4();

    redisClient.set(`auth_${token}`, findUser[0]._id.toString(), 86400);

    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    redisClient.del(token);
    return res.status(204).send();
  }
}

export default AuthController;
