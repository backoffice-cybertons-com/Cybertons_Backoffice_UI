/**
 * FILE: secureStorage.js
 * LOCATION: src/utils/secureStorage.js
 * CREATED: 2026-02-04
 * AUTHOR: Antigravity AI
 * 
 * DESCRIPTION:
 * Provides encrypted storage for sensitive data (like auth tokens) in localStorage.
 * Uses AES-256 encryption via crypto-js to prevent token theft from DevTools.
 * 
 * DEPENDENCIES:
 * - crypto-js: For AES encryption/decryption
 * 
 * METHODS:
 * - initKey(userId): Initialize encryption key unique to user & session
 * - setSecure(key, value): Save encrypted data
 * - getSecure(key): Read encrypted data
 * - setPlain(key, value): Save plain data (non-sensitive)
 * - getPlain(key): Read plain data
 * - clear(): Clear all storage on logout
 */

import CryptoJS from 'crypto-js';

class SecureStorage {
    constructor() {
        this.key = null; // Encryption key (set at login)
    }
    
    /**
     * Initialize encryption key
     * MUST be called after login before using setSecure/getSecure
     * 
     * @param {string|number} userId - User ID used to salt the key
     */
    initKey(userId) {
        // Generate unique key using:
        // - User ID (unique per user)
        // - Current timestamp (unique per session)
        // - Secret salt (fallback to default if env var missing)
        const timestamp = Date.now();
        const salt = process.env.REACT_APP_SECRET_SALT || 'softbook-secure-salt';
        
        // Create SHA-256 hash as encryption key
        this.key = CryptoJS.SHA256(
            userId + timestamp + salt
        ).toString();
        
        // Save timestamp for key regeneration during session
        sessionStorage.setItem('keyHint', timestamp);
        // Save userId for key regeneration (in session storage, cleared on close)
        sessionStorage.setItem('userHint', userId);
    }

    /**
     * Try to restore key from session storage (e.g. after page refresh)
     * @returns {boolean} True if key restored, False if login needed
     */
    restoreKey() {
        if (this.key) return true;

        const timestamp = sessionStorage.getItem('keyHint');
        const userId = sessionStorage.getItem('userHint');
        
        if (timestamp && userId) {
            const salt = process.env.REACT_APP_SECRET_SALT || 'softbook-secure-salt';
            this.key = CryptoJS.SHA256(
                userId + timestamp + salt
            ).toString();
            return true;
        }
        return false;
    }
    
    /**
     * Save data with encryption
     * 
     * @param {string} key - Storage key
     * @param {string} value - Value to encrypt and save
     */
    setSecure(key, value) {
        // Ensure key is available
        if (!this.key && !this.restoreKey()) {
            console.warn('SecureStorage: Key not initialized. Call initKey() first.');
            return;
        }
        
        try {
            // Encrypt value using AES-256
            const encrypted = CryptoJS.AES.encrypt(value, this.key).toString();
            // Save encrypted value to localStorage
            localStorage.setItem(key, encrypted);
        } catch (error) {
            console.error('SecureStorage: Encryption failed', error);
        }
    }
    
    /**
     * Read encrypted data
     * 
     * @param {string} key - Storage key
     * @returns {string|null} Decrypted value or null if not found
     */
    getSecure(key) {
        // Ensure key is available
        if (!this.key && !this.restoreKey()) {
            return null;
        }
        
        // Get encrypted value from localStorage
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        
        try {
            // Decrypt value
            const decrypted = CryptoJS.AES.decrypt(encrypted, this.key);
            // Convert to string
            const str = decrypted.toString(CryptoJS.enc.Utf8);
            return str || null;
        } catch (error) {
            console.error('SecureStorage: Decryption failed', error);
            return null;
        }
    }
    
    /**
     * Save plain (unencrypted) data
     * USE ONLY for non-sensitive data (theme, language)
     */
    setPlain(key, value) {
        localStorage.setItem(key, value);
    }
    
    /**
     * Read plain data
     */
    getPlain(key) {
        return localStorage.getItem(key);
    }
    
    /**
     * Clear all storage
     * CALL on logout to remove all data
     */
    clear() {
        localStorage.clear();
        sessionStorage.clear();
        this.key = null;
    }
}

// Export singleton instance
export default new SecureStorage();
