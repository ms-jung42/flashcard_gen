import { get, set, keys } from 'idb-keyval';

// Key prefix to avoid collisions
// OLD: const PREFIX = 'flashcards_project_';
// NEW: Split into 'meta' and 'blob'
const PREFIX_META = 'flashcards_project_meta_';
const PREFIX_BLOB = 'flashcards_project_blob_';
const LEGACY_PREFIX = 'flashcards_project_';

/**
 * Request persistent storage from the browser.
 * This asks the browser not to evict our data if disk space is low.
 */
export async function initPersistence() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`[Persistence] Storage persisted: ${isPersisted}`);
    }
}

/**
 * Save project state to IndexedDB.
 * Splits heavy file data (Blob) from lightweight metadata (JSON).
 * @param {string} pdfName - The name of the PDF (used as ID).
 * @param {object} data - The state to save. Can contain `pdfFile` (Blob) and other metadata.
 */
export async function saveProject(pdfName, data) {
    if (!pdfName) return;

    // 1. Separate Blob from Metadata
    const { pdfFile, ...metadata } = data;

    // 2. Save Metadata (Always)
    const metaKey = PREFIX_META + pdfName;
    const metaPayload = {
        version: 2,
        timestamp: Date.now(),
        ...metadata,
        pdfName // Ensure name is saved
    };

    try {
        await set(metaKey, metaPayload);
        // console.log(`[Persistence] Saved Metadata: ${pdfName}`);
    } catch (error) {
        console.error(`[Persistence] Failed to save metadata for ${pdfName}`, error);
    }

    // 3. Save Blob (Only if provided)
    if (pdfFile) {
        const blobKey = PREFIX_BLOB + pdfName;
        try {
            await set(blobKey, pdfFile);
            console.log(`[Persistence] Saved Blob: ${pdfName} (${(pdfFile.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (error) {
            console.error(`[Persistence] Failed to save blob for ${pdfName}`, error);
        }
    }
}

/**
 * Load project state from IndexedDB.
 * Joins separate Blob and Metadata entries.
 * Handles migration from legacy single-key format.
 * @param {string} pdfName 
 * @returns {Promise<object|null>}
 */
export async function loadProject(pdfName) {
    if (!pdfName) return null;

    const metaKey = PREFIX_META + pdfName;
    const blobKey = PREFIX_BLOB + pdfName;
    const legacyKey = LEGACY_PREFIX + pdfName;

    try {
        // A. Try loading split keys
        let [meta, blob] = await Promise.all([get(metaKey), get(blobKey)]);

        // B. Fallback: Check legacy key if meta is missing
        if (!meta) {
            const legacyData = await get(legacyKey);
            if (legacyData) {
                console.log(`[Persistence] Migrating legacy project: ${pdfName}`);
                // Migrate!
                const { pdfFile: legacyBlob, ...legacyMeta } = legacyData;

                // Save in new format immediately
                await saveProject(pdfName, { pdfFile: legacyBlob, ...legacyMeta });

                // Cleanup legacy (optional, maybe keep as backup for now?)
                // await import('idb-keyval').then(mod => mod.del(legacyKey)); 

                return legacyData;
            }
        }

        if (!meta) return null;

        // C. Combine for application use
        return {
            ...meta,
            pdfFile: blob || null
        };

    } catch (error) {
        console.error(`[Persistence] Failed to load ${pdfName}`, error);
        return null;
    }
}

/**
 * List all saved projects.
 * Scans for Metadata keys.
 */
export async function listProjects() {
    try {
        const allKeys = await keys();
        // Look for new Meta keys OR legacy keys
        const projectNames = new Set();

        allKeys.forEach(k => {
            const str = k.toString();
            if (str.startsWith(PREFIX_META)) {
                projectNames.add(str.replace(PREFIX_META, ''));
            } else if (str.startsWith(LEGACY_PREFIX) && !str.startsWith(PREFIX_META) && !str.startsWith(PREFIX_BLOB)) {
                // If it's a legacy key
                projectNames.add(str.replace(LEGACY_PREFIX, ''));
            }
        });

        return Array.from(projectNames);
    } catch (error) {
        console.error("Failed to list projects", error);
        return [];
    }
}

/**
 * Delete a project from IndexedDB.
 */
export async function deleteProject(pdfName) {
    if (!pdfName) return;
    const metaKey = PREFIX_META + pdfName;
    const blobKey = PREFIX_BLOB + pdfName;
    const legacyKey = LEGACY_PREFIX + pdfName;

    try {
        const { del } = await import('idb-keyval');
        await Promise.all([
            del(metaKey),
            del(blobKey),
            del(legacyKey)
        ]);
        console.log(`[Persistence] Deleted: ${pdfName}`);
    } catch (error) {
        console.error(`[Persistence] Failed to delete ${pdfName}`, error);
    }
}

/**
 * Trims the PDF Blob for a project to save space, keeping metadata.
 * Called when a file falls out of the 'Recent Files' LRU list.
 */
export async function trimProjectPdf(pdfName) {
    if (!pdfName) return;
    const blobKey = PREFIX_BLOB + pdfName;
    const legacyKey = LEGACY_PREFIX + pdfName;

    try {
        const { del, get, set } = await import('idb-keyval');

        // 1. Delete standalone blob
        await del(blobKey);

        // 2. Handle legacy: If only legacy exists, we must "migration-split" it but WITHOUT the blob
        const legacyData = await get(legacyKey);
        if (legacyData) {
            const { pdfFile, ...meta } = legacyData;
            // Save ONLY meta to new system
            const metaKey = PREFIX_META + pdfName;
            await set(metaKey, { ...meta, version: 2, timestamp: Date.now() });
            // Delete legacy
            await del(legacyKey);
        }

        console.log(`[Persistence] Trimmed PDF Blob: ${pdfName}`);
    } catch (error) {
        console.error(`[Persistence] Failed to trim ${pdfName}`, error);
    }
}

// Global Stats
const GLOBAL_STATS_KEY = 'flashcards_global_stats';

export async function saveGlobalStats(stats) {
    try {
        await set(GLOBAL_STATS_KEY, stats);
    } catch (error) {
        console.error("[Persistence] Failed to save global stats", error);
    }
}

export async function loadGlobalStats() {
    try {
        return await get(GLOBAL_STATS_KEY);
    } catch (error) {
        console.error("[Persistence] Failed to load global stats", error);
        return null;
    }
}

// User Settings Persistence
const SETTINGS_KEY = 'flashcards_user_settings';

export async function saveSettings(settings) {
    try {
        await set(SETTINGS_KEY, settings);
    } catch (error) {
        console.error("[Persistence] Failed to save settings", error);
    }
}

export async function loadSettings() {
    try {
        return await get(SETTINGS_KEY);
    } catch (error) {
        console.error("[Persistence] Failed to load settings", error);
        return null;
    }
}
