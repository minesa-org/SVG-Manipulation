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

// API endpoint to get all SVG files in the animation-body-full/rogue/ready folder
app.get("/api/svg-files", (req, res) => {
    // Get character type from query parameter (default to male)
    const characterType = req.query.type || "male";

    // Determine the folder path based on character type
    let folderPath;
    if (characterType === "female") {
        folderPath = path.join(
            __dirname,
            "animation-body-full/rogue/female/ready"
        );
        // If female folder doesn't exist, create it
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
    } else {
        folderPath = path.join(__dirname, "animation-body-full/rogue/ready");
    }

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error(`Error reading directory for ${characterType}:`, err);
            return res.status(500).json({
                error: `Failed to read directory for ${characterType}`,
            });
        }

        const svgFiles = files.filter((file) => file.endsWith(".svg"));

        // Sort files numerically instead of alphabetically
        svgFiles.sort((a, b) => {
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

        res.json(svgFiles);
    });
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
        const readyFolderPath = path.join(
            __dirname,
            "animation-body-full/rogue/ready"
        );
        const backupsFolderPath = path.join(readyFolderPath, "backups");

        // Check if backups folder exists
        if (!fs.existsSync(backupsFolderPath)) {
            return res.status(404).json({ error: "Backups folder not found" });
        }

        // Get all backup files
        const backupFiles = fs
            .readdirSync(backupsFolderPath)
            .filter((file) => file.endsWith(".svg"));

        if (backupFiles.length === 0) {
            return res.status(404).json({ error: "No backup files found" });
        }

        const results = [];

        // Restore each file
        backupFiles.forEach((fileName) => {
            const originalFilePath = path.join(readyFolderPath, fileName);
            const backupFilePath = path.join(backupsFolderPath, fileName);

            try {
                fs.copyFileSync(backupFilePath, originalFilePath);
                results.push({ fileName, status: "restored" });
            } catch (err) {
                console.error(`Error restoring ${fileName}:`, err);
                results.push({
                    fileName,
                    status: "error",
                    message: err.message,
                });
            }
        });

        const successCount = results.filter(
            (r) => r.status === "restored"
        ).length;
        const errorCount = results.filter((r) => r.status === "error").length;

        res.json({
            success: true,
            message: `Restored ${successCount} files, ${errorCount} errors`,
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
            fileName
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
        const backupPath = path.join(
            __dirname,
            "animation-body-full/rogue/ready/backups",
            fileName
        );

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
            "utf8"
        );

        // Parse the SVGs
        const parser = new (require("xmldom").DOMParser)();
        const svgDoc = parser.parseFromString(svgContent, "text/xml");
        const replacementDoc = parser.parseFromString(
            replacementSvgContent,
            "text/xml"
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
                `Processing sprite element: ${spriteElement.getAttribute("id")}`
            );

            // First check if this is a direct shape element with paths
            const directPaths = spriteElement.getElementsByTagName("path");
            if (directPaths.length > 0) {
                console.log(
                    `Found ${directPaths.length} paths directly in sprite element`
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
                    "No use elements or paths found in sprite, skipping"
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
                    `Shape element with ID ${shapeId} not found, skipping`
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

// API endpoint to apply a sprite to all SVG files
app.post("/api/apply-to-all", async (req, res) => {
    try {
        const { replacementFile, spriteId } = req.body;

        if (!replacementFile) {
            return res
                .status(400)
                .json({ error: "Missing replacementFile parameter" });
        }

        const readyFolderPath = path.join(
            __dirname,
            "animation-body-full/rogue/ready"
        );
        const replacementSvgPath = path.join(__dirname, replacementFile);

        // Check if replacement file exists
        if (!fs.existsSync(replacementSvgPath)) {
            return res
                .status(404)
                .json({ error: "Replacement SVG file not found" });
        }

        // Get all SVG files in the ready folder
        const files = fs.readdirSync(readyFolderPath);
        const svgFiles = files.filter((file) => file.endsWith(".svg"));

        if (svgFiles.length === 0) {
            return res
                .status(404)
                .json({ error: "No SVG files found in ready folder" });
        }

        // Read the replacement SVG file
        const replacementSvgContent = fs.readFileSync(
            replacementSvgPath,
            "utf8"
        );

        // Parse the replacement SVG
        const parser = new (require("xmldom").DOMParser)();
        const replacementDoc = parser.parseFromString(
            replacementSvgContent,
            "text/xml"
        );

        // Get replacement paths
        const replacementPaths = replacementDoc.getElementsByTagName("path");
        if (replacementPaths.length === 0) {
            return res
                .status(400)
                .json({ error: "No paths found in replacement SVG" });
        }

        const results = [];

        // Process each SVG file
        for (const fileName of svgFiles) {
            try {
                const filePath = path.join(readyFolderPath, fileName);

                // Create a backup if it doesn't exist
                const backupPath = path.join(
                    readyFolderPath,
                    "backups",
                    fileName
                );

                // Ensure the backups directory exists
                const backupDir = path.dirname(backupPath);
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }

                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(filePath, backupPath);
                }

                // Read the SVG file
                const svgContent = fs.readFileSync(filePath, "utf8");

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

                    if (spriteElements.length > 0) {
                        // Process the first sprite found
                        await processSprite(spriteElements[0]);
                        updated = true;
                    }
                }

                // Function to process a sprite element
                async function processSprite(spriteElement) {
                    console.log(
                        `Processing sprite element: ${spriteElement.getAttribute(
                            "id"
                        )} in ${fileName}`
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
                    const shapeHref = useElement.getAttribute("xlink:href");
                    if (!shapeHref) {
                        return;
                    }

                    const shapeId = shapeHref.substring(1);
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

                    // Add new paths from the replacement SVG
                    for (let i = 0; i < replacementPaths.length; i++) {
                        const pathNode = replacementPaths[i].cloneNode(true);
                        shapeElement.appendChild(pathNode);
                    }
                }

                if (updated) {
                    // Convert back to string and save
                    const serializer = new (require("xmldom").XMLSerializer)();
                    const modifiedContent =
                        serializer.serializeToString(svgDoc);

                    fs.writeFileSync(filePath, modifiedContent, "utf8");

                    results.push({
                        fileName,
                        status: "updated",
                    });
                } else {
                    results.push({
                        fileName,
                        status: "skipped",
                        message: spriteId
                            ? `Sprite with ID ${spriteId} not found`
                            : "No suitable sprite found",
                    });
                }
            } catch (error) {
                console.error(`Error processing ${fileName}:`, error);
                results.push({
                    fileName,
                    status: "error",
                    message: error.message,
                });
            }
        }

        const updatedCount = results.filter(
            (r) => r.status === "updated"
        ).length;
        const skippedCount = results.filter(
            (r) => r.status === "skipped"
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
        const backupDir = path.join(folderPath, "backups");
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
                        `Found hat by character name: ${characterName}`
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
        const backupDir = path.join(folderPath, "backups");
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
                        `Found accessory by character name: ${characterName}`
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
                const backupDir = path.join(folderPath, "backups");
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
                        "ffdec:characterName"
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
                                `Found hat by character name: ${characterName} in ${fileName}`
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
                                `Found hat by ID: ${id} in ${fileName}`
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
            (r) => r.status === "success"
        ).length;
        const totalRemoved = results.reduce(
            (sum, r) => sum + (r.removedCount || 0),
            0
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

// Update the apply-to-all endpoint to support character type
app.post("/api/apply-to-all", async (req, res) => {
    try {
        const { replacementFile, spriteId, characterType } = req.body;

        if (!replacementFile) {
            return res
                .status(400)
                .json({ error: "Missing replacementFile parameter" });
        }

        // Determine the folder path based on character type
        const readyFolderPath =
            characterType === "female"
                ? path.join(__dirname, "animation-body-full/rogue/female/ready")
                : path.join(__dirname, "animation-body-full/rogue/ready");

        const replacementSvgPath = path.join(__dirname, replacementFile);

        // Check if replacement file exists
        if (!fs.existsSync(replacementSvgPath)) {
            return res
                .status(404)
                .json({ error: "Replacement SVG file not found" });
        }

        // Get all SVG files in the ready folder
        const files = fs.readdirSync(readyFolderPath);
        const svgFiles = files.filter((file) => file.endsWith(".svg"));

        if (svgFiles.length === 0) {
            return res
                .status(404)
                .json({ error: "No SVG files found in ready folder" });
        }

        // Read the replacement SVG file
        const replacementSvgContent = fs.readFileSync(
            replacementSvgPath,
            "utf8"
        );

        // Parse the replacement SVG
        const parser = new (require("xmldom").DOMParser)();
        const replacementDoc = parser.parseFromString(
            replacementSvgContent,
            "text/xml"
        );

        // Get replacement paths
        const replacementPaths = replacementDoc.getElementsByTagName("path");
        if (replacementPaths.length === 0) {
            return res
                .status(400)
                .json({ error: "No paths found in replacement SVG" });
        }

        const results = [];

        // Process each SVG file
        for (const fileName of svgFiles) {
            try {
                const filePath = path.join(readyFolderPath, fileName);

                // Create a backup if it doesn't exist
                const backupPath = path.join(
                    readyFolderPath,
                    "backups",
                    fileName
                );

                // Ensure the backups directory exists
                const backupDir = path.dirname(backupPath);
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }

                if (!fs.existsSync(backupPath)) {
                    fs.copyFileSync(filePath, backupPath);
                }

                // Read the SVG file
                const svgContent = fs.readFileSync(filePath, "utf8");

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
                            `Found ${spriteElements.length} sprites in ${fileName}`
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
                            "id"
                        )} in ${fileName}`
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
                    const shapeHref = useElement.getAttribute("xlink:href");
                    if (!shapeHref) {
                        return;
                    }

                    const shapeId = shapeHref.substring(1);
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

                    // Add new paths from the replacement SVG
                    for (let i = 0; i < replacementPaths.length; i++) {
                        const pathNode = replacementPaths[i].cloneNode(true);
                        shapeElement.appendChild(pathNode);
                    }
                }

                if (updated) {
                    // Convert back to string and save
                    const serializer = new (require("xmldom").XMLSerializer)();
                    const modifiedContent =
                        serializer.serializeToString(svgDoc);

                    fs.writeFileSync(filePath, modifiedContent, "utf8");

                    results.push({
                        fileName,
                        status: "updated",
                    });
                } else {
                    results.push({
                        fileName,
                        status: "skipped",
                        message: spriteId
                            ? `Sprite with ID ${spriteId} not found`
                            : "No suitable sprite found",
                    });
                }
            } catch (error) {
                console.error(`Error processing ${fileName}:`, error);
                results.push({
                    fileName,
                    status: "error",
                    message: error.message,
                });
            }
        }

        const updatedCount = results.filter(
            (r) => r.status === "updated"
        ).length;
        const skippedCount = results.filter(
            (r) => r.status === "skipped"
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
