// Simple test script to verify that sprite replacement works for the "captain" character class
const fetch = require("node-fetch");

async function testCaptainSpriteReplacement() {
    try {
        console.log(
            "Testing sprite replacement for captain character class..."
        );

        // Test parameters
        const testParams = {
            fileName: "1095.svg", // A captain SVG file
            replacementFile: "body-parts/captain/default/eyes/eyes_1.svg", // A replacement file for captain
            characterClass: "captain",
            characterType: "male",
        };

        // Call the API to replace a sprite
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
testCaptainSpriteReplacement();
