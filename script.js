// Global variables to store original and modified SVG content
let originalSvgContent = null;
let modifiedSvgContent = null;
let currentSvgFile = null;

// Animation variables
let animationInterval = null;
let svgFiles = [];
let currentFileIndex = 0;

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
    // Fetch and populate the file selectors
    fetchSvgFiles();
    fetchReplacementFiles();

    // Add event listeners
    document
        .getElementById("svgFileSelector")
        .addEventListener("change", loadSelectedSvg);
    document
        .getElementById("replaceSprite")
        .addEventListener("click", replaceSprite);
    document
        .getElementById("analyzeSprites")
        .addEventListener("click", analyzeSprites);
    document
        .getElementById("applyToAll")
        .addEventListener("click", applyToAllFiles);
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
        const response = await fetch("/api/svg-files");
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
        "male/face": [],
        "male/hair": [],
        "male/eyes": [],
        "female/mouth": [],
        "female/face": [],
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

// Replace any sprite in the SVG while preserving the transform
async function replaceSprite() {
    if (!modifiedSvgContent) {
        updateStatus("Please load an SVG file first", "warning");
        return;
    }

    const replacementFile = document.getElementById(
        "spriteReplacementFile"
    ).value;
    if (!replacementFile) {
        updateStatus("Please select a replacement file", "warning");
        return;
    }

    const fileName = document.getElementById("svgFileSelector").value;
    if (!fileName) {
        updateStatus("No SVG file selected", "warning");
        return;
    }

    // Get the optional sprite ID
    const spriteId = document.getElementById("spriteId").value.trim();

    updateStatus("Replacing sprite while preserving transform...");

    try {
        // Call the server-side API to replace the sprite
        const response = await fetch("/api/replace-sprite", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                fileName,
                replacementFile,
                spriteId: spriteId || undefined, // Only send if not empty
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to replace sprite");
        }

        // Reload the SVG to show the changes
        await loadSelectedSvg();
        updateStatus(
            result.message || "Sprite replaced successfully",
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
    console.log("SVG content available, proceeding with analysis");

    const spritesList = document.getElementById("spritesList");
    spritesList.innerHTML = "";

    try {
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(
            modifiedSvgContent,
            "image/svg+xml"
        );

        // Find all sprite elements and elements with character names
        const spriteElements = [];
        const allElements = svgDoc.querySelectorAll("*");

        // First pass: collect all elements with character names
        const characterNameMap = new Map();
        for (const element of allElements) {
            const characterName = element.getAttribute("ffdec:characterName");
            if (characterName) {
                // If this element has an ID, store it directly
                const id = element.getAttribute("id");
                if (id) {
                    characterNameMap.set(id, characterName);
                }

                // If it has an xlink:href, store the reference
                const href = element.getAttribute("xlink:href");
                if (href && href.startsWith("#")) {
                    const refId = href.substring(1);
                    characterNameMap.set(refId, characterName);
                }
            }
        }

        // Second pass: collect all sprite elements with their info
        for (const element of allElements) {
            const id = element.getAttribute("id");
            if (!id) continue;

            // Include all sprites and elements with character names
            if (id.startsWith("sprite") || characterNameMap.has(id)) {
                // Get additional info about the element
                let name = "";
                let info = "";

                // Check if it has a character name directly or via reference
                const directCharacterName = element.getAttribute(
                    "ffdec:characterName"
                );
                const mappedCharacterName = characterNameMap.get(id);
                const characterName =
                    directCharacterName || mappedCharacterName;

                if (characterName) {
                    name = characterName;
                    info = ` (${characterName})`;
                }

                // Check if it has paths or references a shape
                const paths = element.querySelectorAll("path").length;
                const useElements = element.querySelectorAll("use");

                if (!name && paths > 0) {
                    info = ` (${paths} paths)`;
                } else if (!name && useElements.length > 0) {
                    // Check if any use elements have character names
                    let useWithName = false;
                    for (const useElement of useElements) {
                        const useCharName = useElement.getAttribute(
                            "ffdec:characterName"
                        );
                        if (useCharName) {
                            name = useCharName;
                            info = ` (${useCharName})`;
                            useWithName = true;
                            break;
                        }

                        // Check if it references an element with a character name
                        const useHref = useElement.getAttribute("xlink:href");
                        if (useHref && useHref.startsWith("#")) {
                            const useRefId = useHref.substring(1);
                            const refCharName = characterNameMap.get(useRefId);
                            if (refCharName) {
                                name = refCharName;
                                info = ` (${refCharName} via ${useHref})`;
                                useWithName = true;
                                break;
                            }
                        }
                    }

                    // If no character names found, just show the reference
                    if (!useWithName && useElements.length > 0) {
                        const useElement = useElements[0];
                        const href = useElement.getAttribute("xlink:href");
                        if (href) {
                            info = ` (references ${href})`;
                        }
                    }
                }

                spriteElements.push({ id, name, info });
            }
        }

        if (spriteElements.length === 0) {
            spritesList.innerHTML =
                "<div class='sprite-item'>No sprite elements found</div>";
        } else {
            // First sort by character name (if available), then numerically
            spriteElements.sort((a, b) => {
                // If both have names, sort by name first
                if (a.name && b.name) {
                    return a.name.localeCompare(b.name);
                }
                // If only one has a name, prioritize it
                if (a.name) return -1;
                if (b.name) return 1;

                // Otherwise sort numerically by sprite ID
                const numA = parseInt(a.id.replace("sprite", ""));
                const numB = parseInt(b.id.replace("sprite", ""));
                return numA - numB;
            });

            // Add to the list
            spriteElements.forEach((item) => {
                const div = document.createElement("div");
                div.className = "sprite-item";

                // Create a more structured display
                if (item.name) {
                    // If it has a character name, make it prominent
                    const nameElement = document.createElement("strong");
                    nameElement.textContent = item.name;
                    nameElement.setAttribute("data-name", item.name);

                    const idElement = document.createElement("span");
                    idElement.className = "sprite-id";
                    idElement.textContent = `(${item.id})`;

                    div.appendChild(nameElement);
                    div.appendChild(document.createTextNode(" "));
                    div.appendChild(idElement);

                    // Add a special class for mouth-related sprites
                    if (
                        item.name.includes("Mouth") ||
                        item.name.includes("mouth")
                    ) {
                        div.classList.add("mouth-sprite");
                    }
                } else {
                    // Otherwise just show the ID and info
                    div.textContent = `${item.id}${item.info}`;
                }

                div.addEventListener("click", () => {
                    document.getElementById("spriteId").value = item.id;
                    spritesList.classList.remove("active");
                });
                spritesList.appendChild(div);
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
        console.log("Adding 'active' class to spritesList");
        spritesList.classList.add("active");
        // Force display with inline style
        spritesList.style.display = "block";
        console.log(
            "spritesList classes after adding 'active':",
            spritesList.className
        );
    } catch (error) {
        console.error("Error analyzing sprites:", error);
        updateStatus(`Error analyzing sprites: ${error.message}`, "error");
    }
}

// Placeholder for removed saveSvg function

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
