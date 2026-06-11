const supabase = require('../config/supabaseClient');

module.exports = async function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Bypass for frontend test token
    if (token.startsWith('mock-token-')) {
        const parts = token.replace('mock-token-', '').split('|');
        
        let mockRole, mockId;
        if (parts.length > 1) {
            // New format: mock-token-<role>|<id>
            mockRole = parts[0];
            mockId = parts[1];
        } else {
            // Old format: mock-token-<timestamp>
            // Read user identity from fallback headers sent by the frontend
            mockId = req.header('x-mock-user-id') || 'mock-token-legacy';
            mockRole = req.header('x-mock-user-role') || 'admin';
            console.log(`[Auth] Old mock token detected. Resolved identity from headers: id=${mockId}, role=${mockRole}`);
        }
        
        req.user = { 
            id: mockId, 
            email: 'mock@example.com',
            role: mockRole.toLowerCase() 
        };
        return next();
    }

    // Verify token using Supabase
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            throw new Error('Invalid token');
        }

        // Check if user exists in the profiles table and is active
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('is_active, role')
            .eq('id', user.id)
            .single();

        if (profileErr || !profile) {
            return res.status(401).json({ msg: 'Account has been deleted' });
        }

        if (profile.is_active === false) {
            return res.status(401).json({ msg: 'Account has been deactivated' });
        }

        // Return user object consistent with previous structure (id, email, role)
        req.user = {
            id: user.id,
            email: user.email,
            role: (profile.role || '').toLowerCase(),
        };

        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err.message);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
