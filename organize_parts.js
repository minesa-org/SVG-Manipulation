const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');

// Define categories and their patterns
const categories = {
    'male/mouth': [
        { pattern: 'a_MouthEmote', type: 'characterName' },
        { pattern: 'a_Mouth', type: 'characterName' },
        { pattern: 'am_Mouth', type: 'id' },
        { pattern: '_mouth', type: 'id' }
    ],
    'male/face': [
        { pattern: 'a_Face', type: 'characterName' },
        { pattern: 'a_Head', type: 'characterName' },
        { pattern: '_face', type: 'id' },
        { pattern: '_head', type: 'id' }
    ],
    'male/hair': [
        { pattern: 'a_Hair', type: 'characterName' },
        { pattern: '_hair', type: 'id' }
    ],
    'male/eyes': [
        { pattern: 'a_Eye', type: 'characterName' },
        { pattern: '_eye', type: 'id' },
        { pattern: '_eyes', type: 'id' }
    ],
    'male/body': [
        { pattern: 'a_Body', type: 'characterName' },
        { pattern: '_body', type: 'id' },
        { pattern: 'a_Torso', type: 'characterName' }
    ],
    'male/arms': [
        { pattern: 'a_Arm', type: 'characterName' },
        { pattern: '_arm', type: 'id' }
    ],
    'male/legs': [
        { pattern: 'a_Leg', type: 'characterName' },
        { pattern: '_leg', type: 'id' }
    ],
    'male/accessories': [
        { pattern: 'a_Cape', type: 'characterName' },
        { pattern: 'a_Accessory', type: 'characterName' },
        { pattern: '_cape', type: 'id' },
        { pattern: '_accessory', type: 'id' }
    ]
};

// Source directory
const sourceDir = path.join(__dirname, 'body-parts/rogue');

// Function to categorize an SVG file
function categorizeFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/xml');
        
        // Check each category
        for (const [category, patterns] of Object.entries(categories)) {
            for (const { pattern, type } of patterns) {
                if (type === 'characterName') {
                    // Check for elements with the specified character name
                    const elements = doc.getElementsByTagName('*');
                    for (let i = 0; i < elements.length; i++) {
                        const characterName = elements[i].getAttribute('ffdec:characterName');
                        if (characterName && characterName.includes(pattern)) {
                            return category;
                        }
                    }
                } else if (type === 'id') {
                    // Check for elements with IDs containing the pattern
                    const elements = doc.getElementsByTagName('*');
                    for (let i = 0; i < elements.length; i++) {
                        const id = elements[i].getAttribute('id');
                        if (id && id.toLowerCase().includes(pattern.toLowerCase())) {
                            return category;
                        }
                    }
                }
            }
        }
        
        // Default category if no match is found
        return 'male/other';
    } catch (error) {
        console.error(`Error processing ${filePath}: ${error.message}`);
        return null;
    }
}

// Process all SVG files in the source directory
function organizeFiles() {
    const files = fs.readdirSync(sourceDir);
    const svgFiles = files.filter(file => file.endsWith('.svg'));
    
    console.log(`Found ${svgFiles.length} SVG files to process`);
    
    // Create a map to store file categorizations
    const categorized = {};
    
    // Categorize each file
    for (const file of svgFiles) {
        const filePath = path.join(sourceDir, file);
        const category = categorizeFile(filePath);
        
        if (category) {
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(file);
        }
    }
    
    // Create directories and move files
    for (const [category, files] of Object.entries(categorized)) {
        const targetDir = path.join(sourceDir, category);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Move files to the target directory
        for (const file of files) {
            const sourcePath = path.join(sourceDir, file);
            const targetPath = path.join(targetDir, file);
            
            try {
                // Copy the file instead of moving to preserve the original
                fs.copyFileSync(sourcePath, targetPath);
                console.log(`Copied ${file} to ${category}`);
            } catch (error) {
                console.error(`Error copying ${file}: ${error.message}`);
            }
        }
    }
    
    console.log('Organization complete!');
}

// Run the organization
organizeFiles();
