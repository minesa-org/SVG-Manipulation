const fs = require('fs');
const path = require('path');

// Migration script to move backups from old structure to new standalone structure
// Old: animation-body-full/rogue/<folder>/backups/
// New: backups/<folder>/

function migrateBackups() {
    const baseAnimationPath = path.join(__dirname, 'animation-body-full/rogue');
    const newBackupBasePath = path.join(__dirname, 'backups');

    // Ensure new backup base directory exists
    if (!fs.existsSync(newBackupBasePath)) {
        fs.mkdirSync(newBackupBasePath, { recursive: true });
    }

    // Get all animation folders
    const animationFolders = fs.readdirSync(baseAnimationPath).filter(item => {
        const itemPath = path.join(baseAnimationPath, item);
        return fs.statSync(itemPath).isDirectory();
    });

    let totalMigrated = 0;
    let foldersProcessed = 0;

    animationFolders.forEach(folderName => {
        const oldBackupPath = path.join(baseAnimationPath, folderName, 'backups');
        
        if (fs.existsSync(oldBackupPath)) {
            console.log(`Processing ${folderName}...`);
            
            const newBackupPath = path.join(newBackupBasePath, folderName);
            
            // Create new backup folder for this animation
            if (!fs.existsSync(newBackupPath)) {
                fs.mkdirSync(newBackupPath, { recursive: true });
            }

            // Function to recursively copy files
            function copyRecursively(source, destination) {
                const items = fs.readdirSync(source);
                let fileCount = 0;

                items.forEach(item => {
                    const sourcePath = path.join(source, item);
                    const destPath = path.join(destination, item);
                    const stat = fs.statSync(sourcePath);

                    if (stat.isFile()) {
                        // Copy file if it doesn't exist in destination
                        if (!fs.existsSync(destPath)) {
                            fs.copyFileSync(sourcePath, destPath);
                            fileCount++;
                            console.log(`  Copied: ${item}`);
                        } else {
                            console.log(`  Skipped (exists): ${item}`);
                        }
                    } else if (stat.isDirectory()) {
                        // Create directory and recurse
                        if (!fs.existsSync(destPath)) {
                            fs.mkdirSync(destPath, { recursive: true });
                        }
                        fileCount += copyRecursively(sourcePath, destPath);
                    }
                });

                return fileCount;
            }

            const migratedCount = copyRecursively(oldBackupPath, newBackupPath);
            totalMigrated += migratedCount;
            foldersProcessed++;

            console.log(`  Migrated ${migratedCount} files from ${folderName}`);
        }
    });

    console.log(`\nMigration complete!`);
    console.log(`Processed ${foldersProcessed} folders`);
    console.log(`Migrated ${totalMigrated} total files`);
    console.log(`New backup structure: ${newBackupBasePath}`);
}

// Run migration if this script is executed directly
if (require.main === module) {
    console.log('Starting backup migration...');
    migrateBackups();
}

module.exports = { migrateBackups };
