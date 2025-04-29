// Script to replace the belt with a nearly invisible version in all captain SVGs
const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('xmldom');

// Function to replace sprite3 (belt) with an invisible version
async function replaceWithInvisibleBelt() {
    try {
        console.log('Replacing belt with nearly invisible version in all captain SVGs...');
        
        // Path to the captain SVG directory
        const captainDir = path.join(__dirname, 'animation-body-full', 'captain', 'steer');
        
        // Path to the invisible belt SVG
        const invisibleBeltPath = path.join(__dirname, 'body-parts', 'captain', 'default', 'invisible_belt.svg');
        
        // Check if the invisible belt file exists
        if (!fs.existsSync(invisibleBeltPath)) {
            console.error('Invisible belt SVG file not found:', invisibleBeltPath);
            return;
        }
        
        // Read the invisible belt SVG
        const invisibleBeltContent = fs.readFileSync(invisibleBeltPath, 'utf8');
        
        // Parse the invisible belt SVG
        const parser = new DOMParser();
        const invisibleBeltDoc = parser.parseFromString(invisibleBeltContent, 'text/xml');
        
        // Get the paths from the invisible belt SVG
        const invisibleBeltPaths = invisibleBeltDoc.getElementsByTagName('path');
        if (invisibleBeltPaths.length === 0) {
            console.error('No paths found in the invisible belt SVG');
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
        for (const fileName of files) {
            try {
                const filePath = path.join(captainDir, fileName);
                console.log(`Processing ${fileName}...`);
                
                // Create a backup if it doesn't exist
                const backupDir = path.join(captainDir, 'backups');
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                
                const backupPath = path.join(backupDir, fileName);
                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(filePath, backupPath);
                }
                
                // Read the SVG file
                const svgContent = fs.readFileSync(filePath, 'utf8');
                
                // Parse the SVG
                const svgDoc = parser.parseFromString(svgContent, 'text/xml');
                
                // Find sprite3 (belt) element
                const sprite3Element = svgDoc.getElementById('sprite3');
                let updated = false;
                
                if (sprite3Element) {
                    console.log(`Found sprite3 element in ${fileName}`);
                    
                    // Find shape elements within sprite3
                    const shapeElements = sprite3Element.getElementsByTagName('*');
                    for (let i = 0; i < shapeElements.length; i++) {
                        const element = shapeElements[i];
                        if (element.nodeName === 'path') {
                            // Clear existing paths
                            while (element.firstChild) {
                                element.removeChild(element.firstChild);
                            }
                            
                            // Replace with invisible belt paths
                            for (let j = 0; j < invisibleBeltPaths.length; j++) {
                                const pathNode = invisibleBeltPaths[j].cloneNode(true);
                                element.appendChild(pathNode);
                            }
                            
                            updated = true;
                        }
                    }
                    
                    // If no direct paths found, look for use elements
                    if (!updated) {
                        const useElements = sprite3Element.getElementsByTagName('use');
                        if (useElements.length > 0) {
                            const useElement = useElements[0];
                            const shapeHref = useElement.getAttribute('xlink:href');
                            if (shapeHref) {
                                const shapeId = shapeHref.substring(1);
                                const shapeElement = svgDoc.getElementById(shapeId);
                                
                                if (shapeElement) {
                                    // Clear existing paths in the shape element
                                    const existingPaths = shapeElement.getElementsByTagName('path');
                                    const pathsToRemove = [];
                                    for (let i = 0; i < existingPaths.length; i++) {
                                        pathsToRemove.push(existingPaths[i]);
                                    }
                                    
                                    // Remove the paths
                                    pathsToRemove.forEach(path => {
                                        if (path.parentNode) {
                                            path.parentNode.removeChild(path);
                                        }
                                    });
                                    
                                    // Add new paths from the invisible belt
                                    for (let i = 0; i < invisibleBeltPaths.length; i++) {
                                        const pathNode = invisibleBeltPaths[i].cloneNode(true);
                                        shapeElement.appendChild(pathNode);
                                    }
                                    
                                    updated = true;
                                }
                            }
                        }
                    }
                }
                
                if (updated) {
                    // Convert back to string and save
                    const serializer = new XMLSerializer();
                    const modifiedContent = serializer.serializeToString(svgDoc);
                    
                    fs.writeFileSync(filePath, modifiedContent, 'utf8');
                    console.log(`Updated ${fileName} with invisible belt`);
                    successCount++;
                } else {
                    console.log(`No belt found or could not update in ${fileName}`);
                    failCount++;
                }
            } catch (error) {
                console.error(`Error processing ${fileName}:`, error);
                failCount++;
            }
        }
        
        console.log(`Processed ${files.length} files: ${successCount} files updated with invisible belt, ${failCount} files unchanged or failed`);
    } catch (error) {
        console.error('Error replacing belts with invisible version:', error);
    }
}

// Run the function
replaceWithInvisibleBelt();
