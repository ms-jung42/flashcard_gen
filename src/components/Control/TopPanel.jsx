import React, { useState } from 'react';
import { Settings, Edit3, BrainCircuit, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

export function TopPanel() {
    const { llmConfig, setLlmConfig, prompts, setPromptTemplate, theme, toggleTheme } = useAppStore();
    const [isPromptOpen, setIsPromptOpen] = useState(false);

    // Mock Backend Options
    const backends = [
        { id: 'mock', name: 'Mock Backend (Test)' },
        { id: 'openai', name: 'OpenAI (GPT-4)' },
    ];

    return (
        <div className="flex items-center gap-4">
            {/* Model Selection */}
            <div className="flex items-center gap-1 md:gap-2">
                <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Model:</span>
                <select
                    value={llmConfig.backend}
                    onChange={(e) => {
                        const val = e.target.value;
                        setLlmConfig({ backend: val });
                    }}
                    className="h-8 text-xs rounded-md border bg-background px-2 focus:ring-1 focus:ring-primary"
                >
                    <option value="mock">Mock Backend (Free)</option>
                    <option value="gemini">{llmConfig.models?.gemini?.name || 'Gemini'}</option>
                    <option value="anthropic">{llmConfig.models?.anthropic?.name || 'Claude'}</option>
                    <option value="openai">{llmConfig.models?.openai?.name || 'OpenAI'}</option>
                    <option value="local">{llmConfig.models?.local?.name || 'Local LLM'}</option>
                </select>
            </div>

            <div className="h-4 w-px bg-border/60 mx-2"></div>

            {/* Prompt Button */}
            <div className="relative">
                <button
                    onClick={() => setIsPromptOpen(!isPromptOpen)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all rounded-full border",
                        isPromptOpen
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    )}
                >
                    <Edit3 size={14} />
                    Prompt
                </button>

                {/* Prompt Modal */}
                {isPromptOpen && (
                    <div className="absolute top-12 right-0 z-50 w-96 p-4 bg-popover border rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <h3 className="font-semibold text-sm">System Prompt</h3>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    Editing for: <span className="text-primary font-bold">{llmConfig.backend}</span>
                                </span>
                            </div>
                            <button onClick={() => setIsPromptOpen(false)} className="text-muted-foreground hover:text-primary">&times;</button>
                        </div>
                        <textarea
                            value={prompts[llmConfig.backend] || prompts['default']}
                            onChange={(e) => setPromptTemplate(e.target.value, llmConfig.backend)}
                            className="w-full h-64 p-3 text-xs font-mono bg-muted/50 rounded-md border focus:ring-1 ring-primary resize-none focus:outline-none"
                            placeholder="Enter system prompt for card generation..."
                        />
                        <p className="text-[10px] text-muted-foreground italic">
                            This prompt is specific to the selected model and saved with this project.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
