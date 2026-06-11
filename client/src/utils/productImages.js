// Unified product image utility.
// Vite resolves all imports at build-time via import.meta.glob — no runtime FS access needed.

const allImagesRaw = import.meta.glob(
    '../Images/*/**/*.{jpg,jpeg,png,webp,gif,avif}',
    { eager: true }
);

// folderMap: { "iPhone 16": [url1, url2, ...], "JBL BOOM BOX 4": [...], ... }
const folderMap = {};

const ingest = (rawObj) => {
    try {
        for (const path in rawObj) {
            // path e.g.  "../Images/Mobile Phones/iPhone 16/iPhone-16-Black-1.webp"
            //            "../Images/Accessory/JBL BOOM BOX 4/BOOM-BOX-4.jpg"
            const parts = path.split('/');
            // index 3 is always the product-name folder (after '.', 'Images', '<category>')
            const folder = parts[3];
            if (!folder) continue;
            const mod = rawObj[path];
            if (!mod) continue;
            const url = mod.default || mod;
            if (!url || typeof url !== 'string') continue;
            if (!folderMap[folder]) folderMap[folder] = [];
            folderMap[folder].push(url);
        }
    } catch (err) {
        console.warn('[productImages] Error during image ingestion:', err);
    }
};

ingest(allImagesRaw);

/**
 * Tokenise a string into lowercase meaningful words (length > 2).
 * Splits on spaces, hyphens, underscores, slashes, parens, commas, etc.
 * This prevents substring false-positives like "core" matching "Soundcore".
 */
function tokenise(str) {
    return str
        .toLowerCase()
        .split(/[\s\-_()',&+/]+/)
        .filter(w => w.length >= 2);
}

/**
 * Given a product name, return an array of local image URLs by matching
 * against folder names inside Images/Mobile Phones and Images/Accessory.
 *
 * Matching strategy:
 *   1. Exact (case-insensitive)
 *   2. Whole-word intersection score — both sides are tokenised into words
 *      so "core" CANNOT match "Soundcore".
 *   3. Requires at least min(2, nameWords.length) matched words to avoid
 *      accidental single-word false-positives.
 *
 * Returns [] when no folder matches confidently enough.
 */
export function getProductImages(productName) {
    if (!productName) return [];

    const nameLower = productName.toLowerCase().trim();

    // 1. Exact match
    for (const folder in folderMap) {
        if (folder.toLowerCase() === nameLower) return folderMap[folder];
    }

    // 2. Whole-word fuzzy match
    const nameWords = tokenise(productName);
    if (nameWords.length === 0) return [];

    let bestMatch = null;
    let bestScore = 0;

    for (const folder in folderMap) {
        const folderWordSet = new Set(tokenise(folder));
        // Count how many product-name words appear as exact whole words in the folder tokens
        const score = nameWords.filter(w => folderWordSet.has(w)).length;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = folder;
        }
    }

    // Require at least 2 matched words (or all words if the product name is very short)
    const minScore = Math.min(2, nameWords.length);
    if (bestMatch && bestScore >= minScore) return folderMap[bestMatch];

    return [];
}

export default folderMap;
