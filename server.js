const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;

// Middleware
app.use(express.static(__dirname));
app.use(express.json());

// Serve the main HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// API endpoint to get all animation folders
app.get("/api/animation-folders", (req, res) => {
    const baseFolder = path.join(__dirname, "animation-body-full/rogue");

    try {
        const items = fs.readdirSync(baseFolder);
        const folders = items.filter((item) => {
            const itemPath = path.join(baseFolder, item);
            return fs.statSync(itemPath).isDirectory() && item !== "female"; // Exclude female folder
        });

        res.json(folders);
    } catch (error) {
        console.error("Error reading animation folders:", error);
        res.status(500).json({ error: "Failed to read animation folders" });
    }
});

// API endpoint to get all SVG files in a specific animation folder
app.get("/api/svg-files", (req, res) => {
    const animationFolder = req.query.folder || "ready";
    const folderPath = path.join(
        __dirname,
        "animation-body-full/rogue",
        animationFolder,
    );

    try {
        let allSvgFiles = [];

        // Check if the folder exists
        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({
                error: `Animation folder '${animationFolder}' not found`,
            });
        }

        // Read the contents of the animation folder
        const items = fs.readdirSync(folderPath);

        for (const item of items) {
            const itemPath = path.join(folderPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isFile() && item.endsWith(".svg")) {
                // Direct SVG file in the animation folder
                allSvgFiles.push(item);
            } else if (stat.isDirectory()) {
                // Subdirectory (like start, loop, end) - read SVG files from it
                try {
                    const subFiles = fs.readdirSync(itemPath);
                    const subSvgFiles = subFiles
                        .filter((file) => file.endsWith(".svg"))
                        .map((file) => `${item}/${file}`);
                    allSvgFiles.push(...subSvgFiles);
                } catch (subErr) {
                    console.warn(`Error reading subdirectory ${item}:`, subErr);
                }
            }
        }

        // Sort files numerically instead of alphabetically
        allSvgFiles.sort((a, b) => {
            // Extract the numeric part of the filename (before the .svg extension)
            const numA = parseInt(a.replace(/^.*\//, "").replace(/\.svg$/, ""));
            const numB = parseInt(b.replace(/^.*\//, "").replace(/\.svg$/, ""));

            // If both are valid numbers, sort numerically
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }

            // Fall back to alphabetical sort if not numeric
            return a.localeCompare(b);
        });

        res.json(allSvgFiles);
    } catch (error) {
        console.error(`Error reading directory for ${animationFolder}:`, error);
        res.status(500).json({
            error: `Failed to read directory for ${animationFolder}`,
        });
    }
});

// API endpoint to get all replacement SVG files in the body-parts/rogue folder
app.get("/api/replacement-files", (req, res) => {
    const baseFolder = path.join(__dirname, "body-parts/rogue");
    const categories = [
        "male/mouth",
        "male/head",
        "male/hair",
        "male/eyes",
        "female/mouth",
        "female/head",
        "female/hair",
        "female/eyes",
        "male/other",
        "default/female", // Added to include female torso and other default female parts
    ];

    const allFiles = [];

    // Read files from each category folder
    categories.forEach((category) => {
        const folderPath = path.join(baseFolder, category);
        if (fs.existsSync(folderPath)) {
            try {
                const files = fs.readdirSync(folderPath);
                const svgFiles = files.filter((file) => file.endsWith(".svg"));
                svgFiles.forEach((file) => {
                    allFiles.push(`body-parts/rogue/${category}/${file}`);
                });
            } catch (error) {
                console.error(`Error reading directory ${category}:`, error);
            }
        }
    });

    // Also include files in the root folder
    try {
        const rootFiles = fs.readdirSync(baseFolder);
        const rootSvgFiles = rootFiles.filter((file) => file.endsWith(".svg"));
        rootSvgFiles.forEach((file) => {
            allFiles.push(`body-parts/rogue/${file}`);
        });
    } catch (error) {
        console.error("Error reading root directory:", error);
    }

    res.json(allFiles);
});

// API endpoint to restore all SVG files from backups
app.post("/api/restore-all-svg", (req, res) => {
    try {
        const { animationFolder } = req.body;

        if (!animationFolder) {
            return res
                .status(400)
                .json({ error: "Missing animationFolder parameter" });
        }

        const animationFolderPath = path.join(
            __dirname,
            "animation-body-full/rogue",
            animationFolder,
        );
        const backupsFolderPath = path.join(
            __dirname,
            "backups",
            animationFolder,
        );

        // Check if backups folder exists
        if (!fs.existsSync(backupsFolderPath)) {
            return res.status(404).json({
                error: `Backups folder not found for ${animationFolder}`,
            });
        }

        // Check if animation folder exists
        if (!fs.existsSync(animationFolderPath)) {
            return res.status(404).json({
                error: `Animation folder '${animationFolder}' not found`,
            });
        }

        const results = [];

        // Function to recursively restore files
        function restoreFilesRecursively(
            backupDir,
            targetDir,
            relativePath = "",
        ) {
            const items = fs.readdirSync(backupDir);

            items.forEach((item) => {
                const backupItemPath = path.join(backupDir, item);
                const targetItemPath = path.join(targetDir, item);
                const currentRelativePath = relativePath
                    ? `${relativePath}/${item}`
                    : item;

                const stat = fs.statSync(backupItemPath);

                if (stat.isFile() && item.endsWith(".svg")) {
                    try {
                        // Ensure target directory exists
                        const targetDirPath = path.dirname(targetItemPath);
                        if (!fs.existsSync(targetDirPath)) {
                            fs.mkdirSync(targetDirPath, { recursive: true });
                        }

                        fs.copyFileSync(backupItemPath, targetItemPath);
                        results.push({
                            fileName: currentRelativePath,
                            status: "restored",
                        });
                    } catch (err) {
                        console.error(
                            `Error restoring ${currentRelativePath}:`,
                            err,
                        );
                        results.push({
                            fileName: currentRelativePath,
                            status: "error",
                            message: err.message,
                        });
                    }
                } else if (stat.isDirectory()) {
                    // Recursively restore subdirectory
                    restoreFilesRecursively(
                        backupItemPath,
                        targetItemPath,
                        currentRelativePath,
                    );
                }
            });
        }

        // Start recursive restoration
        restoreFilesRecursively(backupsFolderPath, animationFolderPath);

        if (results.length === 0) {
            return res.status(404).json({ error: "No backup files found" });
        }

        const successCount = results.filter(
            (r) => r.status === "restored",
        ).length;
        const errorCount = results.filter((r) => r.status === "error").length;

        res.json({
            success: true,
            message: `Restored ${successCount} files from ${animationFolder}, ${errorCount} errors`,
            results,
        });
    } catch (error) {
        console.error("Error in batch restore:", error);
        res.status(500).json({
            error: error.message || "Failed to restore files",
        });
    }
});

// API endpoint to replace any sprite while preserving transform
app.post("/api/replace-sprite", async (req, res) => {
    try {
        const { fileName, replacementFile, spriteId } = req.body;

        if (!fileName || !replacementFile) {
            return res.status(400).json({
                error: "Missing fileName or replacementFile parameter",
            });
        }

        const filePath = path.join(
            __dirname,
            "animation-body-full/rogue/ready",
            fileName,
        );
        const replacementSvgPath = path.join(__dirname, replacementFile);

        // Check if files exist
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Source SVG file not found" });
        }

        if (!fs.existsSync(replacementSvgPath)) {
            return res
                .status(404)
                .json({ error: "Replacement SVG file not found" });
        }

        // Create a backup if it doesn't exist
        // Use standalone backup folder structure: backups/ready/
        const backupPath = path.join(__dirname, "backups/ready", fileName);

        // Ensure the backups directory exists
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
        }

        // Read the SVG files
        const svgContent = fs.readFileSync(filePath, "utf8");
        const replacementSvgContent = fs.readFileSync(
            replacementSvgPath,
            "utf8",
        );

        // Parse the SVGs
        const parser = new (require("xmldom").DOMParser)();
        const svgDoc = parser.parseFromString(svgContent, "text/xml");
        const replacementDoc = parser.parseFromString(
            replacementSvgContent,
            "text/xml",
        );

        // Get replacement paths
        const replacementPaths = replacementDoc.getElementsByTagName("path");
        if (replacementPaths.length === 0) {
            return res
                .status(400)
                .json({ error: "No paths found in replacement SVG" });
        }

        let targetSprite = null;
        let updatedCount = 0;

        // If a specific sprite ID was provided, use that
        if (spriteId) {
            targetSprite = svgDoc.getElementById(spriteId);
            if (!targetSprite) {
                return res
                    .status(404)
                    .json({ error: `Sprite with ID ${spriteId} not found` });
            }

            console.log(`Using specified sprite ID: ${spriteId}`);

            // Process the sprite directly
            await processSprite(targetSprite);
            updatedCount = 1;
        } else {
            // Otherwise, find all sprite elements
            const spriteElements = [];
            const allElements = svgDoc.getElementsByTagName("*");

            for (let i = 0; i < allElements.length; i++) {
                const element = allElements[i];
                if (element.nodeType === 1 && element.hasAttribute("id")) {
                    const id = element.getAttribute("id");
                    if (id.startsWith("sprite")) {
                        spriteElements.push(element);
                    }
                }
            }

            if (spriteElements.length === 0) {
                return res
                    .status(404)
                    .json({ error: "No sprite elements found in SVG" });
            }

            console.log(`Found ${spriteElements.length} sprite elements`);

            // Process the first sprite found
            await processSprite(spriteElements[0]);
            updatedCount = 1;
        }

        // Function to process a sprite element
        async function processSprite(spriteElement) {
            console.log(
                `Processing sprite element: ${spriteElement.getAttribute(
                    "id",
                )}`,
            );

            // First check if this is a direct shape element with paths
            const directPaths = spriteElement.getElementsByTagName("path");
            if (directPaths.length > 0) {
                console.log(
                    `Found ${directPaths.length} paths directly in sprite element`,
                );
                // Use the sprite element directly as it contains paths
                const shapeElement = spriteElement;

                // Get the transform of the shape element (for debugging purposes)
                const shapeTransform = shapeElement.getAttribute("transform");
                console.log(`Shape transform: ${shapeTransform || "none"}`);

                // Clear existing paths in the shape element
                const existingPaths = shapeElement.getElementsByTagName("path");
                const pathsToRemove = [];
                for (let i = 0; i < existingPaths.length; i++) {
                    pathsToRemove.push(existingPaths[i]);
                }

                console.log(`Removing ${pathsToRemove.length} existing paths`);

                // Remove the paths
                pathsToRemove.forEach((path) => {
                    if (path.parentNode) {
                        path.parentNode.removeChild(path);
                    }
                });

                // Add new paths from the replacement SVG
                console.log(`Adding ${replacementPaths.length} new paths`);
                for (let i = 0; i < replacementPaths.length; i++) {
                    const pathNode = replacementPaths[i].cloneNode(true);
                    shapeElement.appendChild(pathNode);
                }

                return;
            }

            // If no direct paths, look for use elements that reference shapes
            const useElements = spriteElement.getElementsByTagName("use");
            if (useElements.length === 0) {
                console.log(
                    "No use elements or paths found in sprite, skipping",
                );
                return;
            }

            const useElement = useElements[0];
            const shapeHref = useElement.getAttribute("xlink:href");
            if (!shapeHref) {
                console.log("No xlink:href found on use element, skipping");
                return;
            }

            const shapeId = shapeHref.substring(1);
            console.log(`Looking for shape with ID: ${shapeId}`);
            const shapeElement = svgDoc.getElementById(shapeId);

            if (!shapeElement) {
                console.log(
                    `Shape element with ID ${shapeId} not found, skipping`,
                );
                return;
            }

            // Get the transform of the shape element (for debugging purposes)
            const shapeTransform = shapeElement.getAttribute("transform");
            console.log(`Shape transform: ${shapeTransform || "none"}`);
            // We're preserving the transform by not modifying it

            // Clear existing paths in the shape element
            const existingPaths = shapeElement.getElementsByTagName("path");
            const pathsToRemove = [];
            for (let i = 0; i < existingPaths.length; i++) {
                pathsToRemove.push(existingPaths[i]);
            }

            console.log(`Removing ${pathsToRemove.length} existing paths`);

            // Remove the paths
            pathsToRemove.forEach((path) => {
                if (path.parentNode) {
                    path.parentNode.removeChild(path);
                }
            });

            // Add new paths from the replacement SVG
            console.log(`Adding ${replacementPaths.length} new paths`);
            for (let i = 0; i < replacementPaths.length; i++) {
                const pathNode = replacementPaths[i].cloneNode(true);
                shapeElement.appendChild(pathNode);
            }
        }

        // Convert back to string and save
        const serializer = new (require("xmldom").XMLSerializer)();
        const modifiedContent = serializer.serializeToString(svgDoc);

        fs.writeFileSync(filePath, modifiedContent, "utf8");

        res.json({
            success: true,
            message: `Updated ${updatedCount} sprite element${
                updatedCount !== 1 ? "s" : ""
            } in ${fileName}`,
        });
    } catch (error) {
        console.error("Error replacing sprite:", error);
        res.status(500).json({
            error: error.message || "Failed to replace sprite",
        });
    }
});

// Old API endpoint removed - replaced with updated version below that supports animation folders

// API endpoint to remove hat from an SVG
app.post("/api/remove-hat", async (req, res) => {
    try {
        const { fileName } = req.body;

        if (!fileName) {
            return res
                .status(400)
                .json({ error: "Missing fileName parameter" });
        }

        // Determine the folder path based on character type (extract from the request path if needed)
        const characterType = fileName.includes("/female/") ? "female" : "male";
        const folderPath =
            characterType === "female"
                ? path.join(__dirname, "animation-body-full/rogue/female/ready")
                : path.join(__dirname, "animation-body-full/rogue/ready");

        const filePath = path.join(folderPath, fileName);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "SVG file not found" });
        }

        // Create a backup if it doesn't exist
        // Use standalone backup folder structure: backups/<animation-folder-name>/
        const backupDir = path.join(__dirname, "backups", animationFolder);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupPath = path.join(backupDir, fileName);
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
        }

        // Read the SVG file
        const svgContent = fs.readFileSync(filePath, "utf8");

        // Parse the SVG
        const parser = new (require("xmldom").DOMParser)();
        const svgDoc = parser.parseFromString(svgContent, "text/xml");

        // Find hat elements by character name or ID pattern
        let hatElements = [];
        const allElements = svgDoc.getElementsByTagName("*");

        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            if (element.nodeType !== 1) continue; // Skip non-element nodes

            // Check for hat-related character names
            const characterName = element.getAttribute("ffdec:characterName");
            if (characterName) {
                const lcName = characterName.toLowerCase();
                // Include hat-related names but explicitly exclude cloaks/capes
                if (
                    (lcName.includes("hat") ||
                        lcName.includes("cap") ||
                        lcName.includes("helmet") ||
                        lcName === "a_Hat" ||
                        lcName === "a_Headgear") &&
                    !lcName.includes("cape") &&
                    !lcName.includes("cloak")
                ) {
                    console.log(
                        `Found hat by character name: ${characterName}`,
                    );
                    hatElements.push(element);
                    continue;
                }
            }

            // Check for hat-related IDs
            const id = element.getAttribute("id");
            if (id) {
                const lcId = id.toLowerCase();
                // Include hat-related IDs but explicitly exclude cloaks/capes
                if (
                    (lcId.includes("hat") ||
                        lcId.includes("cap") ||
                        lcId.includes("helmet") ||
                        lcId === "a_hat" ||
                        lcId.includes("headgear")) &&
                    !lcId.includes("cape") &&
                    !lcId.includes("cloak")
                ) {
                    console.log(`Found hat by ID: ${id}`);
                    hatElements.push(element);
                }
            }
        }

        if (hatElements.length === 0) {
            return res
                .status(404)
                .json({ error: "No hat elements found in SVG" });
        }

        // Remove hat elements
        let removedCount = 0;
        hatElements.forEach((element) => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                removedCount++;
            }
        });

        // Convert back to string and save
        const serializer = new (require("xmldom").XMLSerializer)();
        const modifiedContent = serializer.serializeToString(svgDoc);

        fs.writeFileSync(filePath, modifiedContent, "utf8");

        res.json({
            success: true,
            message: `Removed ${removedCount} hat element${
                removedCount !== 1 ? "s" : ""
            } from ${fileName}`,
        });
    } catch (error) {
        console.error("Error removing hat:", error);
        res.status(500).json({
            error: error.message || "Failed to remove hat",
        });
    }
});

// API endpoint to toggle accessories in an SVG
app.post("/api/toggle-accessories", async (req, res) => {
    try {
        const { fileName } = req.body;

        if (!fileName) {
            return res
                .status(400)
                .json({ error: "Missing fileName parameter" });
        }

        // Determine the folder path based on character type (extract from the request path if needed)
        const characterType = fileName.includes("/female/") ? "female" : "male";
        const folderPath =
            characterType === "female"
                ? path.join(__dirname, "animation-body-full/rogue/female/ready")
                : path.join(__dirname, "animation-body-full/rogue/ready");

        const filePath = path.join(folderPath, fileName);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "SVG file not found" });
        }

        // Create a backup if it doesn't exist
        // Use standalone backup folder structure: backups/<animation-folder-name>/
        const backupDir = path.join(__dirname, "backups", animationFolder);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupPath = path.join(backupDir, fileName);
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
        }

        // Read the SVG file
        const svgContent = fs.readFileSync(filePath, "utf8");

        // Parse the SVG
        const parser = new (require("xmldom").DOMParser)();
        const svgDoc = parser.parseFromString(svgContent, "text/xml");

        // Find accessory elements by character name or ID pattern
        let accessoryElements = [];
        const allElements = svgDoc.getElementsByTagName("*");

        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            if (element.nodeType !== 1) continue; // Skip non-element nodes

            // Check for accessory-related character names
            const characterName = element.getAttribute("ffdec:characterName");
            if (characterName) {
                const lcName = characterName.toLowerCase();
                if (
                    lcName.includes("accessory") ||
                    lcName.includes("jewelry") ||
                    lcName.includes("necklace") ||
                    lcName.includes("earring") ||
                    lcName.includes("bracelet") ||
                    lcName.includes("cape") ||
                    lcName.includes("cloak") ||
                    lcName === "a_Cape" ||
                    lcName === "a_Cloak"
                ) {
                    console.log(
                        `Found accessory by character name: ${characterName}`,
                    );
                    accessoryElements.push(element);
                    continue;
                }
            }

            // Check for accessory-related IDs
            const id = element.getAttribute("id");
            if (id) {
                const lcId = id.toLowerCase();
                if (
                    lcId.includes("accessory") ||
                    lcId.includes("jewelry") ||
                    lcId.includes("necklace") ||
                    lcId.includes("earring") ||
                    lcId.includes("bracelet") ||
                    lcId.includes("cape") ||
                    lcId.includes("cloak") ||
                    lcId === "a_cape" ||
                    lcId === "a_cloak"
                ) {
                    console.log(`Found accessory by ID: ${id}`);
                    accessoryElements.push(element);
                }
            }
        }

        if (accessoryElements.length === 0) {
            return res
                .status(404)
                .json({ error: "No accessory elements found in SVG" });
        }

        // Toggle visibility of accessory elements
        let toggledCount = 0;
        accessoryElements.forEach((element) => {
            // Check current visibility
            const currentVisibility = element.getAttribute("visibility");
            const currentDisplay = element.getAttribute("display");

            // Toggle visibility
            if (currentVisibility === "hidden" || currentDisplay === "none") {
                element.removeAttribute("visibility");
                element.removeAttribute("display");
            } else {
                element.setAttribute("visibility", "hidden");
            }

            toggledCount++;
        });

        // Convert back to string and save
        const serializer = new (require("xmldom").XMLSerializer)();
        const modifiedContent = serializer.serializeToString(svgDoc);

        fs.writeFileSync(filePath, modifiedContent, "utf8");

        res.json({
            success: true,
            message: `Toggled ${toggledCount} accessory element${
                toggledCount !== 1 ? "s" : ""
            } in ${fileName}`,
        });
    } catch (error) {
        console.error("Error toggling accessories:", error);
        res.status(500).json({
            error: error.message || "Failed to toggle accessories",
        });
    }
});

// API endpoint to remove hats from all SVG files
app.post("/api/remove-hat-all", async (req, res) => {
    try {
        const { characterType } = req.body;

        // Determine the folder path based on character type
        const folderPath =
            characterType === "female"
                ? path.join(__dirname, "animation-body-full/rogue/female/ready")
                : path.join(__dirname, "animation-body-full/rogue/ready");

        // Check if folder exists
        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({
                error: `Folder for ${characterType} character not found`,
            });
        }

        // Get all SVG files in the folder
        const files = fs
            .readdirSync(folderPath)
            .filter((file) => file.endsWith(".svg"));

        if (files.length === 0) {
            return res.status(404).json({ error: "No SVG files found" });
        }

        const results = [];

        // Process each file
        for (const fileName of files) {
            try {
                const filePath = path.join(folderPath, fileName);

                // Create a backup if it doesn't exist
                // Use standalone backup folder structure: backups/<animation-folder-name>/
                const backupDir = path.join(
                    __dirname,
                    "backups",
                    animationFolder,
                );
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }

                const backupPath = path.join(backupDir, fileName);
                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(filePath, backupPath);
                }

                // Read the SVG file
                const svgContent = fs.readFileSync(filePath, "utf8");

                // Parse the SVG
                const parser = new (require("xmldom").DOMParser)();
                const svgDoc = parser.parseFromString(svgContent, "text/xml");

                // Find hat elements by character name or ID pattern
                let hatElements = [];
                const allElements = svgDoc.getElementsByTagName("*");

                for (let i = 0; i < allElements.length; i++) {
                    const element = allElements[i];
                    if (element.nodeType !== 1) continue; // Skip non-element nodes

                    // Check for hat-related character names
                    const characterName = element.getAttribute(
                        "ffdec:characterName",
                    );
                    if (characterName) {
                        const lcName = characterName.toLowerCase();
                        // Include hat-related names but explicitly exclude cloaks/capes
                        if (
                            (lcName.includes("hat") ||
                                lcName.includes("cap") ||
                                lcName.includes("helmet") ||
                                lcName === "a_hat" ||
                                lcName === "a_headgear") &&
                            !lcName.includes("cape") &&
                            !lcName.includes("cloak")
                        ) {
                            console.log(
                                `Found hat by character name: ${characterName} in ${fileName}`,
                            );
                            hatElements.push(element);
                            continue;
                        }
                    }

                    // Check for hat-related IDs
                    const id = element.getAttribute("id");
                    if (id) {
                        const lcId = id.toLowerCase();
                        // Include hat-related IDs but explicitly exclude cloaks/capes
                        if (
                            (lcId.includes("hat") ||
                                lcId.includes("cap") ||
                                lcId.includes("helmet") ||
                                lcId === "a_hat" ||
                                lcId.includes("headgear")) &&
                            !lcId.includes("cape") &&
                            !lcId.includes("cloak")
                        ) {
                            console.log(
                                `Found hat by ID: ${id} in ${fileName}`,
                            );
                            hatElements.push(element);
                        }
                    }
                }

                // Remove hat elements
                let removedCount = 0;
                hatElements.forEach((element) => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                        removedCount++;
                    }
                });

                // Convert back to string and save
                const serializer = new (require("xmldom").XMLSerializer)();
                const modifiedContent = serializer.serializeToString(svgDoc);

                fs.writeFileSync(filePath, modifiedContent, "utf8");

                results.push({
                    fileName,
                    status: "success",
                    removedCount,
                });
            } catch (error) {
                console.error(`Error processing ${fileName}:`, error);
                results.push({
                    fileName,
                    status: "error",
                    message: error.message,
                });
            }
        }

        const successCount = results.filter(
            (r) => r.status === "success",
        ).length;
        const totalRemoved = results.reduce(
            (sum, r) => sum + (r.removedCount || 0),
            0,
        );
        const errorCount = results.filter((r) => r.status === "error").length;

        res.json({
            success: true,
            message: `Removed hats from ${successCount} files (${totalRemoved} elements total), ${errorCount} errors`,
            results,
        });
    } catch (error) {
        console.error("Error removing hats from all files:", error);
        res.status(500).json({
            error: error.message || "Failed to remove hats from all files",
        });
    }
});

// Updated apply-to-all endpoint to support animation folders and nested structure
app.post("/api/apply-to-all", async (req, res) => {
    try {
        const {
            replacementFile,
            spriteId,
            animationFolder,
            modifiedSpriteData,
        } = req.body;

        if (!replacementFile && !modifiedSpriteData) {
            return res.status(400).json({
                error: "Missing replacementFile or modifiedSpriteData parameter",
            });
        }

        if (!animationFolder) {
            return res
                .status(400)
                .json({ error: "Missing animationFolder parameter" });
        }

        // Determine the folder path based on animation folder
        const animationFolderPath = path.join(
            __dirname,
            "animation-body-full/rogue",
            animationFolder,
        );

        // Always require the replacement file path
        const replacementSvgPath = path.join(__dirname, replacementFile);

        // Check if replacement file exists
        if (!fs.existsSync(replacementSvgPath)) {
            return res
                .status(404)
                .json({ error: "Replacement SVG file not found" });
        }

        // Check if animation folder exists
        if (!fs.existsSync(animationFolderPath)) {
            return res.status(404).json({
                error: `Animation folder '${animationFolder}' not found`,
            });
        }

        // Get all SVG files in the animation folder (including nested folders)
        let allSvgFiles = [];

        const items = fs.readdirSync(animationFolderPath);

        for (const item of items) {
            // Skip backup directories
            if (item === "backups") {
                continue;
            }

            const itemPath = path.join(animationFolderPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isFile() && item.endsWith(".svg")) {
                // Direct SVG file in the animation folder
                allSvgFiles.push({ relativePath: item, fullPath: itemPath });
            } else if (stat.isDirectory()) {
                // Subdirectory (like start, loop, end) - read SVG files from it
                try {
                    const subFiles = fs.readdirSync(itemPath);
                    const subSvgFiles = subFiles
                        .filter((file) => file.endsWith(".svg"))
                        .map((file) => ({
                            relativePath: `${item}/${file}`,
                            fullPath: path.join(itemPath, file),
                        }));
                    allSvgFiles.push(...subSvgFiles);
                } catch (subErr) {
                    console.warn(`Error reading subdirectory ${item}:`, subErr);
                }
            }
        }

        if (allSvgFiles.length === 0) {
            return res.status(404).json({
                error: `No SVG files found in ${animationFolder} folder`,
            });
        }

        let replacementPaths = [];
        const parser = new (require("xmldom").DOMParser)();

        // Always read the replacement SVG file
        {
            // Read the replacement SVG file
            const replacementSvgContent = fs.readFileSync(
                replacementSvgPath,
                "utf8",
            );

            // Parse the replacement SVG
            const replacementDoc = parser.parseFromString(
                replacementSvgContent,
                "text/xml",
            );

            // Get replacement paths
            const pathElements = replacementDoc.getElementsByTagName("path");
            for (let i = 0; i < pathElements.length; i++) {
                replacementPaths.push(pathElements[i]);
            }

            console.log(`Using ${replacementPaths.length} paths from replacement file`);
        }

        if (replacementPaths.length === 0) {
            return res
                .status(400)
                .json({ error: "No paths found in replacement data" });
        }

        // Helper to apply color-related attributes
        function applyColorAttrs(target, source) {
            if (!source) return;
            const allowed = [
                "fill",
                "stroke",
                "style",
                "fill-opacity",
                "stroke-opacity",
                "opacity",
            ];
            allowed.forEach((attr) => {
                if (source[attr] !== undefined && source[attr] !== null) {
                    target.setAttribute(attr, source[attr]);
                }
            });
        }

        // If we received modified sprite data, merge its color attributes
        // Also build a map for referenced shapes so their colors are preserved
        const shapeModMap = {};
        if (modifiedSpriteData) {
            if (Array.isArray(modifiedSpriteData.paths)) {
                replacementPaths.forEach((p, idx) => {
                    const mod = modifiedSpriteData.paths[idx];
                    applyColorAttrs(p, mod);
                });
            }

            if (Array.isArray(modifiedSpriteData.referencedShapes)) {
                modifiedSpriteData.referencedShapes.forEach((ref) => {
                    const key = (ref.shapeId || "").replace("#", "");
                    if (!shapeModMap[key]) shapeModMap[key] = [];
                    shapeModMap[key].push(ref.pathData);
                });
            }
        }

        const results = [];

        // Process each SVG file
        for (const fileInfo of allSvgFiles) {
            try {
                const { relativePath, fullPath } = fileInfo;

                // Create a backup if it doesn't exist
                // Use standalone backup folder structure: backups/<animation-folder-name>/
                const backupBasePath = path.join(
                    __dirname,
                    "backups",
                    animationFolder,
                );
                const backupPath = path.join(backupBasePath, relativePath);

                // Ensure the backups directory exists (including subdirectories)
                const backupDir = path.dirname(backupPath);
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }

                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(fullPath, backupPath);
                }

                // Read the SVG file
                const svgContent = fs.readFileSync(fullPath, "utf8");

                // Parse the SVG
                const svgDoc = parser.parseFromString(svgContent, "text/xml");

                let targetSprite = null;
                let updated = false;

                // If a specific sprite ID was provided, use that
                if (spriteId) {
                    targetSprite = svgDoc.getElementById(spriteId);
                    if (targetSprite) {
                        await processSprite(targetSprite);
                        updated = true;
                    }
                } else {
                    // Otherwise, find all sprite elements
                    const spriteElements = [];
                    const allElements = svgDoc.getElementsByTagName("*");

                    for (let i = 0; i < allElements.length; i++) {
                        const element = allElements[i];
                        if (
                            element.nodeType === 1 &&
                            element.hasAttribute("id")
                        ) {
                            const id = element.getAttribute("id");
                            if (id.startsWith("sprite")) {
                                spriteElements.push(element);
                            }
                        }
                    }

                    // Process ALL sprites found, not just the first one
                    if (spriteElements.length > 0) {
                        console.log(
                            `Found ${spriteElements.length} sprites in ${relativePath}`,
                        );
                        for (const spriteElement of spriteElements) {
                            await processSprite(spriteElement);
                        }
                        updated = true;
                    }
                }

                // Function to process a sprite element
                async function processSprite(spriteElement) {
                    console.log(
                        `Processing sprite element: ${spriteElement.getAttribute(
                            "id",
                        )} in ${relativePath}`,
                    );

                    // First check if this is a direct shape element with paths
                    const directPaths =
                        spriteElement.getElementsByTagName("path");
                    if (directPaths.length > 0) {
                        // Use the sprite element directly as it contains paths
                        const shapeElement = spriteElement;

                        // Clear existing paths in the shape element
                        const existingPaths =
                            shapeElement.getElementsByTagName("path");
                        const pathsToRemove = [];
                        for (let i = 0; i < existingPaths.length; i++) {
                            pathsToRemove.push(existingPaths[i]);
                        }

                        // Remove the paths
                        pathsToRemove.forEach((path) => {
                            if (path.parentNode) {
                                path.parentNode.removeChild(path);
                            }
                        });

                        // Add new paths from the replacement SVG
                        for (let i = 0; i < replacementPaths.length; i++) {
                            const pathNode =
                                replacementPaths[i].cloneNode(true);
                            shapeElement.appendChild(pathNode);
                        }

                        return;
                    }

                    // If no direct paths, look for use elements that reference shapes
                    const useElements =
                        spriteElement.getElementsByTagName("use");
                    if (useElements.length === 0) {
                        return;
                    }

                    const useElement = useElements[0];
                    const shapeHref =
                        useElement.getAttribute("xlink:href") ||
                        useElement.getAttribute("href");
                    if (!shapeHref) {
                        return;
                    }

                    const shapeId = shapeHref.replace("#", "");
                    const shapeElement = svgDoc.getElementById(shapeId);

                    if (!shapeElement) {
                        return;
                    }

                    // Clear existing paths in the shape element
                    const existingPaths =
                        shapeElement.getElementsByTagName("path");
                    const pathsToRemove = [];
                    for (let i = 0; i < existingPaths.length; i++) {
                        pathsToRemove.push(existingPaths[i]);
                    }

                    // Remove the paths
                    pathsToRemove.forEach((path) => {
                        if (path.parentNode) {
                            path.parentNode.removeChild(path);
                        }
                    });

                    // Add new paths from the replacement SVG (color already applied)
                    const addedPaths = [];
                    for (let i = 0; i < replacementPaths.length; i++) {
                        const node = replacementPaths[i].cloneNode(true);
                        shapeElement.appendChild(node);
                        addedPaths.push(node);
                    }

                    // Apply color modifications if provided for this shape
                    const mods = shapeModMap[shapeId];
                    if (mods) {
                        for (let i = 0; i < addedPaths.length && i < mods.length; i++) {
                            applyColorAttrs(addedPaths[i], mods[i]);
                        }
                    }
                }

                if (updated) {
                    // Convert back to string and save
                    const serializer = new (require("xmldom").XMLSerializer)();
                    const modifiedContent =
                        serializer.serializeToString(svgDoc);

                    fs.writeFileSync(fullPath, modifiedContent, "utf8");

                    results.push({
                        fileName: relativePath,
                        status: "updated",
                    });
                } else {
                    results.push({
                        fileName: relativePath,
                        status: "skipped",
                        message: spriteId
                            ? `Sprite with ID ${spriteId} not found`
                            : "No suitable sprite found",
                    });
                }
            } catch (error) {
                console.error(
                    `Error processing ${fileInfo.relativePath}:`,
                    error,
                );
                results.push({
                    fileName: fileInfo.relativePath,
                    status: "error",
                    message: error.message,
                });
            }
        }

        const updatedCount = results.filter(
            (r) => r.status === "updated",
        ).length;
        const skippedCount = results.filter(
            (r) => r.status === "skipped",
        ).length;
        const errorCount = results.filter((r) => r.status === "error").length;

        res.json({
            success: true,
            message: `Updated ${updatedCount} files, skipped ${skippedCount} files, ${errorCount} errors`,
            results,
        });
    } catch (error) {
        console.error("Error applying to all files:", error);
        res.status(500).json({
            error: error.message || "Failed to apply to all files",
        });
    }
});

app.listen(port, () => {
    console.log(`SVG Modifier server running at http://localhost:${port}`);
});
