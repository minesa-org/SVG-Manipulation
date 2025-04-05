# SVG Modifier

A tool to modify SVG files in the `@animation-body-full/rogue/ready/` folder, specifically targeting g element paths.

## Features

- Load and preview SVG files from the `@animation-body-full/rogue/ready/` folder
- Replace a_LArm elements with parts from `@body-parts/rogue/4.svg`
- Save modified SVGs
- Revert changes

## Installation

1. Make sure you have Node.js installed
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

## Usage

1. Start the server:

```bash
npm start
```

2. Open your browser and navigate to http://localhost:3000
3. Select an SVG file from the dropdown
4. Use the buttons to modify elements
5. Save your changes
6. Use the Revert button to undo changes if needed

## How It Works

The tool allows you to:

1. Replace the a_LArm element with another arm shape from body-parts/rogue/4.svg
2. Save the modified SVG back to the original location (with automatic backups)
3. Revert to the original SVG if needed

## Folder Structure

- `animation-body-full/rogue/ready/`: Contains the SVG files to be modified
- `body-parts/rogue/`: Contains replacement parts
- `animation-body-full/rogue/ready/backups/`: Created automatically to store backups of original files

## License

MIT
