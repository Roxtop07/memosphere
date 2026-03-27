/**
 * MemoSphere Authentication Manager
 * Handles JWT tokens with org_id claims, secure storage, and token refresh
 */

class AuthManager {
    constructor() {
        this.tokenKey = 'memosphere_jwt';
        this.userKey = 'memosphere_user';
        this.orgKey = 'memosphere_org';
    }

    /**
     * Parse JWT token and extract claims
     */
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Failed to parse JWT:', error);
            return null;
        }
    }

    /**
     * Check if token is expired
     */
    isTokenExpired(token) {
        const payload = this.parseJWT(token);
        if (!payload || !payload.exp) return true;

        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    }

    /**
     * Store authentication data
     */
    async setAuth(token, user, orgId) {
        await chrome.storage.local.set({
            [this.tokenKey]: token,
            [this.userKey]: user,
            [this.orgKey]: orgId
        });
    }

    /**
     * Get current authentication token
     */
    async getToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.tokenKey], (result) => {
                const token = result[this.tokenKey];

                // Check if token is expired
                if (token && this.isTokenExpired(token)) {
                    this.refreshToken().then(resolve).catch(() => resolve(null));
                } else {
                    resolve(token || null);
                }
            });
        });
    }

    /**
     * Get current user data
     */
    async getUser() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.userKey], (result) => {
                resolve(result[this.userKey] || null);
            });
        });
    }

    /**
     * Get current organization ID
     */
    async getOrgId() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.orgKey], (result) => {
                resolve(result[this.orgKey] || null);
            });
        });
    }

    /**
     * Get full auth context
     */
    async getAuthContext() {
        const token = await this.getToken();
        const user = await this.getUser();
        const orgId = await this.getOrgId();

        return {
            token,
            user,
            orgId,
            isAuthenticated: !!token && !!orgId
        };
    }

    /**
     * Login with credentials
     */
    async login(email, password, backendUrl) {
        try {
            const response = await fetch(`${backendUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();
            const { token, user, org_id } = data;

            // Parse JWT to verify org_id claim
            const payload = this.parseJWT(token);
            if (!payload || payload.org_id !== org_id) {
                throw new Error('Invalid token: org_id mismatch');
            }

            await this.setAuth(token, user, org_id);
            return { success: true, user, orgId: org_id };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Refresh expired token
     */
    async refreshToken(backendUrl = 'http://localhost:8000') {
        try {
            const token = await new Promise((resolve) => {
                chrome.storage.local.get([this.tokenKey], (result) => {
                    resolve(result[this.tokenKey]);
                });
            });

            if (!token) throw new Error('No token to refresh');

            const response = await fetch(`${backendUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Token refresh failed');

            const data = await response.json();
            await chrome.storage.local.set({
                [this.tokenKey]: data.token });

            return data.token;
        } catch (error) {
            console.error('Token refresh error:', error);
            await this.logout();
            return null;
        }
    }

    /**
     * Logout and clear all auth data
     */
    async logout() {
        await chrome.storage.local.remove([this.tokenKey, this.userKey, this.orgKey]);
    }

    /**
     * Create authenticated fetch request
     */
    async authenticatedFetch(url, options = {}) {
        const token = await this.getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, {...options, headers });

            // Handle 401 unauthorized - try to refresh token
            if (response.status === 401) {
                const newToken = await this.refreshToken();
                if (newToken) {
                    headers['Authorization'] = `Bearer ${newToken}`;
                    return await fetch(url, {...options, headers });
                }
                throw new Error('Authentication required');
            }

            return response;
        } catch (error) {
            console.error('Authenticated fetch error:', error);
            throw error;
        }
    }

    /**
     * Verify user has access to specific org
     */
    async verifyOrgAccess(requestedOrgId) {
        const currentOrgId = await this.getOrgId();
        return currentOrgId === requestedOrgId;
    }

    /**
     * Get authorization headers for requests
     */
    async getAuthHeaders() {
        const token = await this.getToken();
        const orgId = await this.getOrgId();

        return {
            'Authorization': `Bearer ${token}`,
            'X-Org-ID': orgId,
            'Content-Type': 'application/json'
        };
    }
}

// Global instance
const authManager = new AuthManager();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
    window.authManager = authManager;
}