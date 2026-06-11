async function testUpdateOldToken() {
    try {
        const res = await fetch('http://localhost:5000/api/repairs/8011cf9d-c7b0-48ee-af79-96bd4d6b7d58', {
            method: 'PUT',
            headers: {
                'x-auth-token': 'mock-token-1776845504791',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'completed',
                notes: 'Test update',
                estimatedCost: 10000,
                finalCost: 12000
            })
        });
        
        console.log("Status:", res.status);
        if (!res.ok) {
            const data = await res.json();
            console.log(data);
        } else {
            console.log("Success");
        }
    } catch (err) {
        console.error(err.message);
    }
}

testUpdateOldToken();
