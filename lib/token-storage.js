/**
 * Secure Token Storage - Encrypts tokens in localStorage
 * Uses Web Crypto API with a device-specific key
 */

class TokenStorage {
  constructor() {
    this.keyName = 'pensine-encryption-key';
    this.tokenName = 'pensine-encrypted-token';
    this.key = null;
  }

  /**
   * Initialize or retrieve encryption key
   * Key is stored in localStorage but never leaves the device
   */
  async getOrCreateKey() {
    if (this.key) return this.key;

    // Try to get existing key
    const storedKey = localStorage.getItem(this.keyName);

    if (storedKey) {
      // Import existing key
      const keyData = this.base64ToArrayBuffer(storedKey);
      this.key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );
    } else {
      // Generate new key
      this.key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Store key
      const exportedKey = await crypto.subtle.exportKey('raw', this.key);
      localStorage.setItem(this.keyName, this.arrayBufferToBase64(exportedKey));
    }

    return this.key;
  }

  /**
   * Encrypt and store token
   * @param {string} token - GitHub token to encrypt
   */
  async saveToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    const key = await this.getOrCreateKey();

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt token
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(token)
    );

    // Store encrypted data with IV
    const encryptedData = {
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(encrypted)
    };

    localStorage.setItem(this.tokenName, JSON.stringify(encryptedData));

    console.log('✅ Token encrypted and saved to localStorage');
  }

  /**
   * Decrypt and retrieve token
   * @returns {Promise<string|null>} Decrypted token or null if not found
   */
  async getToken() {
    const stored = localStorage.getItem(this.tokenName);
    if (!stored) {
      return null;
    }

    try {
      const key = await this.getOrCreateKey();
      const encryptedData = JSON.parse(stored);

      // Decrypt token
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const data = this.base64ToArrayBuffer(encryptedData.data);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Error decrypting token:', error);
      return null;
    }
  }

  /**
   * Remove token from localStorage
   */
  removeToken() {
    localStorage.removeItem(this.tokenName);
    console.log('✅ Token removed from localStorage');
  }

  /**
   * Clear all encryption data (including key)
   * WARNING: This will make existing encrypted tokens unrecoverable
   */
  clearAll() {
    localStorage.removeItem(this.tokenName);
    localStorage.removeItem(this.keyName);
    this.key = null;
    console.log('✅ All encryption data cleared');
  }

  // Helper functions for base64 conversion
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Export as global singleton
window.tokenStorage = new TokenStorage();
