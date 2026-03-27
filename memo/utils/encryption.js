/**
 * MemoSphere Encryption Utility
 * AES-GCM encryption/decryption with per-org keys
 * Provides secure data handling with blind indexes for searchable encryption
 */

class EncryptionManager {
    constructor() {
        this.algorithm = { name: 'AES-GCM', length: 256 };
        this.keyCache = new Map();
    }

    /**
     * Generate a cryptographic key from password and org_id
     */
    async deriveKey(orgId, password = null) {
        const cacheKey = `${orgId}:${password || 'default'}`;

        if (this.keyCache.has(cacheKey)) {
            return this.keyCache.get(cacheKey);
        }

        // Get or generate encryption key material for this org
        const keyMaterial = password ?
            await this.getKeyMaterialFromPassword(password) :
            await this.getOrgKeyMaterial(orgId);

        const key = await window.crypto.subtle.deriveKey({
                name: 'PBKDF2',
                salt: new TextEncoder().encode(`memosphere:${orgId}`),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            this.algorithm,
            false, ['encrypt', 'decrypt']
        );

        this.keyCache.set(cacheKey, key);
        return key;
    }

    /**
     * Get key material from password
     */
    async getKeyMaterialFromPassword(password) {
        return await window.crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password), { name: 'PBKDF2' },
            false, ['deriveKey']
        );
    }

    /**
     * Get or generate org-specific key material
     */
    async getOrgKeyMaterial(orgId) {
        const stored = await this.getStoredKey(orgId);
        if (stored) {
            return await window.crypto.subtle.importKey(
                'raw',
                stored, { name: 'PBKDF2' },
                false, ['deriveKey']
            );
        }

        // Generate new key material
        const keyData = window.crypto.getRandomValues(new Uint8Array(32));
        await this.storeKey(orgId, keyData);

        return await window.crypto.subtle.importKey(
            'raw',
            keyData, { name: 'PBKDF2' },
            false, ['deriveKey']
        );
    }

    /**
     * Store encryption key in chrome.storage.local
     */
    async storeKey(orgId, keyData) {
        const key = `encKey:${orgId}`;
        await chrome.storage.local.set({
            [key]: Array.from(keyData)
        });
    }

    /**
     * Retrieve encryption key from chrome.storage.local
     */
    async getStoredKey(orgId) {
        return new Promise((resolve) => {
            const key = `encKey:${orgId}`;
            chrome.storage.local.get([key], (result) => {
                if (result[key]) {
                    resolve(new Uint8Array(result[key]));
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Encrypt data with AES-GCM
     * Returns: { ciphertext, iv, authTag } in base64
     */
    async encrypt(plaintext, orgId) {
        const key = await this.deriveKey(orgId);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(plaintext);

        const ciphertext = await window.crypto.subtle.encrypt({
                name: 'AES-GCM',
                iv: iv,
                tagLength: 128
            },
            key,
            encodedText
        );

        // Split ciphertext and auth tag
        const ciphertextBytes = new Uint8Array(ciphertext);
        const actualCiphertext = ciphertextBytes.slice(0, -16);
        const authTag = ciphertextBytes.slice(-16);

        return {
            ciphertext: this.arrayBufferToBase64(actualCiphertext),
            iv: this.arrayBufferToBase64(iv),
            authTag: this.arrayBufferToBase64(authTag),
            algorithm: 'AES-GCM-256'
        };
    }

    /**
     * Decrypt data with AES-GCM
     */
    async decrypt(encryptedData, orgId) {
        const key = await this.deriveKey(orgId);

        const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
        const iv = this.base64ToArrayBuffer(encryptedData.iv);
        const authTag = this.base64ToArrayBuffer(encryptedData.authTag);

        // Combine ciphertext and auth tag
        const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
        combined.set(new Uint8Array(ciphertext), 0);
        combined.set(new Uint8Array(authTag), ciphertext.byteLength);

        try {
            const decrypted = await window.crypto.subtle.decrypt({
                    name: 'AES-GCM',
                    iv: new Uint8Array(iv),
                    tagLength: 128
                },
                key,
                combined
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data. Invalid key or corrupted data.');
        }
    }

    /**
     * Create blind index for searchable encryption
     * Uses HMAC-SHA256 to create deterministic hash
     */
    async createBlindIndex(value, orgId) {
        const key = await this.deriveKey(orgId);
        const keyData = await window.crypto.subtle.exportKey('raw', key);

        const hmacKey = await window.crypto.subtle.importKey(
            'raw',
            keyData, { name: 'HMAC', hash: 'SHA-256' },
            false, ['sign']
        );

        const normalized = value.toLowerCase().trim();
        const signature = await window.crypto.subtle.sign(
            'HMAC',
            hmacKey,
            new TextEncoder().encode(normalized)
        );

        // Return first 16 bytes as hex
        return Array.from(new Uint8Array(signature.slice(0, 16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Encrypt object fields selectively
     */
    async encryptObject(obj, orgId, fieldsToEncrypt = []) {
        const result = {...obj };

        for (const field of fieldsToEncrypt) {
            if (obj[field]) {
                result[field] = await this.encrypt(
                    typeof obj[field] === 'string' ? obj[field] : JSON.stringify(obj[field]),
                    orgId
                );

                // Create blind index for searchable fields
                if (typeof obj[field] === 'string') {
                    result[`${field}_index`] = await this.createBlindIndex(obj[field], orgId);
                }
            }
        }

        return result;
    }

    /**
     * Decrypt object fields selectively
     */
    async decryptObject(obj, orgId, fieldsToDecrypt = []) {
        const result = {...obj };

        for (const field of fieldsToDecrypt) {
            if (obj[field] && typeof obj[field] === 'object' && obj[field].ciphertext) {
                const decrypted = await this.decrypt(obj[field], orgId);
                try {
                    result[field] = JSON.parse(decrypted);
                } catch {
                    result[field] = decrypted;
                }
            }
        }

        return result;
    }

    // Helper functions
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
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

// Global instance
const encryptionManager = new EncryptionManager();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.EncryptionManager = EncryptionManager;
    window.encryptionManager = encryptionManager;
}