const supabase = require('../config/supabaseClient');
const crypto = require('crypto');

// @desc    Create a new repair ticket
// @route   POST /api/repairs
// @access  Private/Admin
exports.createRepair = async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            deviceModel,
            issueDescription,
            status,
            estimatedCost,
            assignedTo,
            notes,
            customer_id,
            device_id,
            // Form fields (used when customer_id/device_id were 'new' and resolved)
            newCustomerName,
            newCustomerPhone,
            newDeviceModel
        } = req.body;

        // Resolve display values: prefer resolved FK text, fallback to new* fields, fallback to direct fields
        const resolvedCustomerName = customerName || newCustomerName || 'Unknown';
        const resolvedCustomerPhone = customerPhone || newCustomerPhone || '';
        const resolvedDeviceModel = deviceModel || newDeviceModel || 'Unknown';

        // assignedTo: store as text in notes-combined field; DB column is UUID so we set it null if not a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const assignedToValue = assignedTo && uuidRegex.test(assignedTo) ? assignedTo : null;
        // Store technician name in notes if it's not a UUID
        const technicianNote = assignedTo && !uuidRegex.test(assignedTo) ? `Technician: ${assignedTo}` : '';
        const combinedNotes = [notes || '', technicianNote].filter(Boolean).join(' | ');

        const { data: repair, error } = await supabase
            .from('repairs')
            .insert([{
                id: crypto.randomUUID(),
                "customerName": resolvedCustomerName,
                "customerPhone": resolvedCustomerPhone,
                "deviceModel": resolvedDeviceModel,
                customer_id: customer_id && customer_id !== 'new' ? customer_id : null,
                device_id: device_id && device_id !== 'new' ? device_id : null,
                "issueDescription": issueDescription,
                status: status || 'pending',
                "estimatedCost": estimatedCost || 0,
                "receivedBy": req.user?.id || null,
                "assignedTo": assignedToValue,
                notes: combinedNotes
            }])
            .select();

        if (error) throw error;

        if (repair && repair.length > 0) {
            repair[0]._id = repair[0].id;
            res.status(201).json(repair[0]);
        } else {
            res.status(500).send('Failed to insert repair: no rows returned');
        }
    } catch (err) {
        console.error('Error creating repair:', err);
        res.status(500).json({ msg: 'Server Error', details: err.message });
    }
};

// @desc    Get all repair tickets
// @route   GET /api/repairs
// @access  Private/Admin
exports.getRepairs = async (req, res) => {
    try {
        let query = supabase
            .from('repairs')
            .select('*, customers(name, phone), devices(model)')
            .order('created_at', { ascending: false });

        if (req.query.status && req.query.status !== 'all') {
            query = query.eq('status', req.query.status);
        }

        const { data: repairs, error } = await query;

        if (error) throw error;

        // Map id to _id for frontend compatibility
        const mappedRepairs = repairs.map(r => ({ ...r, _id: r.id }));
        res.json(mappedRepairs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get repair by ID
// @route   GET /api/repairs/:id
// @access  Private/Admin
exports.getRepairById = async (req, res) => {
    try {
        const { data: repair, error } = await supabase
            .from('repairs')
            .select('*, customers(name, phone), devices(model)')
            .eq('id', req.params.id)
            .single();

        if (error) {
            return res.status(404).json({ msg: 'Repair ticket not found' });
        }

        repair._id = repair.id;
        res.json(repair);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Update a repair ticket
// @route   PUT /api/repairs/:id
// @access  Private/Admin
exports.updateRepair = async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            deviceModel,
            issueDescription,
            status,
            estimatedCost,
            finalCost,
            assignedTo,
            notes,
            customer_id,
            device_id,
            newCustomerName,
            newCustomerPhone,
            newDeviceModel
        } = req.body;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const assignedToValue = assignedTo && uuidRegex.test(assignedTo) ? assignedTo : null;
        const technicianNote = assignedTo && !uuidRegex.test(assignedTo) ? `Technician: ${assignedTo}` : '';

        const updateFields = {};
        if (customerName || newCustomerName) updateFields.customerName = customerName || newCustomerName;
        if (customerPhone || newCustomerPhone) updateFields.customerPhone = customerPhone || newCustomerPhone;
        if (deviceModel || newDeviceModel) updateFields.deviceModel = deviceModel || newDeviceModel;
        if (issueDescription) updateFields.issueDescription = issueDescription;
        if (status) updateFields.status = status;
        if (estimatedCost !== undefined) updateFields.estimatedCost = estimatedCost;
        if (finalCost !== undefined) updateFields.finalCost = finalCost;
        const { data: oldRepair } = await supabase.from('repairs').select('status, notes').eq('id', req.params.id).single();
        const wasAlreadyCompleted = oldRepair && oldRepair.status === 'completed';

        // Always set assignedTo (can be null to clear it)
        updateFields.assignedTo = assignedToValue;
        
        // Combine notes with technician name. If no new technician is assigned, preserve the old mock technician note if it exists
        let finalTechnicianNote = technicianNote;
        if (!finalTechnicianNote && oldRepair && oldRepair.notes && oldRepair.notes.includes('Technician: mock-')) {
            const match = oldRepair.notes.match(/Technician:\s*(mock-[^|]+)/);
            if (match) finalTechnicianNote = `Technician: ${match[1].trim()}`;
        }
        
        const combinedNotes = [notes || '', finalTechnicianNote].filter(Boolean).join(' | ');
        if (notes !== undefined || finalTechnicianNote) updateFields.notes = combinedNotes;
        if (customer_id !== undefined && customer_id !== 'new') updateFields.customer_id = customer_id;
        if (device_id !== undefined && device_id !== 'new') updateFields.device_id = device_id;



        const { data: repair, error } = await supabase
            .from('repairs')
            .update(updateFields)
            .eq('id', req.params.id)
            .select();

        if (error || !repair || repair.length === 0) {
            return res.status(404).json({ msg: 'Repair ticket not found or update failed' });
        }

        // Trigger Notification if newly completed
        if (status === 'completed' && !wasAlreadyCompleted) {
            try {
                const { data: ticket } = await supabase.from('repairs')
                    .select('*, customers(name, email), devices(model)')
                    .eq('id', req.params.id)
                    .single();

                // It could be customer email OR legacy free-text customerName fallback without email
                const emailTarget = ticket?.customers?.email;
                if (emailTarget) {
                    const { sendRepairCompletedEmail } = require('../utils/emailService');
                    sendRepairCompletedEmail(emailTarget, {
                        customerName: ticket.customers?.name || ticket.customerName || 'Customer',
                        deviceModel: ticket.devices ? ticket.devices.model : (ticket.deviceModel || 'Your Device'),
                        issueDescription: ticket.issueDescription,
                        finalCost: ticket.finalCost || 0
                    });
                }
            } catch (emailErr) {
                console.error('Failed to trigger email notification:', emailErr);
            }
        }

        repair[0]._id = repair[0].id;
        res.json(repair[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a repair ticket
// @route   DELETE /api/repairs/:id
// @access  Private/Admin
exports.deleteRepair = async (req, res) => {
    try {
        const { error } = await supabase
            .from('repairs')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            return res.status(404).json({ msg: 'Repair ticket not found or could not delete' });
        }

        res.json({ msg: 'Repair ticket removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get repairs assigned to the logged-in technician
// @route   GET /api/repairs/my-assigned
// @access  Private/Technician
exports.getMyRepairs = async (req, res) => {
    try {
        let query = supabase
            .from('repairs')
            .select('*, customers(name, phone), devices(model)')
            .not('status', 'in', '("completed","delivered")')
            .order('created_at', { ascending: false });

        if (req.user.id.startsWith('mock-')) {
            query = query.ilike('notes', `%Technician: ${req.user.id}%`);
        } else {
            query = query.eq('assignedTo', req.user.id);
        }

        const { data: repairs, error } = await query;

        if (error) throw error;

        const mapped = (repairs || []).map(r => ({ ...r, _id: r.id }));
        res.json(mapped);
    } catch (err) {
        console.error('Error fetching my repairs:', err.message);
        res.status(500).send('Server Error');
    }
};
