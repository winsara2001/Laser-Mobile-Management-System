// Auto-import all accessory images from the Images/Accessory folder.
// Vite resolves these at build-time, so no runtime file-system access is needed.
const allImages = import.meta.glob('../Images/Accessory/**/*.{jpg,jpeg,png,webp,gif}', { eager: true });

// Build a map: folderName (product name) → array of image URLs
const folderMap = {};

for (const path in allImages) {
    // path example: "../Images/Accessory/JBL BOOM BOX 4/BOOM-BOX-4.jpg"
    const parts = path.split('/');
    // parts: ['..', 'Images', 'Accessory', '<folder>', '<filename>']
    const folderName = parts[3]; // The product-name folder
    const url = allImages[path].default;

    if (!folderMap[folderName]) {
        folderMap[folderName] = [];
    }
    folderMap[folderName].push(url);
}

/**
 * Given a product name, find the best-matching accessory image folder
 * and return its list of image URLs. Returns [] if no match found.
 */
export function getAccessoryImages(productName) {
    if (!productName) return [];

    const nameLower = productName.toLowerCase().trim();

    // 1. Exact match (case-insensitive)
    for (const folder in folderMap) {
        if (folder.toLowerCase() === nameLower) {
            return folderMap[folder];
        }
    }

    // 2. Folder name contains the product name, or product name contains the folder name
    let bestMatch = null;
    let bestScore = 0;

    for (const folder in folderMap) {
        const folderLower = folder.toLowerCase();

        // Score: number of words from product name that appear in folder name
        const words = nameLower.split(/\s+/).filter(w => w.length > 2);
        const score = words.filter(w => folderLower.includes(w)).length;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = folder;
        }
    }

    if (bestMatch && bestScore > 0) {
        return folderMap[bestMatch];
    }

    return [];
}

export default folderMap;
