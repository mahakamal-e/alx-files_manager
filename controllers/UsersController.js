import dbClient from '../utils/db';
import { hashPwd } from '../utils/utils';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      if (await dbClient.getUserByEmail(email)) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const user = await dbClient.addUser({ email, password: hashPwd(password) });

      const { insertedId } = user;

      return res.status(201).json({ id: insertedId, email });
    } catch (err) {
      console.error(err);
      return res.status(500).send('Internal server error');
    }
  }

  static async getMe(req, res) {
    const { user } = req;
    return res.status(200).json(user);
  }
}

export default UsersController;
