// Test script to debug belt replacement for captain
const fetch = require("node-fetch");

async function testCaptainBeltReplacement() {
    try {
        console.log("Testing belt replacement for captain character...");

        // Test parameters
        const testParams = {
            fileName: "1095.svg", // A captain SVG file with belt
            replacementFile: "body-parts/captain/default/belt_replacement.svg", // Belt replacement file
            spriteId: "sprite3", // The sprite ID for the belt based on the SVG structure
            characterClass: "captain",
            characterType: "male",
        };

        // Call the API to replace the sprite
        const response = await fetch(
            "http://localhost:3000/api/replace-sprite",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(testParams),
            }
        );

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
testCaptainBeltReplacement();
