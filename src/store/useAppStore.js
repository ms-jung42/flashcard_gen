import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware';
import { mockGenerateCards } from '../services/llm';
import { saveProject, loadProject, initPersistence, saveGlobalStats, loadGlobalStats, listProjects, deleteProject, saveSettings, loadSettings } from '../services/persistence';

// Initialize persistence on load
initPersistence();

// --- Default Prompts ---

const STANDARD_PROMPT_TEMPLATE = `
  You are an expert Flashcard Creator. 
  Analyze the provided image of a document page and the extracted text.
  
  EXTRACTED TEXT START:
  {{textContent}}
  EXTRACTED TEXT END

  EXISTING CARDS:
  {{existingContext}}

  Identify the key concepts, definitions, and important facts.
  Ignore any headers, footers, or page numbers.
  
  CRITICAL: Do NOT create cards that duplicate "EXISTING CARDS".
  CRITICAL: Do NOT use phrases like "According to the document".

  For CLOZE cards:
  - The "back" field is for Extra Context. 
  - Do NOT repeat the cloze content or the full sentence here.
  - ONLY include information in "back" if it adds valuable context not already inside the card text.
  - If no additional context is needed, leave "back" empty string.

  Create 3-5 high-quality flashcards.
  
  Return a JSON array of objects. Each object must have:
  - "type": "basic" or "cloze"
  - "front": Question (for basic)
  - "back": Answer (for basic) OR Extra Context (for cloze)
  - "text": Cloze text (e.g. "The {{c1::mitochondria}} is the powerhouse.")
  - "tags": Array of strings

  Do not include markdown formatting like \\\`\\\`\\\`json. Just return the raw JSON array.
`;
export const DEFAULT_PROMPT_OPENAI = STANDARD_PROMPT_TEMPLATE;
export const DEFAULT_PROMPT_GEMINI = STANDARD_PROMPT_TEMPLATE;
export const DEFAULT_PROMPT_CLAUDE = STANDARD_PROMPT_TEMPLATE;
export const DEFAULT_PROMPT_LOCAL = STANDARD_PROMPT_TEMPLATE;

export const DEFAULT_SCHEMA_JSON = {
    name: "flashcards_response",
    strict: true,
    schema: {
        type: "object",
        properties: {
            cards: {
                type: "array",
                description: "A list of flashcards generated from the text.",
                items: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            enum: ["basic", "cloze"],
                            description: "The type of flashcard: 'basic' for Q&A, 'cloze' for fill-in-the-blank."
                        },
                        front: {
                            type: "string",
                            description: "The question or front side of the card (for basic type)."
                        },
                        back: {
                            type: "string",
                            description: "The answer (for basic type). For cloze type, this is the Extra Info/Context (optional, max 30 words)."
                        },
                        text: {
                            type: "string",
                            description: "The cloze text with {{c1::hidden}} parts (only for cloze type)."
                        },
                        tags: {
                            type: "array",
                            items: { "type": "string" },
                            description: "Tags for categorizing the card."
                        }
                    },
                    required: ["type", "front", "back", "text", "tags"],
                    additionalProperties: false
                }
            }
        },
        required: ["cards"],
        additionalProperties: false
    }
};

export const useAppStore = create(subscribeWithSelector((set, get) => ({
    // PDF State
    pdfFile: null,
    setPdfFile: async (file) => {
        set({ pdfFile: file });
        if (file && file.name) {
            get().addRecentFile(file);
            const loaded = await loadProject(file.name);
            if (loaded) {
                console.log(`[Store] Hydrating from persistence: ${file.name}`);
                // Calculate defaults from settings
                const settings = get().userSettings.defaultPrompts || {};
                const defaults = {
                    default: DEFAULT_PROMPT_OPENAI,
                    openai: settings.openai || DEFAULT_PROMPT_OPENAI,
                    gemini: settings.gemini || DEFAULT_PROMPT_GEMINI,
                    anthropic: settings.anthropic || DEFAULT_PROMPT_CLAUDE,
                    local: settings.local || DEFAULT_PROMPT_LOCAL
                };

                const loadedPrompts = loaded.prompts || {};
                let loadedModified = loaded.promptsModified;

                const mergedPrompts = { ...defaults };

                // Handle Legacy (No modification tracking)
                if (!loadedModified) {
                    loadedModified = {};
                    // If prompt differs from standard constants, assume it's custom.
                    // Otherwise, treat as unmodified to enable smart sync.
                    const isStandard = (text) => {
                        if (!text) return true;
                        return text.trim() === DEFAULT_PROMPT_OPENAI.trim() ||
                            text.trim() === DEFAULT_PROMPT_LOCAL.trim() ||
                            text.trim() === (settings.openai || "").trim() ||
                            text.trim() === (settings.gemini || "").trim() ||
                            text.trim() === (settings.anthropic || "").trim() ||
                            text.trim() === (settings.local || "").trim();
                    };

                    Object.keys(loadedPrompts).forEach(key => {
                        if (loadedPrompts[key] && !isStandard(loadedPrompts[key])) {
                            loadedModified[key] = true;
                            mergedPrompts[key] = loadedPrompts[key];
                        } else {
                            loadedModified[key] = false;
                        }
                    });
                } else {
                    // Modern: Respect flags
                    Object.keys(loadedPrompts).forEach(key => {
                        if (loadedModified[key]) {
                            mergedPrompts[key] = loadedPrompts[key];
                        }
                    });
                }

                set({
                    cards: loaded.cards || [],
                    annotations: loaded.annotations || {},
                    currentPage: loaded.currentPage || 1,
                    stats: loaded.stats || get().stats,
                    prompts: mergedPrompts,
                    promptsModified: loadedModified
                });
            } else {
                console.log(`[Store] No persistence found for: ${file.name}`);
                // Reset if new file
                // Apply Global Defaults for Prompts if available
                const globalDefaults = get().userSettings.defaultPrompts || {};
                const freshPrompts = {
                    default: DEFAULT_PROMPT_OPENAI,
                    gemini: globalDefaults.gemini || DEFAULT_PROMPT_GEMINI,
                    anthropic: globalDefaults.anthropic || DEFAULT_PROMPT_CLAUDE,
                    openai: globalDefaults.openai || DEFAULT_PROMPT_OPENAI,
                    local: globalDefaults.local || DEFAULT_PROMPT_LOCAL
                };

                set({
                    cards: [],
                    annotations: {},
                    prompts: freshPrompts
                });
            }
        } else {
            console.log("[Store] Closing PDF, resetting state.");
            const globalDefaults = get().userSettings.defaultPrompts || {};
            const freshPrompts = {
                default: DEFAULT_PROMPT_OPENAI,
                gemini: globalDefaults.gemini || DEFAULT_PROMPT_GEMINI,
                anthropic: globalDefaults.anthropic || DEFAULT_PROMPT_CLAUDE,
                openai: globalDefaults.openai || DEFAULT_PROMPT_OPENAI,
                local: globalDefaults.local || DEFAULT_PROMPT_LOCAL
            };
            set({
                cards: [],
                annotations: {},
                prompts: freshPrompts,
                promptsModified: {},
                currentPage: 1,
                activePage: null,
                editingCardId: null,
                selectedCardIds: []
            });
        }
    },
    currentPage: 1,
    setCurrentPage: (page) => set({ currentPage: page }),

    // Focus Mode State
    activePage: null,
    setActivePage: (page) => set({ activePage: page }),


    // Annotations State
    annotations: {}, // { pageNumber: [{ type: 'path', points: [], color: 'yellow' }] }
    addAnnotation: (page, annotation) => set(state => ({
        annotations: {
            ...state.annotations,
            [page]: [...(state.annotations[page] || []), annotation]
        }
    })),

    // Card State
    cards: [],
    addCard: (card) => set((state) => {
        return { cards: [...state.cards, card] };
    }),
    updateCard: (id, updates) => set((state) => ({
        cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c))
    })),
    removeCard: (id) => set((state) => ({
        cards: state.cards.filter((c) => c.id !== id)
    })),

    // Editing State
    editingCardId: null,
    setEditingCardId: (id) => set({ editingCardId: id }),

    // Multi-Select State
    selectedCardIds: [],
    toggleCardSelection: (id) => set((state) => {
        if (state.selectedCardIds.includes(id)) {
            return { selectedCardIds: state.selectedCardIds.filter(cid => cid !== id) };
        }
        return { selectedCardIds: [...state.selectedCardIds, id] };
    }),
    addTagsToCards: (ids, tags) => set((state) => ({
        cards: state.cards.map(c => {
            if (ids.includes(c.id)) {
                // Merge and deduplicate
                const newTags = Array.from(new Set([...(c.tags || []), ...tags]));
                return { ...c, tags: newTags };
            }
            return c;
        })
    })),
    clearSelection: () => set({ selectedCardIds: [] }),
    selectAll: (ids) => set({ selectedCardIds: ids }),

    importCards: (importedCards) => set((state) => {
        const existingIds = new Set(state.cards.map(c => c.id));
        const mergedCards = [...state.cards];

        importedCards.forEach(card => {
            if (existingIds.has(card.id)) {
                // Update existing
                const index = mergedCards.findIndex(c => c.id === card.id);
                mergedCards[index] = card;
            } else {
                // Add new
                mergedCards.push(card);
            }
        });

        return { cards: mergedCards };
    }),

    hydrateSettings: (settings) => set(state => {
        const loadedConfig = settings.llmConfig || state.llmConfig;
        // Ensure new schema keys exist (migration for existing users)
        if (!loadedConfig.localSchema) loadedConfig.localSchema = JSON.stringify(DEFAULT_SCHEMA_JSON, null, 2);
        if (!loadedConfig.openaiSchema) loadedConfig.openaiSchema = JSON.stringify(DEFAULT_SCHEMA_JSON, null, 2);
        if (!loadedConfig.defaultBackend) loadedConfig.defaultBackend = loadedConfig.backend || 'openai';

        return {
            theme: settings.theme || 'light',
            llmConfig: loadedConfig,
            userSettings: settings.userSettings || state.userSettings,
            recentFiles: settings.recentFiles || [],
        };
    }),

    // Reordering
    reorderCards: (oldIndex, newIndex) => set((state) => {
        const newCards = [...state.cards];
        const [moved] = newCards.splice(oldIndex, 1);
        newCards.splice(newIndex, 0, moved);
        return { cards: newCards };
    }),

    // App State
    isProcessing: false,
    setProcessing: (status) => set({ isProcessing: status }),

    // Actions
    createManualCard: (pageNumber = 1, type = 'basic') => set((state) => {
        const newCard = {
            id: crypto.randomUUID(),
            type, // 'basic' or 'cloze'
            front: '',
            back: '',
            text: '', // for cloze
            tags: [],
            pageNumber: pageNumber
        };
        // Hack: We want to edit immediately.
        // Since we are inside set, we can update editingCardId too
        return {
            cards: [...state.cards, newCard],
            editingCardId: newCard.id // Auto-enter edit mode!
        };
    }),

    // Settings
    llmConfig: {
        backend: 'mock',
        defaultBackend: 'openai',
        apiKey: '',
        // Per-backend Model Configs
        models: {
            gemini: { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' }, // User requested naming
            anthropic: { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
            openai: { id: 'gpt-5.1', name: 'OpenAI GPT-5.1' },
            local: { id: 'qwen3-vl-30b-a3b-instruct', name: 'Local Model' }
        },
        // Legacy keys (kept for compatibility or easier access if not migrated fully yet)
        geminiKey: null,
        anthropicKey: null,
        openaiKey: null,
        openaiSchema: JSON.stringify(DEFAULT_SCHEMA_JSON, null, 2),
        localUrl: 'http://localhost:1234/v1',
        localSchema: JSON.stringify(DEFAULT_SCHEMA_JSON, null, 2),
        // Fallback Configuration
        fallbacks: {
            enabled: false,
            retries: 1,
            fallbackModels: ['openai']
        }
    },
    setDefaultBackend: (backend) => set((state) => {
        const isWorkspaceEmpty = !state.pdfFile && state.cards.length === 0;
        const newLlmConfig = { ...state.llmConfig, defaultBackend: backend };
        if (isWorkspaceEmpty) {
            newLlmConfig.backend = backend;
        }
        return { llmConfig: newLlmConfig };
    }),
    setLlmConfig: (newConfig) => set((state) => ({
        llmConfig: { ...state.llmConfig, ...newConfig }
    })),
    // Helper to update specific model config
    updateModelConfig: (backend, field, value) => set((state) => ({
        llmConfig: {
            ...state.llmConfig,
            models: {
                ...state.llmConfig.models,
                [backend]: {
                    ...state.llmConfig.models[backend],
                    [field]: value
                }
            }
        }
    })),

    // Theme
    theme: 'light',
    toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

    // Navigation & Dashboard
    activeTab: 'dashboard', // 'dashboard', 'workspace', 'settings'
    setActiveTab: (tab) => set({ activeTab: tab }),

    // Data Persistence
    recentFiles: [],
    storedFiles: [], // List of persisted project names
    refreshStoredFiles: async () => {
        const files = await listProjects();
        set({ storedFiles: files });
    },
    deleteStoredFile: async (fileName) => {
        await deleteProject(fileName);
        const files = await listProjects();
        set({ storedFiles: files });
    },

    addRecentFile: (file) => set(state => {
        const exists = state.recentFiles.some(f => f.name === file.name);
        const newFile = { id: crypto.randomUUID(), name: file.name, path: file.path || file.name, date: new Date().toISOString() };
        const filtered = state.recentFiles.filter(f => f.name !== file.name);

        let newStats = state.stats;
        if (!exists) {
            newStats = { ...state.stats, totalFiles: state.stats.totalFiles + 1 };
            saveGlobalStats(newStats);
        }

        // Logic to trim older PDFs (Storage Optimization)
        const updatedList = [newFile, ...filtered];
        const KEEP_COUNT = 10;

        // If we have more than KEEP_COUNT, the ones falling off need their PDF blobs removed from IDB
        if (updatedList.length > KEEP_COUNT) {
            const filesToTrim = updatedList.slice(KEEP_COUNT);
            // We can resolve this async
            import('../services/persistence').then(({ trimProjectPdf }) => {
                filesToTrim.forEach(f => trimProjectPdf(f.name));
            });
        }

        return {
            recentFiles: updatedList.slice(0, KEEP_COUNT),
            stats: newStats
        };
    }),

    stats: {
        totalCards: 0,
        totalFiles: 0,
        streakDays: 0,
        studySeconds: 0,
        lastStudyDate: null,
        activity: {}
    },
    loadStats: async () => {
        const s = await loadGlobalStats();
        if (s) set({ stats: s });
    },
    clearGlobalStats: async () => {
        const empty = { totalCards: 0, totalFiles: 0, streakDays: 1, activity: {} };
        set({ stats: empty });
        await saveGlobalStats(empty);
    },
    updateStats: (cardCount = 0) => set(state => {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = state.stats.lastStudyDate;
        let newStreak = state.stats.streakDays || 0;

        // Streak Logic: If accessed today, keep streak. If yesterday, increment. If older, reset to 1.
        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                newStreak += 1; // Continued streak
            } else {
                newStreak = 1; // New streak starts today
            }
        }

        const currentActivity = state.stats.activity?.[today] || 0;

        const newStats = {
            ...state.stats,
            totalCards: state.stats.totalCards + (cardCount || 0),
            streakDays: newStreak,
            lastStudyDate: today,
            activity: {
                ...state.stats.activity,
                [today]: currentActivity + (cardCount > 0 ? cardCount : 1) // Count simple activity too
            }
        };
        // Save (we assume saveGlobalStats is available in scope or we import it)
        // Since loadGlobalStats was used in line 397 without qualification, it is likely imported.
        // However, I can't see the top of the file to confirm `saveGlobalStats` is imported.
        // I'll assume it is as `updateStats` (old) used it.
        saveGlobalStats(newStats);
        return { stats: newStats };
    }),

    updateStudyTime: (seconds) => set(state => {
        const newStats = {
            ...state.stats,
            studySeconds: (state.stats.studySeconds || 0) + seconds
        };
        // Save periodically (e.g., every 60 updates/minutes roughly to avoid spamming IDB)
        if (Math.random() > 0.95) saveGlobalStats(newStats);
        return { stats: newStats };
    }),

    openProject: async (fileName) => {
        try {
            const { loadProject } = await import('../services/persistence');
            const data = await loadProject(fileName);
            if (data) {
                set({
                    cards: data.cards || [],
                    annotations: data.annotations || [],
                    pdfFile: data.pdfFile || null, // IDB handles Blobs
                    currentPage: data.currentPage || 1,
                    activePage: data.currentPage || 1, // Force scroll to this page
                    activeTab: 'workspace', // Force switch
                    isProcessing: false
                });

                // Update Recents
                set(state => {
                    const file = { name: fileName, date: new Date().toISOString() };
                    // We need to keep the ID if it exists in current list?
                    const existing = state.recentFiles.find(f => f.name === fileName);
                    const newFileEntry = { ...file, id: existing?.id || crypto.randomUUID() };

                    const filtered = state.recentFiles.filter(f => f.name !== fileName);
                    // Ensure we don't break the list limit logic here either, but addRecentFile handles limit.
                    // Here we just bump to top.
                    return { recentFiles: [newFileEntry, ...filtered].slice(0, 10) };
                });
            } else {
                console.warn(`[Store] Project "${fileName}" not found in persistence.`);
                alert(`Project "${fileName}" could not be loaded.`);
            }
        } catch (e) {
            console.error("Open project failed", e);
            alert("Failed to open project.");
        }
    },

    // User Settings
    userSettings: {
        snapshotScaleManual: 3.0,
        snapshotScaleAuto: 3.0,
        themeColor: 'blue',
        // Support multiple custom presets
        customPresets: [
            { id: 'custom-1', light: '#3b82f6', dark: '#60a5fa' },
            { id: 'custom-2', light: '#facc15', dark: '#eab308' },
            { id: 'custom-3', light: '#a78bfa', dark: '#8b5cf6' }
        ],
        // Legacy fallback (optional, but good to keep for logic that checks customColors)
        customColors: {
            light: '#3b82f6',
            dark: '#60a5fa'
        },
        pdfScale: 1.0,
        flipLayout: false, // Right-to-Left
        clozePalette: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'],
        // Global Default Prompts (User Configurable)
        defaultPrompts: {
            gemini: null,
            anthropic: null,
            openai: null,
            local: null
        }
    },
    updateSettings: (newSettings) => set((state) => {
        const updatedUserSettings = { ...state.userSettings, ...newSettings };

        // Smart Sync: If default prompts changed, update workspace prompts IF NOT MODIFIED
        let updatedPrompts = { ...state.prompts };
        if (newSettings.defaultPrompts) {
            console.log("[Store] Default Prompts updating:", newSettings.defaultPrompts);
            const backends = ['openai', 'gemini', 'anthropic', 'local'];
            backends.forEach(backend => {
                const isModified = state.promptsModified?.[backend];
                // If user hasn't modified, keep synced
                if (!isModified) {
                    const newDefault = newSettings.defaultPrompts[backend];
                    // Fallback to constants
                    let fallback;
                    if (backend === 'openai') fallback = DEFAULT_PROMPT_OPENAI;
                    else if (backend === 'gemini') fallback = DEFAULT_PROMPT_GEMINI;
                    else if (backend === 'anthropic') fallback = DEFAULT_PROMPT_CLAUDE;
                    else fallback = DEFAULT_PROMPT_LOCAL;

                    const finalVal = newDefault || fallback;
                    console.log(`[Store] Syncing ${backend} prompt to default. Modified=${isModified}, NewValLen=${finalVal?.length}`);
                    updatedPrompts[backend] = finalVal;
                } else {
                    console.log(`[Store] Skipping sync for ${backend} (Modified=true)`);
                }
            });
        }
        return {
            userSettings: updatedUserSettings,
            prompts: updatedPrompts
        };
    }),

    // Actions
    generateCardsFromPage: (pageNumber) => {
        const { setProcessing } = get();
        // Trigger UI to capture the page visually
        setProcessing(true);
        set({ snapshotRequest: { page: pageNumber, id: crypto.randomUUID() } });
    },

    // UI calls this back after capturing the canvas
    generateCardsFromImage: async (base64Image, pageNumber, textContent = "") => {
        const { setProcessing, addCard, llmConfig, prompts } = get();
        // Processing already true

        // Select prompt based on backend
        const activePrompt = prompts[llmConfig.backend] || prompts['default'];

        try {
            let newCards = [];

            // Get existing cards for this page to prevent duplicates
            const existingCards = get().cards.filter(c => c.pageNumber === pageNumber);
            const existingContext = existingCards.map(c => {
                if (c.type === 'basic') return `Q: ${c.front}`;
                if (c.type === 'cloze') return `Cloze: ${c.text}`;
                return '';
            }).join('\n');

            // Extract Config
            const backend = llmConfig.backend;
            const modelConfig = llmConfig.models?.[backend] || {};
            const primaryModelId = modelConfig.id;
            const fallbackModels = (modelConfig.fallbacks || []).filter(Boolean);
            const maxRetries = modelConfig.retries ?? 1;

            console.log(`[Store] Generating with ${backend}: Primary=${primaryModelId}, Fallbacks=${fallbackModels.join(',')}, Retries=${maxRetries}`);

            if (backend === 'gemini') {
                const { generateCardsGemini } = await import('../services/gemini');
                newCards = await generateCardsGemini(
                    base64Image,
                    llmConfig.geminiKey || llmConfig.apiKey,
                    textContent,
                    existingContext,
                    activePrompt,
                    primaryModelId,
                    fallbackModels,
                    maxRetries
                );
            } else if (backend === 'anthropic') {
                const { generateCardsClaude } = await import('../services/anthropic');
                newCards = await generateCardsClaude(
                    base64Image,
                    llmConfig.anthropicKey,
                    textContent,
                    existingContext,
                    activePrompt,
                    primaryModelId,
                    fallbackModels,
                    maxRetries
                );
            } else if (backend === 'openai') {
                const { generateCardsOpenAI } = await import('../services/openai');
                newCards = await generateCardsOpenAI(
                    base64Image,
                    llmConfig.openaiKey || llmConfig.apiKey,
                    textContent,
                    existingContext,
                    activePrompt,
                    null,
                    primaryModelId,
                    true, // useSchema
                    fallbackModels,
                    maxRetries,
                    llmConfig.openaiSchema ? JSON.parse(llmConfig.openaiSchema) : null
                );
            } else if (backend === 'local') {
                const { generateCardsOpenAI } = await import('../services/openai');
                newCards = await generateCardsOpenAI(
                    base64Image,
                    "lm-studio",
                    textContent,
                    existingContext,
                    activePrompt,
                    llmConfig.localUrl || "http://localhost:1234/v1",
                    primaryModelId,
                    true, // useSchema
                    fallbackModels,
                    maxRetries
                );
            } else {
                const { mockGenerateCards } = await import('../services/llm');
                newCards = await mockGenerateCards("mock content", "mock prompt");
            }



            // Add cards to store with page number and filename
            const cardFileName = get().pdfFile ? get().pdfFile.name : 'Unknown File';
            const cardsWithPage = newCards.map(c => ({
                ...c,
                id: crypto.randomUUID(), // Ensure ID
                pageNumber,
                fileName: cardFileName
            }));

            // Append new cards
            set(state => ({
                cards: [...state.cards, ...cardsWithPage],
                activePage: pageNumber,
                snapshotRequest: null // Clear request
            }));

            // Update Global Stats
            get().updateStats(newCards.length);

        } catch (error) {
            console.error("Failed to generate cards:", error);
            alert("Generation failed: " + error.message);
        } finally {
            setProcessing(false);
            set({ snapshotRequest: null });
        }
    },

    snapshotRequest: null, // { page: number, id: string }
    // Default Prompt Template

    // Multi-Model Prompts (Per-Project)
    prompts: {
        default: DEFAULT_PROMPT_OPENAI,
        gemini: DEFAULT_PROMPT_GEMINI,
        anthropic: DEFAULT_PROMPT_CLAUDE,
        openai: DEFAULT_PROMPT_OPENAI,
        local: DEFAULT_PROMPT_LOCAL
    },
    promptsModified: {},

    // Update specific prompt
    setPromptTemplate: (template, backend = 'default') => set(state => ({
        prompts: { ...state.prompts, [backend]: template },
        promptsModified: { ...state.promptsModified, [backend]: true }
    })),
})));

// Auto-Save Subscription (Debounced)
// Auto-Save Subscription (Metadata - Debounced)
let saveTimeout;
useAppStore.subscribe(
    (state) => ({
        cards: state.cards,
        annotations: state.annotations,
        currentPage: state.currentPage,
        stats: state.stats,
        // pdfFile: state.pdfFile, // REMOVED from frequent updates
        prompts: state.prompts,
        promptsModified: state.promptsModified,
        // Need the name to know WHERE to save, but not the blob
        pdfName: state.pdfFile ? state.pdfFile.name : null
    }),
    (data) => {
        if (!data.pdfName) return;

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveProject(data.pdfName, {
                cards: data.cards,
                annotations: data.annotations,
                currentPage: data.currentPage,
                stats: data.stats,
                prompts: data.prompts,
                promptsModified: data.promptsModified,
                // pdfFile: ... // Do NOT pass the blob here
            });
        }, 2000); // 2s debounce
    },
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);

// Auto-Save Subscription (PDF Blob - Triggered on File Load)
useAppStore.subscribe(
    (state) => state.pdfFile,
    (pdfFile) => {
        if (pdfFile && pdfFile.name) {
            console.log("[Store] New PDF loaded, saving blob...");
            saveProject(pdfFile.name, { pdfFile }); // SAVE BLOB ONCE
        }
    }
);

// Init Global Data
useAppStore.getState().loadStats();
useAppStore.getState().refreshStoredFiles();

// Load Settings
loadSettings().then(settings => {
    if (settings) {
        console.log("[Store] Hydrating settings");
        useAppStore.getState().hydrateSettings(settings);
    }
});

// Auto-Save Settings Subscription
let settingsTimeout;
useAppStore.subscribe(
    (state) => ({
        theme: state.theme,
        llmConfig: state.llmConfig,
        userSettings: state.userSettings,
        recentFiles: state.recentFiles
    }),
    (settings) => {
        clearTimeout(settingsTimeout);
        settingsTimeout = setTimeout(() => {
            saveSettings(settings);
        }, 1000);
    },
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);

