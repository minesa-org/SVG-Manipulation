// Test script to replace belt with invisible version in captain SVGs
const fetch = require('node-fetch');

async function testInvisibleBelt() {
    try {
        console.log('Testing replacement of belt with invisible version in captain SVGs...');
        
        // Call the API to replace with invisible belt
        const response = await fetch('http://localhost:3000/api/replace-with-invisible-belt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                characterClass: 'captain'
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Success! API response:', result);
            console.log(`Replaced belt with invisible version in ${result.successCount || 0} files`);
        } else {
            console.error('❌ Error! API response:', result);
        }
    } catch (error) {
        console.error('❌ Error running test:', error);
    }
}

// Run the test
testInvisibleBelt();
