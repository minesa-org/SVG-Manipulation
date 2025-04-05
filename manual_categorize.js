const fs = require("fs");
const path = require("path");

// Define manual categorizations
const categorizations = {
    "male/mouth": [
        "4.svg",
        "6.svg",
        "8.svg",
        "10.svg",
        "12.svg",
        "14.svg",
        "16.svg",
        "18.svg",
        "20.svg",
    ],
    "male/head": [
        "22.svg",
        "24.svg",
        "26.svg",
        "28.svg",
        "30.svg",
        "32.svg",
        "34.svg",
        "36.svg",
        "38.svg",
    ],
    "male/hair": [
        "40.svg",
        "42.svg",
        "44.svg",
        "46.svg",
        "48.svg",
        "50.svg",
        "52.svg",
        "54.svg",
        "56.svg",
    ],
    "male/eyes": [
        "58.svg",
        "60.svg",
        "62.svg",
        "64.svg",
        "66.svg",
        "68.svg",
        "70.svg",
        "72.svg",
        "74.svg",
    ],
    "female/mouth": [
        "76.svg",
        "78.svg",
        "80.svg",
        "82.svg",
        "84.svg",
        "86.svg",
        "88.svg",
        "90.svg",
        "92.svg",
    ],
    "female/head": [
        "94.svg",
        "96.svg",
        "98.svg",
        "100.svg",
        "102.svg",
        "104.svg",
        "106.svg",
        "108.svg",
        "110.svg",
    ],
    "female/hair": [
        "112.svg",
        "114.svg",
        "116.svg",
        "118.svg",
        "120.svg",
        "122.svg",
        "124.svg",
        "126.svg",
        "128.svg",
    ],
    "female/eyes": [
        "130.svg",
        "132.svg",
        "134.svg",
        "136.svg",
        "138.svg",
        "140.svg",
        "142.svg",
        "144.svg",
        "146.svg",
    ],
};

// Source directory
const sourceDir = path.join(__dirname, "body-parts/rogue");

// Function to manually categorize files
function manualCategorize() {
    // Process each category
    for (const [category, files] of Object.entries(categorizations)) {
        const targetDir = path.join(sourceDir, category);

        // Create directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Move files to the target directory
        for (const file of files) {
            const sourcePath = path.join(sourceDir, file);
            const targetPath = path.join(targetDir, file);

            if (fs.existsSync(sourcePath)) {
                try {
                    // Copy the file
                    fs.copyFileSync(sourcePath, targetPath);
                    console.log(`Copied ${file} to ${category}`);
                } catch (error) {
                    console.error(`Error copying ${file}: ${error.message}`);
                }
            } else {
                console.log(`File ${file} not found in source directory`);
            }
        }
    }

    console.log("Manual categorization complete!");
}

// Run the manual categorization
manualCategorize();
