import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['x-auth-token'] = token;

            // For old-format mock tokens (mock-token-<timestamp>, no | separator),
            // the token doesn't encode role/id. Send them as fallback headers
            // so the backend can still identify the user without a forced re-login.
            const isOldMockToken = token.startsWith('mock-token-') && !token.includes('|');
            if (isOldMockToken) {
                try {
                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                    if (user.id) config.headers['x-mock-user-id'] = user.id;
                    if (user.role) config.headers['x-mock-user-role'] = user.role;
                } catch (_) { /* ignore parse errors */ }
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
