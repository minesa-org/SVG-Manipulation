// Test script to remove sprite3 (belt) from captain SVGs
const fetch = require("node-fetch");

async function testRemoveCaptainBelt() {
    try {
        console.log("Testing removal of sprite3 (belt) from captain SVGs...");

        // Call the API to remove sprite3
        const response = await fetch(
            "http://localhost:3000/api/remove-captain-belt",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    characterClass: "captain",
                }),
            }
        );

        const result = await response.json();

        if (response.ok) {
            console.log("✅ Success! API response:", result);
            console.log(
                `Removed ${result.totalRemoved || 0} sprite3 elements from ${
                    result.successCount || 0
                } files`
            );
        } else {
            console.error("❌ Error! API response:", result);
        }
    } catch (error) {
        console.error("❌ Error running test:", error);
    }
}

// Run the test
testRemoveCaptainBelt();
