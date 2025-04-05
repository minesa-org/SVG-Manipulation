// Analyze the current SVG and list all sprite IDs
function analyzeSprites() {
    console.log("analyzeSprites function called");

    if (!modifiedSvgContent) {
        updateStatus("Please load an SVG file first", "warning");
        return;
    }

    // Get the sprites list element
    const spritesList = document.getElementById("spritesList");
    
    // Clear any existing content
    spritesList.innerHTML = "";
    
    try {
        // Parse the SVG content
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(modifiedSvgContent, "image/svg+xml");
        
        // Find all elements with IDs
        const elements = svgDoc.querySelectorAll("*[id]");
        const sprites = [];
        
        // Collect sprite elements and elements with character names
        elements.forEach(element => {
            const id = element.getAttribute("id");
            if (id && id.startsWith("sprite")) {
                // Get character name if available
                const characterName = element.getAttribute("ffdec:characterName");
                sprites.push({
                    id: id,
                    name: characterName || "",
                    element: element
                });
            }
        });
        
        // Sort sprites numerically
        sprites.sort((a, b) => {
            const numA = parseInt(a.id.replace("sprite", ""));
            const numB = parseInt(b.id.replace("sprite", ""));
            return numA - numB;
        });
        
        // Display sprites in the list
        if (sprites.length === 0) {
            const noSpritesMsg = document.createElement("div");
            noSpritesMsg.className = "sprite-item";
            noSpritesMsg.textContent = "No sprites found in this SVG";
            spritesList.appendChild(noSpritesMsg);
        } else {
            // Add each sprite to the list
            sprites.forEach(sprite => {
                const item = document.createElement("div");
                item.className = "sprite-item";
                
                if (sprite.name) {
                    // If it has a name, display it prominently
                    const nameSpan = document.createElement("strong");
                    nameSpan.textContent = sprite.name;
                    
                    const idSpan = document.createElement("span");
                    idSpan.className = "sprite-id";
                    idSpan.textContent = ` (${sprite.id})`;
                    
                    item.appendChild(nameSpan);
                    item.appendChild(idSpan);
                    
                    // Highlight mouth-related sprites
                    if (sprite.name.toLowerCase().includes("mouth")) {
                        item.classList.add("mouth-sprite");
                    }
                } else {
                    // Just show the ID
                    item.textContent = sprite.id;
                }
                
                // Add click handler to select this sprite
                item.addEventListener("click", () => {
                    document.getElementById("spriteId").value = sprite.id;
                    spritesList.classList.remove("active");
                });
                
                spritesList.appendChild(item);
            });
        }
        
        // Add a close button
        const closeButton = document.createElement("div");
        closeButton.className = "close-button";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", () => {
            spritesList.classList.remove("active");
        });
        
        spritesList.appendChild(document.createElement("hr"));
        spritesList.appendChild(closeButton);
        
        // Show the list
        spritesList.classList.add("active");
        spritesList.style.display = "block";
        
        console.log(`Found ${sprites.length} sprites, list should now be visible`);
    } catch (error) {
        console.error("Error analyzing sprites:", error);
        updateStatus(`Error analyzing sprites: ${error.message}`, "error");
    }
}
