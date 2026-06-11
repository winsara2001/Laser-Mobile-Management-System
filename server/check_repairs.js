const supabase = require('./config/supabaseClient');

async function checkRepairs() {
    const { data, error } = await supabase.from('repairs').select('id, notes, assignedTo, status, customerName');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

checkRepairs();
