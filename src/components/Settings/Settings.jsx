import React from 'react';
import { useAppStore, DEFAULT_PROMPT_OPENAI, DEFAULT_PROMPT_GEMINI, DEFAULT_PROMPT_CLAUDE, DEFAULT_PROMPT_LOCAL, DEFAULT_SCHEMA_JSON } from '../../store/useAppStore';
import { Moon, Sun, Monitor, Key, LayoutTemplate, RefreshCcw, Edit3, HardDrive, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PaletteEditor } from './PaletteEditor';

export function Settings() {
    const [isPaletteEditorOpen, setIsPaletteEditorOpen] = React.useState(false);
    const [editingCustomId, setEditingCustomId] = React.useState(null); // ID of custom preset currently being edited
    const {
        theme, toggleTheme,
        llmConfig, setLlmConfig, updateModelConfig, setDefaultBackend,
        userSettings, updateSettings
    } = useAppStore();

    return (
        <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-12">
            <div className="max-w-3xl mx-auto space-y-10">

                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 pb-4 border-b">Settings</h1>

                {/* Appearance */}
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Monitor size={20} /> Appearance
                    </h2>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Theme Mode</span>
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                <button
                                    onClick={() => theme === 'dark' && toggleTheme()}
                                    className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", theme === 'light' ? "bg-white shadow text-slate-900" : "text-slate-500")}
                                >
                                    <Sun size={16} className="inline mr-2" /> Light
                                </button>
                                <button
                                    onClick={() => theme === 'light' && toggleTheme()}
                                    className={cn("px-4 py-2 rounded-md text-sm font-medium transition-all", theme === 'dark' ? "bg-slate-700 shadow text-slate-100" : "text-slate-500")}
                                >
                                    <Moon size={16} className="inline mr-2" /> Dark
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="font-medium">Accent Color</span>
                            <div className="flex gap-4 items-center">
                                {/* Preset Colors */}
                                {/* Preset Colors */}
                                <div className="flex gap-2 border-r pr-4 border-slate-200 dark:border-slate-700">
                                    {[
                                        { id: 'blue', hex: '#3b82f6' },
                                        { id: 'violet', hex: '#8b5cf6' },
                                        { id: 'green', hex: '#22c55e' },
                                        { id: 'orange', hex: '#f97316' }
                                    ].map(color => (
                                        <button
                                            key={color.id}
                                            onClick={() => updateSettings({ themeColor: color.id })}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                                userSettings.themeColor === color.id ? "border-slate-900 dark:border-white scale-110 shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: color.hex }}
                                            title={color.id.charAt(0).toUpperCase() + color.id.slice(1)}
                                        />
                                    ))}
                                </div>

                                {/* Custom Color Pickers (3 Slots) */}
                                <div className="flex gap-4 items-center border-l pl-4 border-slate-200 dark:border-slate-700">
                                    {(userSettings.customPresets || [
                                        { id: 'custom-1', light: '#3b82f6', dark: '#60a5fa' },
                                        { id: 'custom-2', light: '#facc15', dark: '#eab308' },
                                        { id: 'custom-3', light: '#a78bfa', dark: '#8b5cf6' }
                                    ]).map((preset, index) => (
                                        <div key={preset.id} className="flex flex-col items-center gap-1 group relative">
                                            <div
                                                className={cn(
                                                    "relative w-8 h-8 rounded-full overflow-hidden border-2 shadow-sm hover:scale-105 transition-transform cursor-pointer",
                                                    userSettings.themeColor === preset.id
                                                        ? "border-slate-900 dark:border-white scale-110"
                                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                                )}
                                                onClick={() => {
                                                    if (userSettings.themeColor === preset.id) {
                                                        setEditingCustomId(prev => prev === preset.id ? null : preset.id);
                                                    } else {
                                                        updateSettings({ themeColor: preset.id });
                                                        setEditingCustomId(null);
                                                    }
                                                }}
                                                title={`Custom Preset ${index + 1}`}
                                            >
                                                <div
                                                    className="absolute inset-0"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${preset.light} 50%, ${preset.dark} 50%)`
                                                    }}
                                                />
                                            </div>
                                            <span className={cn(
                                                "text-[10px] uppercase font-bold transition-colors",
                                                userSettings.themeColor === preset.id ? "text-primary" : "text-muted-foreground"
                                            )}>Custom {index + 1}</span>

                                            {/* Edit Controls Popover (Click to Show) */}
                                            <div className={cn(
                                                "absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-[100] flex gap-3 transition-all",
                                                editingCustomId === preset.id ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2 pointer-events-none"
                                            )}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-600">
                                                        <div className="absolute inset-0" style={{ backgroundColor: preset.light }} />
                                                        <input
                                                            type="color"
                                                            value={preset.light}
                                                            onChange={(e) => {
                                                                const newPresets = userSettings.customPresets.map(p =>
                                                                    p.id === preset.id ? { ...p, light: e.target.value } : p
                                                                );
                                                                updateSettings({ customPresets: newPresets });
                                                            }}
                                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer opacity-0"
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-medium text-slate-500">Light</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-600">
                                                        <div className="absolute inset-0" style={{ backgroundColor: preset.dark }} />
                                                        <input
                                                            type="color"
                                                            value={preset.dark}
                                                            onChange={(e) => {
                                                                const newPresets = userSettings.customPresets.map(p =>
                                                                    p.id === preset.id ? { ...p, dark: e.target.value } : p
                                                                );
                                                                updateSettings({ customPresets: newPresets });
                                                            }}
                                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer opacity-0"
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-medium text-slate-500">Dark</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Snapshot Quality Settings */}
                        <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                            {/* Manual Snapshot */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-medium">Manual Snapshot Scale</h3>
                                    <p className="text-xs text-muted-foreground">Resolution for camera tool (Clipboard). Default: 3.0.</p>
                                </div>
                                <input
                                    type="number"
                                    min="1.0" max="5.0" step="0.5"
                                    value={userSettings.snapshotScaleManual || 3.0}
                                    onChange={(e) => updateSettings({ snapshotScaleManual: parseFloat(e.target.value) })}
                                    className="w-20 px-2 py-1 text-sm border rounded bg-slate-50 dark:bg-slate-950 font-mono text-center"
                                />
                            </div>

                            {/* Auto Generation Snapshot */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="space-y-1">
                                    <h3 className="font-medium">Auto-Gen Snapshot Scale</h3>
                                    <p className="text-xs text-muted-foreground">Resolution for Card Generation. Higher = clearer AI vision. Default: 3.0.</p>
                                </div>
                                <input
                                    type="number"
                                    min="1.0" max="5.0" step="0.5"
                                    value={userSettings.snapshotScaleAuto || 3.0}
                                    onChange={(e) => updateSettings({ snapshotScaleAuto: parseFloat(e.target.value) })}
                                    className="w-20 px-2 py-1 text-sm border rounded bg-slate-50 dark:bg-slate-950 font-mono text-center"
                                />
                            </div>
                        </div>

                        {/* Cloze Palette Section (Sophisticated Version Restored) */}
                        <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-medium">Card Color Palette</h3>
                                    <p className="text-xs text-muted-foreground">Define colors for Basic cards (1) and Cloze deletions (2-5).</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="text-xs px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
                                        onClick={() => updateSettings({ clozePalette: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'] })}
                                    >
                                        <RefreshCcw size={12} /> Revert
                                    </button>
                                    <button
                                        className="text-xs px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-slate-600 dark:text-slate-300"
                                        onClick={() => setIsPaletteEditorOpen(true)}
                                    >
                                        <Edit3 size={12} /> Edit Hex
                                    </button>
                                </div>
                            </div>

                            <PaletteEditor
                                isOpen={isPaletteEditorOpen}
                                onClose={() => setIsPaletteEditorOpen(false)}
                                currentPalette={userSettings.clozePalette || ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7']}
                                onSave={(newColors) => updateSettings({ clozePalette: newColors })}
                            />

                            {/* Presets + Custom Row */}
                            <div className="flex flex-col gap-4">
                                {/* Presets */}
                                <div className="flex gap-2">
                                    {[
                                        { name: 'Vibrant', colors: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'] }, // Default
                                        { name: 'Pastel', colors: ['#93c5fd', '#fca5a5', '#86efac', '#fde047', '#d8b4fe'] },
                                        { name: 'Neon', colors: ['#00f2ff', '#ff0055', '#39ff14', '#ffff00', '#b026ff'] },
                                        { name: 'Dark', colors: ['#1e40af', '#991b1b', '#166534', '#854d0e', '#6b21a8'] },
                                    ].map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => updateSettings({ clozePalette: preset.colors })}
                                            className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 group"
                                        >
                                            <div className="flex -space-x-1">
                                                {preset.colors.map((c, i) => (
                                                    <div key={i} className="w-3 h-3 rounded-full ring-1 ring-white dark:ring-slate-900" style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Palette Editor */}
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex gap-4 items-center flex-wrap">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2 shrink-0">Custom</span>
                                    {([0, 1, 2, 3, 4]).map((index) => (
                                        <div key={index} className="flex flex-col items-center gap-1 group">
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-900 shadow-sm hover:scale-110 transition-transform cursor-pointer">
                                                <input
                                                    type="color"
                                                    value={userSettings.clozePalette?.[index] || ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'][index]}
                                                    onChange={(e) => {
                                                        const newPalette = [...(userSettings.clozePalette || ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7'])];
                                                        newPalette[index] = e.target.value;
                                                        updateSettings({ clozePalette: newPalette });
                                                    }}
                                                    className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer"
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground select-none group-hover:text-primary transition-colors">{index + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* AI Configuration */}
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Key size={20} /> AI Configuration
                    </h2>

                    <div className="space-y-6">

                        {/* OpenAI */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setDefaultBackend('openai')}
                                        className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                            llmConfig.defaultBackend === 'openai' ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                                        )}
                                    >
                                        {llmConfig.defaultBackend === 'openai' && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </button>
                                    <h3 className="font-semibold text-base">OpenAI</h3>
                                </div>
                                <button
                                    onClick={() => setEditingCustomId(editingCustomId === 'openai-prompt' ? null : 'openai-prompt')}
                                    className="text-xs flex items-center gap-1.5 text-slate-500 bg-slate-100 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium px-3 py-1.5 rounded-md"
                                >
                                    <Edit3 size={12} />
                                    {editingCustomId === 'openai-prompt' ? 'Close Prompt' : 'Default Prompt'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Model ID</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.openai?.id || 'gpt-4o'}
                                        onChange={(e) => updateModelConfig('openai', 'id', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border rounded-md font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Display Name</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.openai?.name || 'OpenAI GPT-4o'}
                                        onChange={(e) => updateModelConfig('openai', 'name', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">API Key</label>
                                <input
                                    type="password"
                                    value={llmConfig.openaiKey || ''}
                                    onChange={(e) => setLlmConfig({ openaiKey: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-md font-mono text-sm"
                                />
                            </div>

                            {/* Fallback Options */}
                            <div className="pt-2">
                                <details className="group">
                                    <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-primary list-none flex items-center gap-1">
                                        <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                                        Fallback Configuration
                                    </summary>
                                    <div className="pl-4 pt-2 space-y-3 border-l-2 border-slate-100 dark:border-slate-800 ml-1 mt-1">
                                        <div className="flex items-start gap-3">
                                            <div className="space-y-1 w-16 shrink-0">
                                                <label className="text-xs block whitespace-nowrap text-slate-500">Retries</label>
                                                <input
                                                    type="number"
                                                    min="0" max="5"
                                                    value={llmConfig.models?.openai?.retries ?? 1}
                                                    onChange={(e) => updateModelConfig('openai', 'retries', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <label className="text-xs block text-slate-500">Fallback Sequence (comma separated IDs):</label>
                                                <input
                                                    type="text"
                                                    placeholder="model-id-1, model-id-2"
                                                    value={llmConfig.models?.openai?.fallbacks?.join(', ') || ''}
                                                    onChange={(e) => updateModelConfig('openai', 'fallbacks', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Models to try in order if the primary fails.</p>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </div>

                            {/* Prompt Editor */}
                            {editingCustomId === 'openai-prompt' && (
                                <div className="mt-2 pt-4 border-t animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Default System Prompt</label>
                                        <button
                                            onClick={() => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, openai: null } })}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>
                                    <textarea
                                        value={userSettings.defaultPrompts?.openai ?? DEFAULT_PROMPT_OPENAI}
                                        onChange={(e) => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, openai: e.target.value } })}
                                        className="w-full h-48 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 border rounded-md focus:ring-1 ring-primary resize-y focus:outline-none leading-relaxed"
                                    />
                                </div>
                            )}


                        </div>

                        {/* Gemini */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setDefaultBackend('gemini')}
                                        className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                            llmConfig.defaultBackend === 'gemini' ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                                        )}
                                    >
                                        {llmConfig.defaultBackend === 'gemini' && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </button>
                                    <h3 className="font-semibold text-base">Gemini</h3>
                                </div>
                                <button
                                    onClick={() => setEditingCustomId(editingCustomId === 'gemini-prompt' ? null : 'gemini-prompt')}
                                    className="text-xs flex items-center gap-1.5 text-slate-500 bg-slate-100 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium px-3 py-1.5 rounded-md"
                                >
                                    <Edit3 size={12} />
                                    {editingCustomId === 'gemini-prompt' ? 'Close Prompt' : 'Default Prompt'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Model ID</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.gemini?.id || 'gemini-1.5-pro'}
                                        onChange={(e) => updateModelConfig('gemini', 'id', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border rounded-md font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Display Name</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.gemini?.name || 'Gemini 3 Pro (Preview)'}
                                        onChange={(e) => updateModelConfig('gemini', 'name', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">API Key</label>
                                <input
                                    type="password"
                                    placeholder="AIzaSy..."
                                    value={llmConfig.geminiKey || ''}
                                    onChange={(e) => setLlmConfig({ geminiKey: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-md font-mono text-sm"
                                />
                            </div>

                            {/* Fallback Options */}
                            <div className="pt-2">
                                <details className="group">
                                    <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-primary list-none flex items-center gap-1">
                                        <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                                        Fallback Configuration
                                    </summary>
                                    <div className="pl-4 pt-2 space-y-3 border-l-2 border-slate-100 dark:border-slate-800 ml-1 mt-1">
                                        <div className="flex items-start gap-3">
                                            <div className="space-y-1 w-16 shrink-0">
                                                <label className="text-xs block whitespace-nowrap text-slate-500">Retries</label>
                                                <input
                                                    type="number"
                                                    min="0" max="5"
                                                    value={llmConfig.models?.gemini?.retries ?? 1}
                                                    onChange={(e) => updateModelConfig('gemini', 'retries', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <label className="text-xs block text-slate-500">Fallback Sequence (comma separated IDs):</label>
                                                <input
                                                    type="text"
                                                    placeholder="model-id-1, model-id-2"
                                                    value={llmConfig.models?.gemini?.fallbacks?.join(', ') || ''}
                                                    onChange={(e) => updateModelConfig('gemini', 'fallbacks', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Models to try in order if the primary fails.</p>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </div>

                            {editingCustomId === 'gemini-prompt' && (
                                <div className="mt-2 pt-4 border-t animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Default System Prompt</label>
                                        <button
                                            onClick={() => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, gemini: null } })}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>
                                    <textarea
                                        value={userSettings.defaultPrompts?.gemini ?? DEFAULT_PROMPT_GEMINI}
                                        onChange={(e) => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, gemini: e.target.value } })}
                                        className="w-full h-48 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border rounded-md focus:ring-1 ring-primary resize-y focus:outline-none leading-relaxed"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Anthropic */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setDefaultBackend('anthropic')}
                                        className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                            llmConfig.defaultBackend === 'anthropic' ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                                        )}
                                    >
                                        {llmConfig.defaultBackend === 'anthropic' && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </button>
                                    <h3 className="font-semibold text-base">Anthropic</h3>
                                </div>
                                <button
                                    onClick={() => setEditingCustomId(editingCustomId === 'anthropic-prompt' ? null : 'anthropic-prompt')}
                                    className="text-xs flex items-center gap-1.5 text-slate-500 bg-slate-100 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium px-3 py-1.5 rounded-md"
                                >
                                    <Edit3 size={12} />
                                    {editingCustomId === 'anthropic-prompt' ? 'Close Prompt' : 'Default Prompt'}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Model ID</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.anthropic?.id || 'claude-3-5-sonnet-20240620'}
                                        onChange={(e) => updateModelConfig('anthropic', 'id', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border rounded-md font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">Display Name</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.anthropic?.name || 'Claude 3.5 Sonnet'}
                                        onChange={(e) => updateModelConfig('anthropic', 'name', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">API Key</label>
                                <input
                                    type="password"
                                    value={llmConfig.anthropicKey || ''}
                                    onChange={(e) => setLlmConfig({ anthropicKey: e.target.value })}
                                    placeholder="sk-ant-..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-md font-mono text-sm"
                                />
                            </div>

                            {/* Fallback Options */}
                            <div className="pt-2">
                                <details className="group">
                                    <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-primary list-none flex items-center gap-1">
                                        <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                                        Fallback Configuration
                                    </summary>
                                    <div className="pl-4 pt-2 space-y-3 border-l-2 border-slate-100 dark:border-slate-800 ml-1 mt-1">
                                        <div className="flex items-start gap-3">
                                            <div className="space-y-1 w-16 shrink-0">
                                                <label className="text-xs block whitespace-nowrap text-slate-500">Retries</label>
                                                <input
                                                    type="number"
                                                    min="0" max="5"
                                                    value={llmConfig.models?.anthropic?.retries ?? 1}
                                                    onChange={(e) => updateModelConfig('anthropic', 'retries', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <label className="text-xs block text-slate-500">Fallback Sequence (comma separated IDs):</label>
                                                <input
                                                    type="text"
                                                    placeholder="model-id-1, model-id-2"
                                                    value={llmConfig.models?.anthropic?.fallbacks?.join(', ') || ''}
                                                    onChange={(e) => updateModelConfig('anthropic', 'fallbacks', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Models to try in order if the primary fails.</p>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </div>

                            {editingCustomId === 'anthropic-prompt' && (
                                <div className="mt-2 pt-4 border-t animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Default System Prompt</label>
                                        <button
                                            onClick={() => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, anthropic: null } })}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>
                                    <textarea
                                        value={userSettings.defaultPrompts?.anthropic ?? DEFAULT_PROMPT_CLAUDE}
                                        onChange={(e) => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, anthropic: e.target.value } })}
                                        className="w-full h-48 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border rounded-md focus:ring-1 ring-primary resize-y focus:outline-none leading-relaxed"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Local LLM */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setDefaultBackend('local')}
                                        className={cn(
                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                            llmConfig.defaultBackend === 'local' ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-600 hover:border-slate-400"
                                        )}
                                    >
                                        {llmConfig.defaultBackend === 'local' && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </button>
                                    <h3 className="font-semibold text-base">Local LLM</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingCustomId(editingCustomId === 'local-prompt' ? null : 'local-prompt')}
                                        className="text-xs flex items-center gap-1.5 text-slate-500 bg-slate-100 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium px-3 py-1.5 rounded-md"
                                    >
                                        <Edit3 size={12} />
                                        {editingCustomId === 'local-prompt' ? 'Close Prompt' : 'Default Prompt'}
                                    </button>
                                    <button
                                        onClick={() => setEditingCustomId(editingCustomId === 'local-schema' ? null : 'local-schema')}
                                        className="text-xs flex items-center gap-1.5 text-slate-500 bg-slate-100 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors font-medium px-3 py-1.5 rounded-md"
                                    >
                                        <Edit3 size={12} />
                                        {editingCustomId === 'local-schema' ? 'Close Schema' : 'Edit Schema'}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Base URL</label>
                                    <input
                                        type="text"
                                        value={llmConfig.localUrl || 'http://localhost:1234/v1'}
                                        onChange={(e) => setLlmConfig({ backend: 'local', localUrl: e.target.value })}
                                        placeholder="http://localhost:1234/v1"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-md font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Model Name / ID</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.local?.id || 'llama-3.2-11b-vision-instruct'}
                                        onChange={(e) => {
                                            setLlmConfig({ backend: 'local', localModel: e.target.value });
                                            updateModelConfig('local', 'id', e.target.value);
                                        }}
                                        placeholder="model-id"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-md font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs font-medium text-slate-500 uppercase">Display Name</label>
                                    <input
                                        type="text"
                                        value={llmConfig.models?.local?.name || 'Local LLM'}
                                        onChange={(e) => updateModelConfig('local', 'name', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-md text-xs"
                                    />
                                </div>
                            </div>

                            {/* Fallback Options */}
                            <div className="pt-2">
                                <details className="group">
                                    <summary className="text-xs font-medium text-slate-500 cursor-pointer hover:text-primary list-none flex items-center gap-1">
                                        <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                                        Fallback Configuration
                                    </summary>
                                    <div className="pl-4 pt-2 space-y-3 border-l-2 border-slate-100 dark:border-slate-800 ml-1 mt-1">
                                        <div className="flex items-start gap-3">
                                            <div className="space-y-1 w-16 shrink-0">
                                                <label className="text-xs block whitespace-nowrap text-slate-500">Retries</label>
                                                <input
                                                    type="number"
                                                    min="0" max="5"
                                                    value={llmConfig.models?.local?.retries ?? 1}
                                                    onChange={(e) => updateModelConfig('local', 'retries', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1 flex-1">
                                                <label className="text-xs block text-slate-500">Fallback Sequence (comma separated IDs):</label>
                                                <input
                                                    type="text"
                                                    placeholder="openai, gemini"
                                                    value={llmConfig.models?.local?.fallbacks?.join(', ') || ''}
                                                    onChange={(e) => updateModelConfig('local', 'fallbacks', e.target.value.split(',').map(s => s.trim()))}
                                                    className="w-full px-2 py-1 text-xs border rounded bg-slate-50 dark:bg-slate-950 font-mono"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Models to try in order if the primary fails.</p>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            </div>

                            {editingCustomId === 'local-prompt' && (
                                <div className="mt-2 pt-4 border-t animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Default Structured Prompt (JSON)</label>
                                        <button
                                            onClick={() => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, local: null } })}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>
                                    <textarea
                                        value={userSettings.defaultPrompts?.local ?? DEFAULT_PROMPT_LOCAL}
                                        onChange={(e) => updateSettings({ defaultPrompts: { ...userSettings.defaultPrompts, local: e.target.value } })}
                                        className="w-full h-48 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border rounded-md focus:ring-1 ring-primary resize-y focus:outline-none leading-relaxed"
                                    />
                                </div>
                            )}

                            {editingCustomId === 'local-schema' && (
                                <div className="mt-2 pt-4 border-t animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Detailed JSON Schema</label>
                                        <button
                                            onClick={() => setLlmConfig({ backend: 'local', localSchema: JSON.stringify(DEFAULT_SCHEMA_JSON, null, 2) })}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Reset to Default
                                        </button>
                                    </div>
                                    <textarea
                                        value={llmConfig.localSchema || ''}
                                        onChange={(e) => setLlmConfig({ backend: 'local', localSchema: e.target.value })}
                                        className="w-full h-64 p-3 text-xs font-mono bg-slate-50 dark:bg-slate-900 border rounded-md focus:ring-1 ring-primary resize-y focus:outline-none leading-relaxed"
                                        placeholder='{ ... }'
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                </section >

                {/* Preferences */}
                < section className="space-y-6" >
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <LayoutTemplate size={20} /> Workspace
                    </h2>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Flip Layout (PDF on Right)</span>
                            <button
                                onClick={() => updateSettings({ flipLayout: !userSettings.flipLayout })}
                                className={cn(
                                    "w-11 h-6 rounded-full transition-colors relative",
                                    userSettings.flipLayout ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                                )}
                            >
                                <div className={cn("absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform", userSettings.flipLayout ? "translate-x-5" : "translate-x-0")} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="font-medium">Default PDF Zoom</span>
                            <select
                                value={userSettings.pdfScale}
                                onChange={(e) => updateSettings({ pdfScale: parseFloat(e.target.value) })}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-md text-sm"
                            >
                                <option value={0.8}>80%</option>
                                <option value={1.0}>100% (Fit)</option>
                                <option value={1.25}>125%</option>
                                <option value={1.5}>150%</option>
                            </select>
                        </div>
                    </div>
                </section >

                {/* Data & Storage (New) */}
                < section className="space-y-6" >
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <HardDrive size={20} /> Data & Storage
                    </h2>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border p-6 space-y-6">
                        {/* Global Stats */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium">Global Statistics</h3>
                                <p className="text-sm text-slate-500">
                                    Total Cards: {useAppStore.getState().stats?.totalCards || 0} •
                                    Files: {useAppStore.getState().stats?.totalFiles || 0}
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    if (confirm("Are you sure you want to reset all statistics?")) {
                                        await useAppStore.getState().clearGlobalStats();
                                        alert("Statistics reset.");
                                    }
                                }}
                                className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                Reset Stats
                            </button>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">Stored Projects (IndexedDB)</h3>
                                <button
                                    onClick={() => useAppStore.getState().refreshStoredFiles()}
                                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                    title="Refresh List"
                                >
                                    <RefreshCcw size={14} />
                                </button>
                            </div>

                            {useAppStore.getState().storedFiles?.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No saved projects found.</p>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {useAppStore.getState().storedFiles.map(file => (
                                        <div key={file} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 group">
                                            <span className="text-sm font-medium truncate flex-1">{file}</span>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Potential "Open" button could go here */}
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`Delete project "${file}"? This cannot be undone.`)) {
                                                            await useAppStore.getState().deleteStoredFile(file);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Delete Project"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                                Projects are auto-saved here. You can manually delete them to free up space after exporting to ZIP.
                            </p>
                        </div>
                    </div>
                </section >

            </div >
        </div >
    );
}
