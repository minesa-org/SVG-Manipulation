// Script to remove sprite3 (belt) from all captain SVGs
const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('xmldom');

// Function to remove sprite3 from a single SVG file
function removeSprite3FromSvg(filePath) {
    try {
        console.log(`Processing ${filePath}...`);
        
        // Read the SVG file
        const svgContent = fs.readFileSync(filePath, 'utf8');
        
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'text/xml');
        
        // Find all use elements that reference sprite3
        let removed = false;
        const useElements = svgDoc.getElementsByTagName('use');
        
        for (let i = 0; i < useElements.length; i++) {
            const element = useElements[i];
            if (element.nodeType === 1) {
                const href = element.getAttribute('xlink:href');
                if (href === '#sprite3') {
                    console.log(`Found sprite3 reference in ${path.basename(filePath)}`);
                    
                    // Remove the element
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                        removed = true;
                        console.log(`Removed sprite3 reference from ${path.basename(filePath)}`);
                    }
                }
            }
        }
        
        // Also look for elements with id="sprite3"
        const sprite3Element = svgDoc.getElementById('sprite3');
        if (sprite3Element) {
            console.log(`Found element with id="sprite3" in ${path.basename(filePath)}`);
            if (sprite3Element.parentNode) {
                sprite3Element.parentNode.removeChild(sprite3Element);
                removed = true;
                console.log(`Removed element with id="sprite3" from ${path.basename(filePath)}`);
            }
        }
        
        if (!removed) {
            console.log(`No sprite3 elements found in ${path.basename(filePath)}`);
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

// Function to remove sprite3 from all captain SVGs
function removeSprite3FromAllCaptainSvgs() {
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
        const success = removeSprite3FromSvg(filePath);
        
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    });
    
    console.log(`Processed ${files.length} files: ${successCount} files modified, ${failCount} files unchanged`);
}

// Run the function
removeSprite3FromAllCaptainSvgs();
