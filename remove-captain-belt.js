// Script to remove the belt from captain SVGs
const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('xmldom');

// Function to remove belt from a single SVG file
function removeBeltFromSvg(filePath) {
    try {
        // Read the SVG file
        const svgContent = fs.readFileSync(filePath, 'utf8');
        
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'text/xml');
        
        // Find belt elements by character name
        let beltRemoved = false;
        const allElements = svgDoc.getElementsByTagName('*');
        
        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            if (element.nodeType === 1) {
                const characterName = element.getAttribute('ffdec:characterName');
                if (characterName && characterName.toLowerCase().includes('belt')) {
                    console.log(`Found belt element by character name: ${characterName}`);
                    
                    // Remove the belt element
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                        beltRemoved = true;
                        console.log(`Removed belt element from ${path.basename(filePath)}`);
                    }
                }
            }
        }
        
        if (!beltRemoved) {
            console.log(`No belt elements found in ${path.basename(filePath)}`);
            return false;
        }
        
        // Convert back to string and save
        const serializer = new XMLSerializer();
        const modifiedContent = serializer.serializeToString(svgDoc);
        
        // Create a backup if it doesn't exist
        const backupDir = path.join(path.dirname(filePath), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupPath = path.join(backupDir, path.basename(filePath));
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
        }
        
        // Save the modified SVG
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
        return false;
    }
}

// Function to remove belt from all captain SVGs
function removeBeltFromAllCaptainSvgs() {
    const captainDir = path.join(__dirname, 'animation-body-full', 'captain', 'steer');
    
    if (!fs.existsSync(captainDir)) {
        console.error(`Captain directory not found: ${captainDir}`);
        return;
    }
    
    // Get all SVG files in the captain directory
    const files = fs.readdirSync(captainDir)
        .filter(file => file.endsWith('.svg'));
    
    if (files.length === 0) {
        console.log('No SVG files found in captain directory');
        return;
    }
    
    console.log(`Found ${files.length} SVG files in captain directory`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Process each file
    files.forEach(file => {
        const filePath = path.join(captainDir, file);
        const success = removeBeltFromSvg(filePath);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    });
    
    console.log(`Processed ${files.length} files: ${successCount} belts removed, ${failCount} files unchanged`);
}

// Run the function
removeBeltFromAllCaptainSvgs();
