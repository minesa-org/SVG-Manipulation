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
    const folderPath = path.join(__dirname, "animation-body-full/rogue/ready");

    fs.readdir(folderPath, (err, files) => {
        if (err) {
            console.error("Error reading directory:", err);
            return res.status(500).json({ error: "Failed to read directory" });
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
        "male/face",
        "male/hair",
        "male/eyes",
        "female/mouth",
        "female/face",
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

app.listen(port, () => {
    console.log(`SVG Modifier server running at http://localhost:${port}`);
});
