import crypto from 'crypto';

const hashPassword = (password) => crypto.createHash('sha1').update(password).digest('hex');

export default hashPassword;
