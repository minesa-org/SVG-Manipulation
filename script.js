// Global variables to store original and modified SVG content
let originalSvgContent = null;
let modifiedSvgContent = null;
let currentSvgFile = null;

// Animation variables
let animationInterval = null;
let svgFiles = [];
let currentFileIndex = 0;

// Character type (male/female)
let characterType = "male";

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
    // Fetch and populate the file selectors
    fetchSvgFiles();
    fetchReplacementFiles();

    // Add event listeners for file and sprite operations
    document
        .getElementById("svgFileSelector")
        .addEventListener("change", loadSelectedSvg);
    document
        .getElementById("replaceSprite")
        .addEventListener("click", replaceSprite);
    document
        .getElementById("analyzeSprites")
        .addEventListener("click", analyzeSprites);
    // Apply to All Files button removed - now automatic

    // Add event listeners for character type selection
    document
        .getElementById("selectMale")
        .addEventListener("click", () => setCharacterType("male"));
    document
        .getElementById("selectFemale")
        .addEventListener("click", () => setCharacterType("female"));

    // Add event listeners for special actions
    document.getElementById("removeHat").addEventListener("click", removeHat);
    document
        .getElementById("toggleAccessories")
        .addEventListener("click", toggleAccessories);

    // Add event listeners for animation controls
    document
        .getElementById("startAnimation")
        .addEventListener("click", startAnimation);
    document
        .getElementById("stopAnimation")
        .addEventListener("click", stopAnimation);
    document
        .getElementById("restoreAllSvg")
        .addEventListener("click", restoreAllSvgFiles);
});

// Fetch SVG files from the server
async function fetchSvgFiles() {
    try {
        // Include character type in the request
        const response = await fetch(`/api/svg-files?type=${characterType}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        // Get the files and sort them numerically
        let files = await response.json();

        // Sort files numerically instead of alphabetically
        files.sort((a, b) => {
            // Extract the numeric part of the filename (before the .svg extension)
            const numA = parseInt(a.replace(/\.svg$/, ""));
            const numB = parseInt(b.replace(/\.svg$/, ""));

            // If both are valid numbers, sort numerically
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }

            // Fall back to alphabetical sort if not numeric
            return a.localeCompare(b);
        });

        svgFiles = files; // Store in global variable for animation
        populateFileSelector(svgFiles);
    } catch (error) {
        console.error("Error fetching SVG files:", error);
        updateStatus(`Error fetching files: ${error.message}`, "error");
    }
}

// Populate the file selector dropdown
function populateFileSelector(svgFiles) {
    const selector = document.getElementById("svgFileSelector");

    // Clear existing options except the first one
    while (selector.options.length > 1) {
        selector.remove(1);
    }

    // Add new options
    svgFiles.forEach((file) => {
        const option = document.createElement("option");
        option.value = file;
        option.textContent = file;
        selector.appendChild(option);
    });
}

// Fetch replacement SVG files
async function fetchReplacementFiles() {
    try {
        const response = await fetch("/api/replacement-files");
        if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        const replacementFiles = await response.json();
        populateReplacementFileSelector(replacementFiles);
    } catch (error) {
        console.error("Error fetching replacement files:", error);
        updateStatus(
            `Error fetching replacement files: ${error.message}`,
            "error"
        );
    }
}

// Populate the sprite replacement file selector dropdown
function populateReplacementFileSelector(files) {
    const spriteSelector = document.getElementById("spriteReplacementFile");

    // Clear existing options except the first one
    while (spriteSelector.options.length > 1) {
        spriteSelector.remove(1);
    }

    // Group files by category
    const categories = {
        "male/mouth": [],
        "male/head": [],
        "male/hair": [],
        "male/eyes": [],
        "female/mouth": [],
        "female/head": [],
        "female/hair": [],
        "female/eyes": [],
        "male/other": [],
        root: [],
    };

    // Sort files into categories
    files.forEach((file) => {
        let categorized = false;
        for (const category in categories) {
            if (file.includes(`body-parts/rogue/${category}/`)) {
                categories[category].push(file);
                categorized = true;
                break;
            }
        }
        if (!categorized) {
            categories["root"].push(file);
        }
    });

    // Add options grouped by category
    for (const category in categories) {
        if (categories[category].length > 0) {
            // Add category group
            const groupLabel = document.createElement("optgroup");
            groupLabel.label = category.replace("/", ": ");
            spriteSelector.appendChild(groupLabel);

            // Sort files numerically within each category
            categories[category].sort((a, b) => {
                const fileNameA = a.split("/").pop().replace(".svg", "");
                const fileNameB = b.split("/").pop().replace(".svg", "");
                const numA = parseInt(fileNameA);
                const numB = parseInt(fileNameB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return fileNameA.localeCompare(fileNameB);
            });

            // Add files in this category
            categories[category].forEach((file) => {
                const option = document.createElement("option");
                option.value = file;
                // Display just the filename, not the full path
                const fileName = file.split("/").pop();
                option.textContent = fileName;
                spriteSelector.appendChild(option);
            });
        }
    }

    // Set default selection to a mouth file if available
    if (categories["male/mouth"].length > 0) {
        const defaultFile = categories["male/mouth"][0];
        for (let i = 0; i < spriteSelector.options.length; i++) {
            if (spriteSelector.options[i].value === defaultFile) {
                spriteSelector.selectedIndex = i;
                break;
            }
        }
    }
}

// Load the selected SVG file
async function loadSelectedSvg() {
    const selector = document.getElementById("svgFileSelector");
    const selectedFile = selector.value;

    if (!selectedFile) {
        updateStatus("Please select a file", "warning");
        return;
    }

    currentSvgFile = selectedFile;
    updateStatus(`Loading ${selectedFile}...`);

    try {
        const response = await fetch(
            `animation-body-full/rogue/ready/${selectedFile}`
        );
        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.statusText}`);
        }

        const svgContent = await response.text();
        originalSvgContent = svgContent;
        modifiedSvgContent = svgContent;

        displaySvg(svgContent);
        updateStatus(`Loaded ${selectedFile} successfully`, "success");
    } catch (error) {
        console.error("Error loading SVG:", error);
        updateStatus(`Error loading file: ${error.message}`, "error");
    }
}

// Display the SVG in the preview area
function displaySvg(svgContent) {
    const previewArea = document.getElementById("svgPreview");
    previewArea.innerHTML = svgContent;
}

// Placeholder for removed replaceArm function

// Placeholder for removed replaceFace function

// Replace any sprite in all SVG files while preserving the transform
async function replaceSprite() {
    const replacementFile = document.getElementById(
        "spriteReplacementFile"
    ).value;
    if (!replacementFile) {
        updateStatus("Please select a replacement file", "warning");
        return;
    }

    // Get the optional sprite ID
    const spriteId = document.getElementById("spriteId").value.trim();

    updateStatus("Replacing sprite in all files while preserving transform...");

    try {
        // Call the server-side API to replace the sprite in all files
        const response = await fetch("/api/apply-to-all", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                replacementFile,
                spriteId: spriteId || undefined, // Only send if not empty
                characterType: characterType,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to replace sprite");
        }

        // Reload the SVG to show the changes if one is loaded
        if (currentSvgFile) {
            await loadSelectedSvg();
        }

        updateStatus(
            result.message || "Sprite replaced successfully in all files",
            "success"
        );
    } catch (error) {
        console.error("Error replacing sprite:", error);
        updateStatus(`Error replacing sprite: ${error.message}`, "error");
    }
}

// Placeholder for removed batchUpdateFace function

// Placeholder for removed revertChanges function

// Restore all SVG files from backups
async function restoreAllSvgFiles() {
    if (
        !confirm(
            "Are you sure you want to restore ALL SVG files to their original state? This cannot be undone."
        )
    ) {
        return;
    }

    updateStatus("Restoring all SVG files...");

    try {
        const response = await fetch("/api/restore-all-svg", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to restore files");
        }

        const result = await response.json();

        // Display results
        const successCount = result.results.filter(
            (r) => r.status === "restored"
        ).length;
        const errorCount = result.results.filter(
            (r) => r.status === "error"
        ).length;

        updateStatus(
            `Restored ${successCount} files, ${errorCount} errors`,
            "success"
        );

        // Refresh the current SVG if it's loaded
        if (currentSvgFile) {
            loadSelectedSvg();
        }
    } catch (error) {
        console.error("Error restoring files:", error);
        updateStatus(`Error restoring files: ${error.message}`, "error");
    }
}

// Update the status message
function updateStatus(message, type = "") {
    const statusElement = document.getElementById("statusMessage");
    statusElement.textContent = message;

    // Remove all classes
    statusElement.className = "";

    // Add the appropriate class
    if (type) {
        statusElement.classList.add(type);
    }
}

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
        const svgDoc = parser.parseFromString(
            modifiedSvgContent,
            "image/svg+xml"
        );

        // Find all elements with IDs
        const elements = svgDoc.querySelectorAll("*[id]");
        const sprites = [];

        // First collect all character names from all elements
        const characterMap = new Map();
        const allElements = svgDoc.querySelectorAll("*");
        allElements.forEach((element) => {
            const characterName = element.getAttribute("ffdec:characterName");
            if (characterName) {
                // Check if this element references a sprite
                const href = element.getAttribute("xlink:href");
                if (href && href.startsWith("#sprite")) {
                    const spriteId = href.substring(1); // Remove the # from the beginning
                    characterMap.set(spriteId, characterName);
                }

                // Also store by ID if it has one
                const id = element.getAttribute("id");
                if (id) {
                    characterMap.set(id, characterName);
                }
            }
        });

        // Now collect sprite elements with their character names
        elements.forEach((element) => {
            const id = element.getAttribute("id");
            if (id && id.startsWith("sprite")) {
                // Get character name if available directly or via our map
                const directCharName = element.getAttribute(
                    "ffdec:characterName"
                );
                const mappedCharName = characterMap.get(id);
                const characterName = directCharName || mappedCharName || "";

                // Also check if this sprite contains any use elements with character names
                let useCharName = "";
                const useElements = element.querySelectorAll("use");
                for (const useEl of useElements) {
                    const useName = useEl.getAttribute("ffdec:characterName");
                    if (useName) {
                        useCharName = useName;
                        break;
                    }
                }

                sprites.push({
                    id: id,
                    name: characterName || useCharName || "",
                    element: element,
                });
            }
        });

        // Helper function to get sprite type
        function getSpriteType(name) {
            if (!name) return "unknown";
            name = name.toLowerCase();
            if (name.includes("mouth")) return "mouth";
            if (name.includes("eye")) return "eye";
            if (name.includes("hair")) return "hair";
            if (name.includes("face") || name.includes("head")) return "head";
            if (name.includes("body")) return "body";
            if (name.includes("arm")) return "arm";
            if (name.includes("leg")) return "leg";
            return "other";
        }

        // Sort sprites by type and then numerically
        sprites.sort((a, b) => {
            // First sort by type
            const typeA = getSpriteType(a.name);
            const typeB = getSpriteType(b.name);

            if (typeA !== typeB) {
                // Define type order
                const typeOrder = {
                    face: 1,
                    eye: 2,
                    mouth: 3,
                    hair: 4,
                    body: 5,
                    arm: 6,
                    leg: 7,
                    other: 8,
                    unknown: 9,
                };
                return typeOrder[typeA] - typeOrder[typeB];
            }

            // Then sort numerically
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
            // Group sprites by type
            let currentType = "";

            // Add each sprite to the list
            sprites.forEach((sprite) => {
                // Add section header if type changes
                const spriteType = getSpriteType(sprite.name);
                if (spriteType !== currentType) {
                    currentType = spriteType;

                    // Add a section header
                    const header = document.createElement("div");
                    header.className = "sprite-section-header";
                    header.textContent =
                        spriteType.charAt(0).toUpperCase() +
                        spriteType.slice(1);
                    spritesList.appendChild(header);
                }

                const item = document.createElement("div");
                item.className = "sprite-item";

                // Always show the sprite ID first
                const idSpan = document.createElement("span");
                idSpan.className = "sprite-id";
                idSpan.textContent = sprite.id;
                item.appendChild(idSpan);

                // Add a separator
                item.appendChild(document.createTextNode(" - "));

                if (sprite.name) {
                    // If it has a name, display it prominently
                    const nameSpan = document.createElement("strong");
                    nameSpan.textContent = sprite.name;
                    item.appendChild(nameSpan);

                    // Add special classes based on sprite type
                    if (sprite.name.toLowerCase().includes("mouth")) {
                        item.classList.add("mouth-sprite");
                    } else if (sprite.name.toLowerCase().includes("eye")) {
                        item.classList.add("eye-sprite");
                    } else if (sprite.name.toLowerCase().includes("hair")) {
                        item.classList.add("hair-sprite");
                    } else if (
                        sprite.name.toLowerCase().includes("face") ||
                        sprite.name.toLowerCase().includes("head")
                    ) {
                        item.classList.add("head-sprite");
                    }
                } else {
                    // If no name, show "Unknown"
                    const unknownSpan = document.createElement("em");
                    unknownSpan.textContent = "Unknown";
                    item.appendChild(unknownSpan);
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

        console.log(
            `Found ${sprites.length} sprites, list should now be visible`
        );
    } catch (error) {
        console.error("Error analyzing sprites:", error);
        updateStatus(`Error analyzing sprites: ${error.message}`, "error");
    }
}

// Placeholder for removed saveSvg function

// Set the character type (male/female)
function setCharacterType(type) {
    if (type !== characterType) {
        characterType = type;

        // Update UI
        document
            .getElementById("selectMale")
            .classList.toggle("active", type === "male");
        document
            .getElementById("selectFemale")
            .classList.toggle("active", type === "female");

        // Fetch files for the selected character type
        fetchSvgFiles();

        // Update status
        updateStatus(`Switched to ${type} character`, "success");
    }
}

// Remove hat from all SVG files
async function removeHat() {
    updateStatus("Removing hats from all files...");

    try {
        // Call the server-side API to remove hats from all files
        const response = await fetch("/api/remove-hat-all", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                characterType: characterType,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to remove hats");
        }

        // Reload the SVG to show the changes if one is loaded
        if (currentSvgFile) {
            await loadSelectedSvg();
        }

        updateStatus(
            result.message || "Hats removed successfully from all files",
            "success"
        );
    } catch (error) {
        console.error("Error removing hats:", error);
        updateStatus(`Error removing hats: ${error.message}`, "error");
    }
}

// Toggle accessories in the current SVG
async function toggleAccessories() {
    if (!modifiedSvgContent) {
        updateStatus("Please load an SVG file first", "warning");
        return;
    }

    updateStatus("Toggling accessories...");

    try {
        // Call the server-side API to toggle accessories
        const response = await fetch("/api/toggle-accessories", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fileName: currentSvgFile,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to toggle accessories");
        }

        // Reload the SVG to show the changes
        await loadSelectedSvg();
        updateStatus(
            result.message || "Accessories toggled successfully",
            "success"
        );
    } catch (error) {
        console.error("Error toggling accessories:", error);
        updateStatus(`Error toggling accessories: ${error.message}`, "error");
    }
}

// Apply the selected sprite to all SVG files
async function applyToAllFiles() {
    const replacementFile = document.getElementById(
        "spriteReplacementFile"
    ).value;
    if (!replacementFile) {
        updateStatus("Please select a replacement file", "warning");
        return;
    }

    // Get the optional sprite ID
    const spriteId = document.getElementById("spriteId").value.trim();

    if (
        !confirm(
            "Are you sure you want to apply this sprite to ALL SVG files? This will modify all files in the ready folder."
        )
    ) {
        return;
    }

    updateStatus("Applying sprite to all files...");

    try {
        // Call the server-side API to apply to all files
        const response = await fetch("/api/apply-to-all", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                replacementFile,
                spriteId: spriteId || undefined, // Only send if not empty
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to apply to all files");
        }

        // Reload the current SVG to show the changes
        if (currentSvgFile) {
            await loadSelectedSvg();
        }

        updateStatus(
            result.message || "Applied to all files successfully",
            "success"
        );
    } catch (error) {
        console.error("Error applying to all files:", error);
        updateStatus(`Error: ${error.message}`, "error");
    }
}

// Start the animation
function startAnimation() {
    if (svgFiles.length === 0) {
        updateStatus("No SVG files available for animation", "warning");
        return;
    }

    // Stop any existing animation
    stopAnimation();

    // Get the animation speed
    const speed =
        parseInt(document.getElementById("animationSpeed").value) || 30;

    // Make sure speed is at least 10ms
    const animationSpeed = Math.max(10, speed);

    updateStatus(`Starting animation with ${animationSpeed}ms interval...`);

    // Start from the current file or the first file
    currentFileIndex = currentSvgFile ? svgFiles.indexOf(currentSvgFile) : 0;
    if (currentFileIndex < 0) currentFileIndex = 0;

    // Set up the animation interval
    animationInterval = setInterval(async () => {
        // Move to the next file
        currentFileIndex = (currentFileIndex + 1) % svgFiles.length;

        // Load the file
        const selector = document.getElementById("svgFileSelector");
        selector.value = svgFiles[currentFileIndex];
        await loadSelectedSvg();
    }, animationSpeed);
}

// Stop the animation
function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        updateStatus("Animation stopped", "success");
    }
}
