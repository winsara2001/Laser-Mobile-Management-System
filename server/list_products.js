const supabase = require('./config/supabaseClient');

async function checkProducts() {
    // First check the actual columns
    const { data: sample, error: sErr } = await supabase
        .from('products')
        .select('*')
        .limit(1);
    
    if (sErr) { console.error('Sample error:', sErr); return; }
    if (sample && sample.length > 0) {
        console.log('=== Column names ===');
        console.log(Object.keys(sample[0]).join(', '));
        console.log('\n=== Sample product ===');
        console.log(sample[0]);
    }

    const { data, error } = await supabase
        .from('products')
        .select('name, category, supplier')
        .order('name');
    
    if (error) { console.error(error); return; }
    
    console.log('\n=== All', data.length, 'Products ===');
    data.forEach(p => {
        console.log(`Name: "${p.name}" | Category: "${p.category}" | Supplier: "${p.supplier}"`);
    });
}

checkProducts();
