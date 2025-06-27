/**
 * Client-side encryption utilities for sensitive data
 * Uses Web Crypto API for secure encryption/decryption
 */

interface EncryptedData {
  encryptedData: string;
  iv: string;
  salt: string;
}

class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generates a user-specific encryption key based on user ID
   */
  private static getUserEncryptionPassword(userId: string): string {
    // In production, you might want to use a more sophisticated key derivation
    // that includes server-side secrets or user-specific data
    const baseSecret = import.meta.env.VITE_ENCRYPTION_SECRET || 'default-secret-change-in-production';
    return `${baseSecret}-${userId}`;
  }

  /**
   * Encrypts data using AES-GCM
   */
  static async encrypt(data: string, userId: string): Promise<EncryptedData> {
    if (!crypto.subtle) {
      throw new Error('Web Crypto API not available. HTTPS is required for encryption.');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    // Derive key from user-specific password
    const password = this.getUserEncryptionPassword(userId);
    const key = await this.deriveKey(password, salt);
    
    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      key,
      dataBuffer
    );

    // Convert to base64 for storage
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedData = btoa(String.fromCharCode.apply(null, Array.from(encryptedArray)));
    const ivString = btoa(String.fromCharCode.apply(null, Array.from(iv)));
    const saltString = btoa(String.fromCharCode.apply(null, Array.from(salt)));

    return {
      encryptedData,
      iv: ivString,
      salt: saltString
    };
  }

  /**
   * Decrypts data using AES-GCM
   */
  static async decrypt(encryptedData: EncryptedData, userId: string): Promise<string> {
    if (!crypto.subtle) {
      throw new Error('Web Crypto API not available. HTTPS is required for decryption.');
    }

    try {
      // Convert from base64
      const encryptedArray = new Uint8Array(
        atob(encryptedData.encryptedData).split('').map(char => char.charCodeAt(0))
      );
      const iv = new Uint8Array(
        atob(encryptedData.iv).split('').map(char => char.charCodeAt(0))
      );
      const salt = new Uint8Array(
        atob(encryptedData.salt).split('').map(char => char.charCodeAt(0))
      );

      // Derive the same key
      const password = this.getUserEncryptionPassword(userId);
      const key = await this.deriveKey(password, salt);

      // Decrypt the data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encryptedArray
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data. The data may be corrupted or the key may be incorrect.');
    }
  }

  /**
   * Checks if the current environment supports encryption
   */
  static isEncryptionSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' && 
           typeof crypto.getRandomValues !== 'undefined';
  }

  /**
   * Generates a secure random string for use as encryption keys or tokens
   */
  static generateSecureRandom(length: number = 32): string {
    if (!crypto.getRandomValues) {
      throw new Error('Crypto API not available');
    }

    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

export default EncryptionService; 