// Test old token format WITH fallback headers
async function testOldTokenWithHeaders() {
    try {
        const res = await fetch('http://localhost:5000/api/repairs/my-assigned', {
            headers: {
                'x-auth-token': 'mock-token-1776845504791',  // old format (no | separator)
                'x-mock-user-id': 'mock-1776845504791',       // fallback header
                'x-mock-user-role': 'technician'              // fallback header
            }
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Repairs found:', data.length);
        if (data.length > 0) {
            console.log('First repair:', data[0].customerName, '-', data[0].deviceModel);
        } else {
            console.log('No repairs found!', JSON.stringify(data));
        }
    } catch (err) {
        console.error(err.message);
    }
}

testOldTokenWithHeaders();
