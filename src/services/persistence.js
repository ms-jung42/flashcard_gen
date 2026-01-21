import { get, set, keys } from 'idb-keyval';

// Key prefix to avoid collisions
const PREFIX = 'flashcards_project_';

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
 * @param {string} pdfName - The name of the PDF (used as ID).
 * @param {object} data - The state to save (cards, annotations, etc).
 */
export async function saveProject(pdfName, data) {
    if (!pdfName) return;
    const key = PREFIX + pdfName;
    const payload = {
        version: 1,
        timestamp: Date.now(),
        ...data,
        pdfName // Ensure name is saved
    };
    try {
        await set(key, payload);
        console.log(`[Persistence] Saved: ${pdfName}`);
    } catch (error) {
        console.error(`[Persistence] Failed to save ${pdfName}`, error);
    }
}

/**
 * Load project state from IndexedDB.
 * @param {string} pdfName 
 * @returns {Promise<object|null>}
 */
export async function loadProject(pdfName) {
    if (!pdfName) return null;
    const key = PREFIX + pdfName;
    try {
        const data = await get(key);
        return data || null;
    } catch (error) {
        console.error(`[Persistence] Failed to load ${pdfName}`, error);
        return null;
    }
}

/**
 * List all saved projects (metadata only).
 */
export async function listProjects() {
    try {
        const allKeys = await keys();
        const projectKeys = allKeys.filter(k => k.toString().startsWith(PREFIX));
        // We could map these to simple names, but 'keys' only returns the keys.
        // To get metadata (date), we'd need to peek. For now, just return clean names.
        return projectKeys.map(k => k.toString().replace(PREFIX, ''));
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
    const key = PREFIX + pdfName;
    try {
        await import('idb-keyval').then(mod => mod.del(key));
        console.log(`[Persistence] Deleted: ${pdfName}`);
    } catch (error) {
        console.error(`[Persistence] Failed to delete ${pdfName}`, error);
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
// Global Settings (Theme, Config, Recent Files)
const GLOBAL_SETTINGS_KEY = 'flashcards_global_settings';

export async function saveSettings(settings) {
    try {
        await set(GLOBAL_SETTINGS_KEY, settings);
        console.log("[Persistence] Saved settings");
    } catch (error) {
        console.error("[Persistence] Failed to save settings", error);
    }
}

export async function loadSettings() {
    try {
        return await get(GLOBAL_SETTINGS_KEY);
    } catch (error) {
        console.error("[Persistence] Failed to load settings", error);
        return null;
    }
}

/**
 * Trim the PDF blob from a saved project to save space.
 * Retains all other data (cards, annotations, etc).
 */
export async function trimProjectPdf(pdfName) {
    if (!pdfName) return;
    const key = PREFIX + pdfName;
    try {
        const data = await get(key);
        if (data && data.pdfFile) {
            console.log(`[Persistence] Trimming PDF blob for: ${pdfName}`);
            // Create copy without pdfFile
            const { pdfFile, ...rest } = data;
            await set(key, rest);
        }
    } catch (error) {
        console.error(`[Persistence] Failed to trim ${pdfName}`, error);
    }
}
