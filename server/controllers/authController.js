const supabase = require('../config/supabaseClient');
const fs = require('fs');
const path = require('path');
const emailService = require('../utils/emailService');

const MOCK_USERS_FILE = path.join(__dirname, 'mockUsers.json');

// Initialize mock users from file or empty array
let globalMockedUsers = [];
try {
    if (fs.existsSync(MOCK_USERS_FILE)) {
        globalMockedUsers = JSON.parse(fs.readFileSync(MOCK_USERS_FILE, 'utf-8'));
    }
} catch (err) {
    console.error('Error loading mock users:', err);
}

const saveMockUsers = () => {
    try {
        fs.writeFileSync(MOCK_USERS_FILE, JSON.stringify(globalMockedUsers, null, 2));
    } catch (err) {
        console.error('Error saving mock users:', err);
    }
};

exports.register = async (req, res) => {
    let { name, email, password, role } = req.body;

    let roleToSave = role || 'customer';

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: roleToSave,
                    is_active: true
                }
            }
        });

        if (authError) {
            if (authError.message.includes('rate limit')) {
                console.warn('Supabase rate limit hit. Falling back to persistent file mock so UI works.');
                const mockUser = {
                    id: `mock-${Date.now()}`,
                    email,
                    fullName: name,
                    role: roleToSave,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    _isMocked: true
                };
                globalMockedUsers.push(mockUser);
                saveMockUsers();

                return res.status(201).json({
                    msg: 'User created (Mocked due to Supabase Rate Limit)',
                    user: mockUser
                });
            }
            return res.status(400).json({ msg: authError.message });
        }

        if (authData?.user?.id) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ role: roleToSave, is_active: true })
                .eq('id', authData.user.id);

            if (profileError) {
                console.warn("Could not update role directly after signup:", profileError.message);
            }
            
            // Fire welcome email via internal Nodemailer SMTP Service
            try {
                await emailService.sendWelcomeEmail(email, name);
            } catch (err) {
                console.error("Failed to send welcome email:", err);
            }
        }

        res.status(201).json({
            msg: 'User created successfully',
            user: authData.user,
            session: authData?.session || null
        });

    } catch (err) {
        console.error('Error in user registration:', err.message);
        res.status(500).send('Server error');
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const mockUser = globalMockedUsers.find(u => u.email === email);

    if (mockUser) {
        return res.json({
            msg: 'Logged in as mock user',
            user: mockUser,
            token: `mock-token-${mockUser.role}|${mockUser.id}`
        });
    }

    res.status(400).json({ msg: 'Please use Supabase Auth on client side for login' });
};

exports.getUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        const combinedData = [...data, ...globalMockedUsers];

        res.json(combinedData);
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({ msg: 'Server error', details: err.message, stack: err.stack });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id.startsWith('mock-')) {
            globalMockedUsers = globalMockedUsers.filter(u => u.id !== req.params.id);
            saveMockUsers();
            return res.json({ msg: 'Mock user removed' });
        }

        let { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            console.error('Supabase delete error:', error);
            if (error.code === '23503') {
                try {
                    // Pre-emptively nullify referencing columns to simulate SET NULL cascade
                    await supabase.from('inventory_logs').update({ user_id: null }).eq('user_id', req.params.id);
                    await supabase.from('purchase_orders').update({ created_by: null }).eq('created_by', req.params.id);
                    await supabase.from('suppliers').update({ user_id: null }).eq('user_id', req.params.id);
                    await supabase.from('sales').update({ soldBy: null }).eq('soldBy', req.params.id);
                    await supabase.from('repairs').update({ receivedBy: null }).eq('receivedBy', req.params.id);
                    await supabase.from('repairs').update({ assignedTo: null }).eq('assignedTo', req.params.id);
                    await supabase.from('repairs').update({ customer_id: null }).eq('customer_id', req.params.id);
                    
                    // Retry deletion
                    const retry = await supabase.from('profiles').delete().eq('id', req.params.id);
                    if (retry.error) throw retry.error;
                    error = null;
                } catch (cascadeErr) {
                    console.error('Cascade cleanup failed:', cascadeErr);
                    return res.status(400).json({ msg: 'Cannot delete user because they are strictly associated with other records (e.g. suppliers, inventory, sales). Please deactivate the user instead.' });
                }
            }
            if (error) throw error;
        }
        res.json({ msg: 'User removed from profiles' });

    } catch (err) {
        console.error('Error deleting user details:', err);
        res.status(500).json({ msg: 'Server error', error: err });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { name, role, isActive } = req.body;

        if (req.params.id.startsWith('mock-')) {
            const mockIndex = globalMockedUsers.findIndex(u => u.id === req.params.id);
            if (mockIndex !== -1) {
                globalMockedUsers[mockIndex] = {
                    ...globalMockedUsers[mockIndex],
                    fullName: name !== undefined ? name : globalMockedUsers[mockIndex].fullName,
                    role: role !== undefined ? role : globalMockedUsers[mockIndex].role,
                    is_active: isActive !== undefined ? isActive : globalMockedUsers[mockIndex].is_active
                };
                saveMockUsers();
            }
            return res.json({ msg: 'Mock user updated successfully', user: globalMockedUsers[mockIndex] });
        }

        let updatePayload = {};
        if (name !== undefined) updatePayload.fullName = name;
        if (role !== undefined) updatePayload.role = role;
        if (isActive !== undefined) updatePayload.is_active = isActive;

        if (Object.keys(updatePayload).length > 0) {
            const { data, error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', req.params.id)
                .select();

            if (error) throw error;
            return res.json({ msg: 'User updated successfully', user: data ? data[0] : null });
        }
        res.json({ msg: 'No fields updated' });
    } catch (err) {
        console.error('Error updating user:', err.message);
        res.status(500).json({ msg: 'Server error', details: err.message });
    }
};
