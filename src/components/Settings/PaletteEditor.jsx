import React, { useState, useEffect } from 'react';
import { X, Save, Copy } from 'lucide-react';

export function PaletteEditor({ isOpen, onClose, currentPalette, onSave }) {
    const [colors, setColors] = useState(currentPalette);
    const [textValue, setTextValue] = useState(currentPalette.join(', '));

    useEffect(() => {
        setColors(currentPalette);
        setTextValue(currentPalette.join(', '));
    }, [currentPalette, isOpen]);

    if (!isOpen) return null;

    const handleTextChange = (e) => {
        setTextValue(e.target.value);
        // Try to parse hex codes
        const matches = e.target.value.match(/#[0-9a-fA-F]{6}/g);
        if (matches && matches.length === 5) {
            setColors(matches);
        }
    };

    const handleSave = () => {
        // Validate
        const hexRegex = /^#[0-9a-fA-F]{6}$/;
        const valid = colors.every(c => hexRegex.test(c)) && colors.length === 5;

        if (valid) {
            onSave(colors);
            onClose();
        } else {
            // If colors state isn't valid, try parsing text one last time
            const matches = textValue.match(/#[0-9a-fA-F]{6}/g);
            if (matches && matches.length === 5) {
                onSave(matches);
                onClose();
            } else {
                alert("Please ensure exactly 5 valid HEX codes (e.g. #ff0000).");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-lg">Edit Palette</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Visual Preview */}
                    <div className="flex justify-between gap-2">
                        {colors.map((c, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className="w-10 h-10 rounded-full shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" style={{ backgroundColor: c }} />
                                <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>
                            </div>
                        ))}
                    </div>

                    {/* Text Area */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hex Codes (Comma Separated)</label>
                        <textarea
                            value={textValue}
                            onChange={handleTextChange}
                            className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-950 border rounded-lg font-mono text-sm resize-none focus:ring-2 ring-primary focus:outline-none"
                            placeholder="#123456, #abcdef, ..."
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className={colors.length === 5 ? "text-green-500" : "text-amber-500"}>
                                Found {colors.length}/5 colors
                            </span>
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 rounded-b-xl flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                        <Save size={14} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
