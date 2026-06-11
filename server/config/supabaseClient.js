
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credential(s) missing in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
