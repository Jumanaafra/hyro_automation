const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hyro_automation',
  JWT_SECRET: process.env.JWT_SECRET || 'hyro_super_secret_jwt_key_2026_production_grade',
  CREDENTIAL_ENCRYPTION_KEY: process.env.CREDENTIAL_ENCRYPTION_KEY || 'hyro_32_byte_secret_credential_enc_key_2026!',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  JWT_EXPIRES_IN: '7d'
};
