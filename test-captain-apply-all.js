// Simple test script to verify that apply-to-all works for the "captain" character class
const fetch = require("node-fetch");

async function testCaptainApplyToAll() {
    try {
        console.log("Testing apply-to-all for captain character class...");

        // Test parameters
        const testParams = {
            replacementFile: "body-parts/captain/default/belt_replacement.svg", // Belt replacement file
            spriteId: "sprite3", // The sprite ID for the belt based on the SVG structure
            characterClass: "captain",
            characterType: "male",
        };

        // Call the API to apply to all files
        const response = await fetch("http://localhost:3000/api/apply-to-all", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(testParams),
        });

        const result = await response.json();

        if (response.ok) {
            console.log("✅ Success! API response:", result);
        } else {
            console.error("❌ Error! API response:", result);
        }
    } catch (error) {
        console.error("❌ Error running test:", error);
    }
}

// Run the test
testCaptainApplyToAll();
