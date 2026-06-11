async function testMyAssigned() {
    try {
        const res = await fetch('http://localhost:5000/api/repairs/my-assigned', {
            headers: {
                'x-auth-token': 'mock-token-technician|mock-1776845504791'
            }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err.message);
    }
}

testMyAssigned();
