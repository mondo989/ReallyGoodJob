const crypto = require('crypto');
const config = require('../config/config');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 128 bits

class EncryptionService {
  constructor() {
    if (!config.ENCRYPTION_KEY || config.ENCRYPTION_KEY.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    this.key = Buffer.from(config.ENCRYPTION_KEY, 'utf8');
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string} text - Plain text to encrypt
   * @returns {string} - Encrypted data as base64 string
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine iv + encrypted data
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {string} encryptedData - Base64 encrypted string
   * @returns {string} - Decrypted plain text
   */
  decrypt(encryptedData) {
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract iv and encrypted data
      const iv = combined.slice(0, IV_LENGTH);
      const encrypted = combined.slice(IV_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt OAuth tokens object
   * @param {Object} tokens - { access_token, refresh_token, expires_at }
   * @returns {string} - Encrypted tokens as base64 string
   */
  encryptTokens(tokens) {
    const tokensJson = JSON.stringify(tokens);
    return this.encrypt(tokensJson);
  }

  /**
   * Decrypt OAuth tokens object
   * @param {string} encryptedTokens - Base64 encrypted tokens
   * @returns {Object} - { access_token, refresh_token, expires_at }
   */
  decryptTokens(encryptedTokens) {
    const tokensJson = this.decrypt(encryptedTokens);
    return JSON.parse(tokensJson);
  }
}

module.exports = new EncryptionService(); 