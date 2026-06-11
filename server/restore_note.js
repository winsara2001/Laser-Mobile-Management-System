const supabase = require('./config/supabaseClient');

async function restoreNote() {
    const { data, error } = await supabase.from('repairs')
        .update({ notes: 'Urgent | Technician: mock-1776845504791', status: 'pending' })
        .eq('id', '8011cf9d-c7b0-48ee-af79-96bd4d6b7d58');
    if (error) console.error(error);
    else console.log('Restored!', data);
}

restoreNote();
