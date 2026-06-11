const { createClient } = require('@supabase/supabase-js');
const fetch = global.fetch;

const url = 'https://jitljrmyzycoulqeloph.supabase.co';
const key = 'sb_publishable_gFLzWZduaqarSNq_V-vTPw_bxrbtddH';
const supabase = createClient(url, key);

async function testLogin() {
    const email = 'chamikaranaweera30@gmail.com'; 
    const password = '...'; // We don't have the password exactly, wait.
    
    // Instead of login, let's just create a new test user and see
    console.log("Checking DB connection");
}

testLogin();
