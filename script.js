// Global variables to store original and modified SVG content
let originalSvgContent = null;
let modifiedSvgContent = null;
let currentSvgFile = null;

// Animation variables
let animationInterval = null;
let svgFiles = [];
let currentFileIndex = 0;
let currentAnimationFolder = "ready"; // Default animation folder

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
    // Fetch and populate the selectors
    fetchAnimationFolders();
    fetchReplacementFiles();

    // Add event listeners for file and sprite operations
    document
        .getElementById("animationFolder")
        .addEventListener("change", onAnimationFolderChange);
    document
        .getElementById("svgFileSelector")
        .addEventListener("change", loadSelectedSvg);
    document
        .getElementById("replaceSprite")
        .addEventListener("click", replaceSprite);
    document
        .getElementById("analyzeSprites")
        .addEventListener("click", analyzeSprites);

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

// Fetch animation folders from the server
async function fetchAnimationFolders() {
    try {
        const response = await fetch("/api/animation-folders");
        if (!response.ok) {
            throw new Error(
                `Failed to fetch animation folders: ${response.statusText}`,
            );
        }

        const folders = await response.json();
        populateAnimationFolderSelector(folders);

        // Load files for the default folder
        if (folders.length > 0) {
            currentAnimationFolder = folders.includes("ready")
                ? "ready"
                : folders[0];
            document.getElementById("animationFolder").value =
                currentAnimationFolder;
            fetchSvgFiles();
        }
    } catch (error) {
        console.error("Error fetching animation folders:", error);
        updateStatus(
            `Error fetching animation folders: ${error.message}`,
            "error",
        );
    }
}

// Populate the animation folder selector
function populateAnimationFolderSelector(folders) {
    const selector = document.getElementById("animationFolder");
    selector.innerHTML = '<option value="">Select animation...</option>';

    folders.forEach((folder) => {
        const option = document.createElement("option");
        option.value = folder;
        option.textContent = folder.charAt(0).toUpperCase() + folder.slice(1);
        selector.appendChild(option);
    });
}

// Handle animation folder change
async function onAnimationFolderChange() {
    const selector = document.getElementById("animationFolder");
    currentAnimationFolder = selector.value;

    if (currentAnimationFolder) {
        await fetchSvgFiles();
    } else {
        // Clear the file selector
        document.getElementById("svgFileSelector").innerHTML =
            '<option value="">Select a frame...</option>';
        svgFiles = [];
    }
}

// Fetch SVG files from the server for the current animation folder
async function fetchSvgFiles() {
    if (!currentAnimationFolder) {
        updateStatus("Please select an animation folder first", "warning");
        return;
    }

    try {
        const response = await fetch(
            `/api/svg-files?folder=${currentAnimationFolder}`,
        );
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
        updateStatus(
            `Loaded ${files.length} frames from ${currentAnimationFolder}`,
            "success",
        );
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
            "error",
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

    if (!currentAnimationFolder) {
        updateStatus("Please select an animation folder first", "warning");
        return;
    }

    currentSvgFile = selectedFile;
    updateStatus(`Loading ${selectedFile}...`);

    try {
        // Construct the path based on the current animation folder
        // Handle nested paths (e.g., "start/559.svg" becomes "animation-body-full/rogue/run/start/559.svg")
        const filePath = selectedFile.includes("/")
            ? `animation-body-full/rogue/${currentAnimationFolder}/${selectedFile}`
            : `animation-body-full/rogue/${currentAnimationFolder}/${selectedFile}`;

        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load file: ${response.statusText}`);
        }

        const svgContent = await response.text();
        originalSvgContent = svgContent;
        modifiedSvgContent = svgContent;

        displaySvg(svgContent);
        updateStatus(
            `Loaded ${selectedFile} from ${currentAnimationFolder}`,
            "success",
        );
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
        "spriteReplacementFile",
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
                animationFolder: currentAnimationFolder,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to replace sprite");
        }

        // Reload the SVG to show the changes if one is loaded, but preserve any color modifications
        if (currentSvgFile) {
            // Store the current modified sprite data before reloading
            const currentSpriteId = document
                .getElementById("spriteId")
                .value.trim();
            let preservedModifications = null;

            if (modifiedSvgContent && currentSpriteId) {
                preservedModifications = extractModifiedSprite(currentSpriteId);
            }

            await loadSelectedSvg();

            // If we had modifications, reapply them to the newly loaded SVG
            if (
                preservedModifications &&
                preservedModifications.hasModifications
            ) {
                console.log(
                    "Reapplying color modifications after sprite replacement",
                );
                await reapplyColorModifications(
                    currentSpriteId,
                    preservedModifications,
                );
            }
        }

        updateStatus(
            result.message || "Sprite replaced successfully in all files",
            "success",
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
    const animationFolder = document.getElementById("animationFolder").value;

    if (!animationFolder) {
        updateStatus("Please select an animation folder first", "warning");
        return;
    }

    if (
        !confirm(
            `Are you sure you want to restore ALL SVG files in '${animationFolder}' to their original state? This cannot be undone.`,
        )
    ) {
        return;
    }

    updateStatus(`Restoring all SVG files in ${animationFolder}...`);

    try {
        const response = await fetch("/api/restore-all-svg", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ animationFolder }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to restore files");
        }

        const result = await response.json();

        // Display results
        const successCount = result.results.filter(
            (r) => r.status === "restored",
        ).length;
        const errorCount = result.results.filter(
            (r) => r.status === "error",
        ).length;

        updateStatus(
            `Restored ${successCount} files, ${errorCount} errors`,
            "success",
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

// Toggle sprite list visibility and analyze sprites
function analyzeSprites() {
    console.log("analyzeSprites function called");

    const spritesList = document.getElementById("spritesList");
    const analyzeButton = document.getElementById("analyzeSprites");
    const currentState = analyzeButton.getAttribute("data-state");

    // Toggle visibility
    if (currentState === "visible") {
        // Hide the list
        spritesList.classList.remove("active");
        spritesList.style.display = "none";
        analyzeButton.setAttribute("data-state", "hidden");
        analyzeButton.textContent = "Show All";

        // Hide color picker section
        document.getElementById("colorPickerSection").style.display = "none";
        return;
    }

    if (!modifiedSvgContent) {
        updateStatus("Please load an SVG file first", "warning");
        return;
    }

    // Clear any existing content
    spritesList.innerHTML = "";

    try {
        // Parse the SVG content
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(
            modifiedSvgContent,
            "image/svg+xml",
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
                    "ffdec:characterName",
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
                    // Remove previous selection
                    document
                        .querySelectorAll(".sprite-item")
                        .forEach((el) => el.classList.remove("selected"));

                    // Mark this item as selected
                    item.classList.add("selected");

                    // Set the sprite ID in the input field
                    document.getElementById("spriteId").value = sprite.id;

                    // Show color picker for this sprite
                    showColorPicker(sprite);

                    updateStatus(
                        `Selected sprite: ${sprite.name || sprite.id}`,
                        "success",
                    );
                });

                spritesList.appendChild(item);
            });
        }

        // Show the list and update button state
        spritesList.classList.add("active");
        spritesList.style.display = "block";
        analyzeButton.setAttribute("data-state", "visible");
        analyzeButton.textContent = "Hide Sprites";

        console.log(
            `Found ${sprites.length} sprites, list should now be visible`,
        );
    } catch (error) {
        console.error("Error analyzing sprites:", error);
        updateStatus(`Error analyzing sprites: ${error.message}`, "error");
    }
}

// Show color picker interface for selected sprite
function showColorPicker(sprite) {
    const colorPickerSection = document.getElementById("colorPickerSection");
    const selectedSpriteName = document.getElementById("selectedSpriteName");
    const selectedSpriteType = document.getElementById("selectedSpriteType");
    const colorSwatches = document.getElementById("colorSwatches");

    // Set sprite name
    selectedSpriteName.textContent = sprite.name || sprite.id;

    // Determine sprite type and set badge
    const spriteName = (sprite.name || "").toLowerCase();
    let spriteType = "unknown";
    if (spriteName.includes("mouth")) {
        spriteType = "mouth";
    } else if (spriteName.includes("eye")) {
        spriteType = "eye";
    } else if (spriteName.includes("hair")) {
        spriteType = "hair";
    } else if (spriteName.includes("face") || spriteName.includes("head")) {
        spriteType = "head";
    }

    selectedSpriteType.textContent = spriteType;
    selectedSpriteType.className = `sprite-type-badge ${spriteType}`;

    // Extract colors from the sprite
    const colors = extractColorsFromSprite(sprite);

    // Clear existing swatches
    colorSwatches.innerHTML = "";

    // Create color swatches
    colors.forEach((color, index) => {
        const swatch = createColorSwatch(color, index, sprite);
        colorSwatches.appendChild(swatch);
    });

    // Show the color picker section
    colorPickerSection.style.display = "block";
}

// Extract colors from sprite element
function extractColorsFromSprite(sprite) {
    const colors = new Set();

    console.log(`Extracting colors from sprite: ${sprite.id}`);

    try {
        // Parse the current SVG to get the sprite element
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(
            modifiedSvgContent,
            "image/svg+xml",
        );
        const spriteElement = svgDoc.getElementById(sprite.id);

        if (!spriteElement) {
            console.log(`Sprite element ${sprite.id} not found`);
            return [];
        }

        // Function to extract colors from an element
        function extractFromElement(element, elementType = "element") {
            // Extract fill color
            const fill = element.getAttribute("fill");
            if (
                fill &&
                fill !== "none" &&
                fill !== "transparent" &&
                fill !== "inherit"
            ) {
                colors.add(fill);
                console.log(`Found fill color in ${elementType}: ${fill}`);
            }

            // Extract stroke color
            const stroke = element.getAttribute("stroke");
            if (
                stroke &&
                stroke !== "none" &&
                stroke !== "transparent" &&
                stroke !== "inherit"
            ) {
                colors.add(stroke);
                console.log(`Found stroke color in ${elementType}: ${stroke}`);
            }

            // Check style attribute for colors
            const style = element.getAttribute("style");
            if (style) {
                const fillMatch = style.match(/fill\s*:\s*([^;]+)/i);
                const strokeMatch = style.match(/stroke\s*:\s*([^;]+)/i);

                if (
                    fillMatch &&
                    fillMatch[1] !== "none" &&
                    fillMatch[1] !== "transparent"
                ) {
                    const fillColor = fillMatch[1].trim();
                    colors.add(fillColor);
                    console.log(
                        `Found fill color in ${elementType} style: ${fillColor}`,
                    );
                }
                if (
                    strokeMatch &&
                    strokeMatch[1] !== "none" &&
                    strokeMatch[1] !== "transparent"
                ) {
                    const strokeColor = strokeMatch[1].trim();
                    colors.add(strokeColor);
                    console.log(
                        `Found stroke color in ${elementType} style: ${strokeColor}`,
                    );
                }
            }
        }

        // Extract colors from all elements within the sprite
        const allElements = spriteElement.querySelectorAll("*");
        allElements.forEach((element) => {
            extractFromElement(element, element.tagName);
        });

        // Also extract from the sprite element itself
        extractFromElement(spriteElement, "sprite");

        // Check use elements that might reference shapes
        const useElements = spriteElement.querySelectorAll("use");
        useElements.forEach((useEl) => {
            const href =
                useEl.getAttribute("xlink:href") || useEl.getAttribute("href");
            if (href) {
                const referencedElement = svgDoc.querySelector(href);
                if (referencedElement) {
                    console.log(`Checking referenced element: ${href}`);
                    const refElements = referencedElement.querySelectorAll("*");
                    refElements.forEach((element) => {
                        extractFromElement(
                            element,
                            `referenced ${element.tagName}`,
                        );
                    });
                    extractFromElement(referencedElement, "referenced root");
                }
            }
        });
    } catch (error) {
        console.error("Error extracting colors:", error);
    }

    const colorArray = Array.from(colors).filter((color) => {
        // Filter out common default/empty colors
        return (
            color &&
            color !== "#000000" &&
            color !== "#000" &&
            color !== "black" &&
            color !== "currentColor"
        );
    });

    console.log(`Extracted ${colorArray.length} colors:`, colorArray);
    return colorArray;
}

// Create a color swatch element with interactive color picker
function createColorSwatch(color, index, sprite) {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";

    // Color preview wrapper
    const colorPickerWrapper = document.createElement("div");
    colorPickerWrapper.className = "color-picker-wrapper";

    // Color preview div
    const colorPreview = document.createElement("div");
    colorPreview.className = "color-preview";
    colorPreview.style.backgroundColor = color;

    // Hidden color input
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "color-picker-input";
    colorInput.value = normalizeColor(color);

    // Color info section
    const colorInfo = document.createElement("div");
    colorInfo.className = "color-info";

    const colorValue = document.createElement("div");
    colorValue.className = "color-value";
    colorValue.textContent = color;

    colorInfo.appendChild(colorValue);

    // Add click handler to color preview
    colorPreview.addEventListener("click", () => {
        colorInput.click();
    });

    // Store the original color for this swatch
    let currentColor = color;

    // Add change handler to color input for real-time updates
    colorInput.addEventListener("input", (e) => {
        const newColor = e.target.value;
        colorPreview.style.backgroundColor = newColor;
        colorValue.textContent = newColor;

        // Update the SVG in real-time using the current color as the old color
        updateSpriteColor(sprite, currentColor, newColor);

        // Update the current color to the new color for future changes
        currentColor = newColor;
    });

    colorPickerWrapper.appendChild(colorPreview);
    colorPickerWrapper.appendChild(colorInput);

    swatch.appendChild(colorPickerWrapper);
    swatch.appendChild(colorInfo);

    return swatch;
}

// Normalize color to hex format for color input
function normalizeColor(color) {
    // If it's already a hex color, return it
    if (color.startsWith("#")) {
        return color;
    }

    // Handle RGB colors
    if (color.startsWith("rgb")) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        return ctx.fillStyle;
    }

    // For named colors, create a temporary element to get computed color
    const tempDiv = document.createElement("div");
    tempDiv.style.color = color;
    document.body.appendChild(tempDiv);
    const computedColor = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);

    // Convert RGB to hex
    const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        return (
            "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
        );
    }

    return "#000000"; // fallback
}

// Update sprite color in real-time - now updates ALL sprites with the same color
function updateSpriteColor(sprite, oldColor, newColor) {
    if (!modifiedSvgContent) {
        console.log("No SVG content available");
        return;
    }

    console.log(
        `Updating color across all sprites: ${oldColor} -> ${newColor} (triggered by ${sprite.id})`,
    );

    try {
        // Parse the current SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(
            modifiedSvgContent,
            "image/svg+xml",
        );

        // Check for parsing errors
        const parserError = svgDoc.querySelector("parsererror");
        if (parserError) {
            console.error("SVG parsing error:", parserError.textContent);
            return;
        }

        let updated = false;
        let updateCount = 0;
        let spritesUpdated = new Set();

        // Function to update color in an element
        function updateElementColor(element, parentSpriteId = null) {
            // Update fill attribute
            if (element.getAttribute("fill") === oldColor) {
                element.setAttribute("fill", newColor);
                updated = true;
                updateCount++;
                if (parentSpriteId) spritesUpdated.add(parentSpriteId);
                console.log(
                    `Updated fill attribute in ${
                        parentSpriteId || "element"
                    }: ${oldColor} -> ${newColor}`,
                );
            }

            // Update stroke attribute
            if (element.getAttribute("stroke") === oldColor) {
                element.setAttribute("stroke", newColor);
                updated = true;
                updateCount++;
                if (parentSpriteId) spritesUpdated.add(parentSpriteId);
                console.log(
                    `Updated stroke attribute in ${
                        parentSpriteId || "element"
                    }: ${oldColor} -> ${newColor}`,
                );
            }

            // Update style attribute
            const style = element.getAttribute("style");
            if (style) {
                let newStyle = style;
                let styleUpdated = false;

                // Update fill in style
                const fillRegex = new RegExp(
                    `fill\\s*:\\s*${oldColor.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&",
                    )}`,
                    "gi",
                );
                if (fillRegex.test(style)) {
                    newStyle = newStyle.replace(fillRegex, `fill: ${newColor}`);
                    styleUpdated = true;
                    if (parentSpriteId) spritesUpdated.add(parentSpriteId);
                    console.log(
                        `Updated fill in style in ${
                            parentSpriteId || "element"
                        }: ${oldColor} -> ${newColor}`,
                    );
                }

                // Update stroke in style
                const strokeRegex = new RegExp(
                    `stroke\\s*:\\s*${oldColor.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&",
                    )}`,
                    "gi",
                );
                if (strokeRegex.test(style)) {
                    newStyle = newStyle.replace(
                        strokeRegex,
                        `stroke: ${newColor}`,
                    );
                    styleUpdated = true;
                    if (parentSpriteId) spritesUpdated.add(parentSpriteId);
                    console.log(
                        `Updated stroke in style in ${
                            parentSpriteId || "element"
                        }: ${oldColor} -> ${newColor}`,
                    );
                }

                if (styleUpdated) {
                    element.setAttribute("style", newStyle);
                    updated = true;
                    updateCount++;
                }
            }
        }

        // Find ALL sprite elements in the SVG (not just the selected one)
        const allSpriteElements = svgDoc.querySelectorAll('[id^="sprite"]');

        console.log(
            `Found ${allSpriteElements.length} sprite elements to check for color updates`,
        );

        // Update colors in all sprite elements
        allSpriteElements.forEach((spriteElement) => {
            const spriteId = spriteElement.id;

            // Update colors in all elements within this sprite
            const allElements = spriteElement.querySelectorAll("*");
            allElements.forEach((element) =>
                updateElementColor(element, spriteId),
            );

            // Also update the sprite element itself
            updateElementColor(spriteElement, spriteId);

            // Update colors in referenced elements (defs) for this sprite
            const useElements = spriteElement.querySelectorAll("use");
            useElements.forEach((useEl) => {
                const href =
                    useEl.getAttribute("xlink:href") ||
                    useEl.getAttribute("href");
                if (href) {
                    const referencedElement = svgDoc.querySelector(href);
                    if (referencedElement) {
                        console.log(
                            `Updating referenced element ${href} for sprite ${spriteId}`,
                        );
                        const refElements =
                            referencedElement.querySelectorAll("*");
                        refElements.forEach((element) =>
                            updateElementColor(element, spriteId),
                        );
                        updateElementColor(referencedElement, spriteId);
                    }
                }
            });
        });

        // Also check for any standalone elements outside of sprites that might have the color
        const allElements = svgDoc.querySelectorAll("*");
        allElements.forEach((element) => {
            // Skip elements that are already inside sprites (to avoid double processing)
            if (!element.closest('[id^="sprite"]')) {
                updateElementColor(element, "standalone");
            }
        });

        console.log(
            `Total updates made: ${updateCount} across ${spritesUpdated.size} sprites`,
        );
        console.log(
            `Sprites updated: ${Array.from(spritesUpdated).join(", ")}`,
        );

        if (updated) {
            // Serialize the updated SVG
            const serializer = new XMLSerializer();
            modifiedSvgContent = serializer.serializeToString(svgDoc);

            // Update the preview
            displaySvg(modifiedSvgContent);
            console.log("SVG preview updated successfully");
        } else {
            console.log(
                `No instances of color ${oldColor} found in any sprites`,
            );
        }
    } catch (error) {
        console.error("Error updating sprite color:", error);
    }
}

// Extract modified sprite data for server-side replacement
function extractModifiedSprite(spriteId) {
    if (!modifiedSvgContent) {
        console.log("No modified SVG content available");
        return null;
    }

    try {
        // Parse the modified SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(
            modifiedSvgContent,
            "image/svg+xml",
        );

        // Check for parsing errors
        const parserError = svgDoc.querySelector("parsererror");
        if (parserError) {
            console.error("SVG parsing error:", parserError.textContent);
            return null;
        }

        const spriteElement = svgDoc.getElementById(spriteId);
        if (!spriteElement) {
            console.log(`Sprite element ${spriteId} not found in modified SVG`);
            return null;
        }

        // Extract all paths from the sprite
        const paths = [];
        const pathElements = spriteElement.querySelectorAll("path");

        pathElements.forEach((path) => {
            const pathData = {
                d: path.getAttribute("d"),
                fill: path.getAttribute("fill"),
                stroke: path.getAttribute("stroke"),
                style: path.getAttribute("style"),
                // Include other relevant attributes
                transform: path.getAttribute("transform"),
                opacity: path.getAttribute("opacity"),
                fillOpacity: path.getAttribute("fill-opacity"),
                strokeOpacity: path.getAttribute("stroke-opacity"),
                strokeWidth: path.getAttribute("stroke-width"),
            };

            // Only include attributes that exist
            Object.keys(pathData).forEach((key) => {
                if (pathData[key] === null || pathData[key] === undefined) {
                    delete pathData[key];
                }
            });

            paths.push(pathData);
        });

        // Also check for use elements and their referenced shapes
        const useElements = spriteElement.querySelectorAll("use");
        const referencedShapes = [];

        useElements.forEach((useEl) => {
            const href =
                useEl.getAttribute("xlink:href") || useEl.getAttribute("href");
            if (href) {
                const referencedElement = svgDoc.querySelector(href);
                if (referencedElement) {
                    const refPaths = referencedElement.querySelectorAll("path");
                    refPaths.forEach((path) => {
                        const pathData = {
                            d: path.getAttribute("d"),
                            fill: path.getAttribute("fill"),
                            stroke: path.getAttribute("stroke"),
                            style: path.getAttribute("style"),
                            transform: path.getAttribute("transform"),
                            opacity: path.getAttribute("opacity"),
                            fillOpacity: path.getAttribute("fill-opacity"),
                            strokeOpacity: path.getAttribute("stroke-opacity"),
                            strokeWidth: path.getAttribute("stroke-width"),
                        };

                        // Only include attributes that exist
                        Object.keys(pathData).forEach((key) => {
                            if (
                                pathData[key] === null ||
                                pathData[key] === undefined
                            ) {
                                delete pathData[key];
                            }
                        });

                        referencedShapes.push({
                            shapeId: href,
                            pathData: pathData,
                        });
                    });
                }
            }
        });

        const modifiedSpriteData = {
            spriteId: spriteId,
            paths: paths,
            referencedShapes: referencedShapes,
            hasModifications: paths.length > 0 || referencedShapes.length > 0,
        };

        console.log(
            `Extracted modified sprite data for ${spriteId}:`,
            modifiedSpriteData,
        );
        return modifiedSpriteData;
    } catch (error) {
        console.error("Error extracting modified sprite:", error);
        return null;
    }
}

// Reapply color modifications to the newly loaded SVG
async function reapplyColorModifications(spriteId, preservedModifications) {
    if (
        !modifiedSvgContent ||
        !preservedModifications ||
        !preservedModifications.hasModifications
    ) {
        return;
    }

    try {
        console.log(`Reapplying modifications to sprite ${spriteId}`);

        // Parse the current SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(
            modifiedSvgContent,
            "image/svg+xml",
        );

        // Check for parsing errors
        const parserError = svgDoc.querySelector("parsererror");
        if (parserError) {
            console.error("SVG parsing error:", parserError.textContent);
            return;
        }

        const spriteElement = svgDoc.getElementById(spriteId);
        if (!spriteElement) {
            console.log(`Sprite element ${spriteId} not found in reloaded SVG`);
            return;
        }

        let updated = false;

        // Apply the preserved path modifications
        const pathElements = spriteElement.querySelectorAll("path");

        // Match paths by their 'd' attribute and apply modifications
        preservedModifications.paths.forEach((modifiedPath, index) => {
            if (index < pathElements.length) {
                const pathElement = pathElements[index];

                // Apply all the modified attributes
                Object.keys(modifiedPath).forEach((attr) => {
                    if (
                        modifiedPath[attr] !== null &&
                        modifiedPath[attr] !== undefined
                    ) {
                        pathElement.setAttribute(attr, modifiedPath[attr]);
                        updated = true;
                    }
                });
            }
        });

        // Handle referenced shapes if any
        if (
            preservedModifications.referencedShapes &&
            preservedModifications.referencedShapes.length > 0
        ) {
            preservedModifications.referencedShapes.forEach((refShape) => {
                const referencedElement = svgDoc.querySelector(
                    refShape.shapeId,
                );
                if (referencedElement) {
                    const refPaths = referencedElement.querySelectorAll("path");
                    if (refPaths.length > 0) {
                        const pathElement = refPaths[0]; // Assuming single path for simplicity

                        Object.keys(refShape.pathData).forEach((attr) => {
                            if (
                                refShape.pathData[attr] !== null &&
                                refShape.pathData[attr] !== undefined
                            ) {
                                pathElement.setAttribute(
                                    attr,
                                    refShape.pathData[attr],
                                );
                                updated = true;
                            }
                        });
                    }
                }
            });
        }

        if (updated) {
            // Serialize the updated SVG
            const serializer = new XMLSerializer();
            modifiedSvgContent = serializer.serializeToString(svgDoc);

            // Update the preview
            displaySvg(modifiedSvgContent);
            console.log("Color modifications reapplied successfully");

            // Refresh the color picker if it's visible
            const colorPickerSection =
                document.getElementById("colorPickerSection");
            if (colorPickerSection.style.display !== "none") {
                // Find the sprite object and refresh the color picker
                const spritesList = document.getElementById("spritesList");
                const selectedItem = spritesList.querySelector(
                    ".sprite-item.selected",
                );
                if (selectedItem) {
                    // Trigger a refresh of the color picker
                    setTimeout(() => {
                        const sprite = { id: spriteId, name: spriteId };
                        showColorPicker(sprite);
                    }, 100);
                }
            }
        }
    } catch (error) {
        console.error("Error reapplying color modifications:", error);
    }
}

// Placeholder for removed saveSvg function

// Character type and special action functions removed for cleaner modern interface

// Apply the selected sprite to all SVG files
async function applyToAllFiles() {
    const replacementFile = document.getElementById(
        "spriteReplacementFile",
    ).value;
    if (!replacementFile) {
        updateStatus("Please select a replacement file", "warning");
        return;
    }

    // Get the optional sprite ID
    const spriteId = document.getElementById("spriteId").value.trim();
    const animationFolder = document.getElementById("animationFolder").value;

    if (!animationFolder) {
        updateStatus("Please select an animation folder first", "warning");
        return;
    }

    if (
        !confirm(
            `Are you sure you want to apply this sprite to ALL SVG files in '${animationFolder}'? This will modify all files in the folder.`,
        )
    ) {
        return;
    }

    updateStatus("Applying sprite to all files...");

    try {
        let requestBody = {
            replacementFile,
            spriteId: spriteId || undefined,
            animationFolder,
        };

        // If we have a modified SVG with color changes, extract the modified sprite
        if (modifiedSvgContent && spriteId) {
            const modifiedSpriteData = extractModifiedSprite(spriteId);
            if (modifiedSpriteData) {
                requestBody.modifiedSpriteData = modifiedSpriteData;
                console.log("Using color-modified sprite data for replacement");
            }
        }

        // Call the server-side API to apply to all files
        const response = await fetch("/api/apply-to-all", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to apply to all files");
        }

        // Reload the current SVG to show the changes, but preserve any color modifications
        if (currentSvgFile) {
            // Store the current modified sprite data before reloading
            const currentSpriteId = document
                .getElementById("spriteId")
                .value.trim();
            let preservedModifications = null;

            if (modifiedSvgContent && currentSpriteId) {
                preservedModifications = extractModifiedSprite(currentSpriteId);
            }

            await loadSelectedSvg();

            // If we had modifications, reapply them to the newly loaded SVG
            if (
                preservedModifications &&
                preservedModifications.hasModifications
            ) {
                console.log(
                    "Reapplying color modifications after sprite replacement",
                );
                await reapplyColorModifications(
                    currentSpriteId,
                    preservedModifications,
                );
            }
        }

        updateStatus(
            result.message || "Applied to all files successfully",
            "success",
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
