import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Type, Check, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

// Helper to parse simple markdown (bold & italic)
const formatText = (text) => {
    if (!text) return null;
    // Split by bold (**...**)
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.length >= 4) {
            return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        // Split text content by italic (*...* or _..._)
        return part.split(/(\*[^*]+\*|_[^_]+_)/g).map((subPart, j) => {
            if ((subPart.startsWith('*') && subPart.endsWith('*') && subPart.length >= 2) ||
                (subPart.startsWith('_') && subPart.endsWith('_') && subPart.length >= 2)) {
                return <em key={`${i}-${j}`} className="italic">{subPart.slice(1, -1)}</em>;
            }
            return <span key={`${i}-${j}`}>{subPart}</span>;
        });
    });
};

const ClozeDisplay = ({ text }) => {
    if (!text) return <span className="text-muted-foreground italic">Empty Cloze Card</span>;
    // Split by {{c1::...}} or {{...}}
    const parts = text.split(/({{c\d+::.*?}}|{{.*?}})/g);
    // Color mapping helper
    const getClozeStyle = (index) => {
        const styles = [
            'text-indigo-700 bg-indigo-100 border-indigo-200', // c1
            'text-emerald-700 bg-emerald-100 border-emerald-200', // c2
            'text-amber-700 bg-amber-100 border-amber-200', // c3
            'text-rose-700 bg-rose-100 border-rose-200', // c4
            'text-sky-700 bg-sky-100 border-sky-200', // c5
        ];
        return styles[(index - 1) % styles.length] || styles[0];
    };

    return (
        <div className="text-sm leading-relaxed">
            {parts.map((part, i) => {
                const match = part.match(/{{c(\d+)::(.*?)}}/);
                const simpleMatch = part.match(/{{(.*?)}}/);
                let content = null;
                let index = 1;

                if (match) {
                    index = parseInt(match[1], 10);
                    content = match[2];
                } else if (simpleMatch) {
                    content = simpleMatch[1];
                }

                if (content) {
                    const style = getClozeStyle(index);
                    return (
                        <span key={i} className={cn("font-bold px-1.5 py-0.5 rounded mx-0.5 border box-decoration-clone", style)}>
                            {formatText(content)}
                        </span>
                    );
                }
                return <span key={i}>{formatText(part)}</span>;
            })}
        </div>
    );
};

// Helper for Tag Editing
const TagInput = ({ tags, onChange, onSave }) => {
    const { cards } = useAppStore();
    const [value, setValue] = useState(tags.join(', '));
    const [suggestions, setSuggestions] = useState([]);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef(null);

    // Get all unique tags from all cards
    const allTags = React.useMemo(() => {
        const uniqueTags = new Set();
        cards.forEach(c => c.tags?.forEach(t => uniqueTags.add(t)));
        return Array.from(uniqueTags).sort();
    }, [cards]);

    // Sync if tags change externally (initial load)
    useEffect(() => {
        setValue(tags.join(', '));
    }, [tags]);

    // Handle input change & filtering
    const handleChange = (e) => {
        const val = e.target.value;
        setValue(val);

        // Find current tag being typed (last one)
        const parts = val.split(',');
        const currentPart = parts[parts.length - 1].trim().toLowerCase();

        if (currentPart && currentPart.length > 0) {
            const matches = allTags
                .filter(t => t.toLowerCase().startsWith(currentPart) && t.toLowerCase() !== currentPart)
                .slice(0, 5); // Limit to 5 suggestions
            setSuggestions(matches);
            setFocusedIndex(-1); // Reset focus
        } else {
            setSuggestions([]);
        }
    };

    const commitTag = (suggestion) => {
        const parts = value.split(',');
        parts[parts.length - 1] = suggestion; // Replace last part

        // Add a comma for convenience if it's a new tag, BUT we immediate commit too
        let newValue = parts.join(', ') + ', ';

        // Immediate clean up context
        const newTags = newValue.split(',').map(t => t.trim()).filter(Boolean);
        const uniqueTags = Array.from(new Set(newTags));

        // If we found duplicates immediately, rewrite newValue
        if (newTags.length !== uniqueTags.length) {
            newValue = uniqueTags.join(', ') + ', ';
        }

        setValue(newValue);
        setSuggestions([]);
        onChange(uniqueTags);
    };

    const handleKeyDown = (e) => {
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(i => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(i => Math.max(i - 1, -1));
            } else if (e.key === 'Tab') {
                e.preventDefault();
                // Select focused OR first suggestion
                const targetIndex = focusedIndex >= 0 ? focusedIndex : 0;
                commitTag(suggestions[targetIndex]);
            } else if (e.key === 'Enter') {
                if (focusedIndex >= 0) {
                    e.preventDefault();
                    commitTag(suggestions[focusedIndex]);
                }
                // If no suggestion selected, Enter just bubbles (or commits standard via blur/submit)
            } else if (e.key === 'Escape') {
                setSuggestions([]);
            }
        }

        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            // Ensure current value is committed before saving
            const newTags = value.split(',').map(t => t.trim()).filter(Boolean);
            const uniqueTags = Array.from(new Set(newTags));
            if (JSON.stringify(uniqueTags) !== JSON.stringify(tags)) {
                onChange(uniqueTags);
            }
            if (onSave) onSave();
        }
    };

    const handleBlur = () => {
        // Small delay to allow clicking suggestions
        setTimeout(() => {
            const newTags = value.split(',').map(t => t.trim()).filter(Boolean);
            const uniqueTags = Array.from(new Set(newTags)); // Deduplicate on blur

            // Compare sets to avoid loop AND check if input value is messy
            const tagsChanged = JSON.stringify(uniqueTags.sort()) !== JSON.stringify(tags.sort());

            if (tagsChanged) {
                onChange(uniqueTags);
            } else {
                // If tags aren't different, but our input value MIGHT be (e.g. "tag1, tag1"), we need to reset the input view
                // We do this by forcing a value reset. 
                // Since this runs after a delay, relying on prop sync might be slow if parent doesn't re-render.
                // We can just set it directly to the canonical form.
                setValue(uniqueTags.join(', '));
            }
            setSuggestions([]);
        }, 200);
    };

    return (
        <div className="relative flex-1" ref={containerRef}>
            <input
                type="text"
                className="w-full text-xs bg-transparent border-b border-muted-foreground/30 focus:border-primary outline-none py-1"
                placeholder="biology, exam, chapter1..."
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
            {suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-full bg-popover text-popover-foreground border rounded shadow-md z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {suggestions.map((suggestion, i) => (
                        <div
                            key={suggestion}
                            className={cn(
                                "px-2 py-1.5 text-xs cursor-pointer hover:bg-muted transition-colors",
                                i === focusedIndex ? "bg-primary text-primary-foreground" : ""
                            )}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                commitTag(suggestion);
                            }}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Content Area - Isolated State for IME + Images
const ContentArea = ({ label, value, images = [], onCommit, onAddImage, onRemoveImage, onViewImage, placeholder, className, isCloze, isEditing, onSave }) => {
    const [localValue, setLocalValue] = useState(value || '');

    // Sync local value if parent value changes externally (e.g. init)
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const textareaRef = useRef(null);
    // Auto-resize textarea
    React.useLayoutEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const height = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(Math.max(height, 80), 300)}px`;
        }
    }, [localValue, isEditing]);

    const handleBlur = () => {
        if (localValue !== value) {
            onCommit(localValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            onCommit(localValue);
            if (onSave) onSave();
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    if (onAddImage) onAddImage(base64);
                };
                reader.readAsDataURL(blob);
            }
        }
    };

    return (
        <div className={cn("flex flex-col flex-1 min-h-[80px] relative group/field", className)}>
            {label && <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1 select-none">{label}</span>}

            {/* Text Input */}
            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    // Removed flex-1 to allow height to be controlled by style
                    className="w-full resize-none bg-secondary/50 p-2 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono transition-all overflow-y-auto"
                    placeholder={placeholder}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <div className="text-sm whitespace-pre-wrap">
                    {isCloze ? <ClozeDisplay text={value} /> : (value ? formatText(value) : <span className="text-muted-foreground italic">Empty</span>)}
                </div>
            )}

            {/* Image Grid */}
            {images.length > 0 && (
                <div className={cn("flex flex-wrap gap-2 mt-2", isEditing ? "" : "flex-col")}>
                    {images.map((img, idx) => (
                        <div key={idx} className={cn("relative group/image", isEditing ? "w-16 h-16" : "w-full")}>
                            <img
                                src={img}
                                alt="Attachment"
                                className={cn(
                                    "object-cover rounded border bg-background",
                                    isEditing ? "w-full h-full cursor-pointer hover:ring-2 ring-primary" : "w-full h-auto max-h-[300px] object-contain"
                                )}
                                onDoubleClick={(e) => { e.stopPropagation(); if (isEditing && onViewImage) onViewImage(img); }}
                            />
                            {isEditing && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveImage(idx); }}
                                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover/image:opacity-100 transition-opacity"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isEditing && images.length === 0 && onAddImage && (
                <div className="text-[10px] text-muted-foreground italic mt-2">
                    Paste images here...
                </div>
            )}
        </div>
    );
};

export function Flashcard({ card, onUpdate, onDelete }) {
    const { editingCardId, setEditingCardId, selectedCardIds, toggleCardSelection } = useAppStore();
    const isEditing = editingCardId === card.id;
    const isSelected = selectedCardIds.includes(card.id);

    // We keep local draft values, initialized when we ENTER edit mode
    // We only save to store when we EXIT edit mode (or specific fields change if we wanted live)
    const [editValues, setEditValues] = useState({});
    const [viewImage, setViewImage] = useState(null);

    // When entering edit mode, init values
    // When leaving (activeId changes away from us), SAVE if we have changes
    // We need a ref to track if we WERE editing to detect the "exit" transition
    const wasEditing = useRef(false);

    useEffect(() => {
        if (isEditing && !wasEditing.current) {
            // Just entered
            setEditValues({
                front: card.front,
                back: card.back,
                text: card.text,
                type: card.type,
                frontImages: card.frontImages || [],
                backImages: card.backImages || [],
                tags: card.tags || []
            });
            wasEditing.current = true;
        } else if (!isEditing && wasEditing.current) {
            // Just exited - AUTO SAVE
            // We need to be careful: if we clicked "Cancel", we don't want to save.
            // But "Cancel" explicitly clears the ID.
            // For now, let's assume default exit = save.
            // The "Cancel" button will need to handle this specially? 
            // Actually, if we click another card, isEditing becomes false immediately.
            // We can't distinguish "Click other card" from "Cancel button".
            // SOLUTION: The Cancel button should revert changes or we just accept "Always Save" on exit
            // except when explicitly cancelled.
            // Let's implement "Always Save" on blur for now as requested ("always save unless cancel was pressed").
            // But 'editValues' here is a closure stale value if not careful? 
            // 'editValues' state is up to date in this render cycle? 
            // React 18 batching... 
            // Ideally, we'd trigger the save *before* state change, but we can't intercept the store change.
            // We'll rely on the fact that we can call onUpdate with current `editValues`.
            // HOWEVER: useEffect dependencies!
            onUpdate(card.id, editValues);
            wasEditing.current = false;
        }
    }, [isEditing, card.id, onUpdate]); // depend on editValues?? infinite loop if we update values?

    // Better approach for Auto-Save:
    // Don't rely on useEffect for saving. relying on unmount/dep change for data persistence is flaky.
    // Instead: The "Global Click" handler is hard.
    // Let's settle for: changing focus saves the OLD card.
    // But we are inside the component. We don't know when we lose focus until it happens.
    // 
    // ALTERNATIVE: Live update the store 'draft'? No, too complex.
    //
    // Let's try the useEffect approach but add editValues to deps. 
    // Wait, if I type a letter, editValues changes -> effect runs -> it sees isEditing=true -> no save.
    // If I click away -> isEditing=false -> effect runs -> save.
    // ISSUE: `editValues` might be stale in the effect closure if not in deps.
    // If I put it in deps, it runs on every keystroke (but isEditing is strictly true, so no save).
    // So: [isEditing, editValues]
    // CASE: isEditing goes true -> false. Effect runs. editValues is available. SAVE.
    // This seems to work!

    // Explicit Cancel:
    const cancelEditing = (e) => {
        e.stopPropagation();
        // To prevent the useEffect from saving, we need a flag?
        // Or we just revert the local values before closing?
        // If we revert local values, the save will just save the original values (no op).
        setEditValues({
            front: card.front,
            back: card.back,
            text: card.text,
            type: card.type,
            frontImages: card.frontImages || [],
            backImages: card.backImages || [],
            tags: card.tags || []
        });
        // We need to force the 'wasEditing' ref to false so the effect doesn't fire?
        // Or just let it fire with reverted values.
        wasEditing.current = false; // Bypass the "Just exited" check?
        setEditingCardId(null);
    };

    const saveEditing = (e) => {
        e.stopPropagation();
        onUpdate(card.id, editValues);
        console.log("Saving", editValues);
        // wasEditing.current = false; // We can let the effect run, it's fine, it will save again (redundant but safe) or we optimize.
        // Actually if we save here, the effect might save again with same values.
        // Let's just close.
        setEditingCardId(null);
    };

    const startEditing = (e) => {
        e.stopPropagation();
        setEditingCardId(card.id);
    };

    const updateEditValue = (field, value) => {
        setEditValues(prev => ({ ...prev, [field]: value }));
    };

    const addImage = (side, base64) => {
        const key = side === 'front' ? 'frontImages' : 'backImages';
        setEditValues(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), base64]
        }));
    };

    const removeImage = (side, index) => {
        const key = side === 'front' ? 'frontImages' : 'backImages';
        setEditValues(prev => ({
            ...prev,
            [key]: (prev[key] || []).filter((_, i) => i !== index)
        }));
    };


    const handleCardClick = (e) => {
        // If holding Ctrl/Cmd, toggle selection instead
        if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            toggleCardSelection(card.id);
            return;
        }

        // If currently editing elsewhere...
        if (editingCardId && editingCardId !== card.id) {
            // Just close the other card (which triggers its save effect)
            // Do NOT open this card yet.
            setEditingCardId(null);
            return;
        }

        // If not editing anything, or clicking the same card (which implies we are already editing, but listeners might be off)
        // If we are already editing THIS card, do nothing (click bubbles to inputs)
        if (!isEditing) {
            startEditing(e);
        }
    };

    return (
        <>
            <div
                className={cn(
                    "relative rounded-lg border bg-card dark:bg-slate-900 text-card-foreground shadow-sm transition-all hover:shadow-md group",
                    "flex flex-col overflow-hidden select-none", // select-none helps text drag issues in view mode
                    isEditing ? "ring-2 ring-primary ring-offset-1 z-10 cursor-default" : "cursor-pointer",
                    isSelected ? "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : ""
                )}
                onClick={handleCardClick}
            >
                {/* Header / Type / Tags */}
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded text-white uppercase flex-shrink-0",
                            card.type === 'cloze' ? "bg-indigo-500" : "bg-emerald-500"
                        )}>
                            {card.type === 'cloze' ? 'Cloze' : 'Basic'}
                        </span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Card"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex flex-col gap-0 divider-y divide-y flex-1">
                    {card.type === 'cloze' ? (
                        <>
                            <div className="p-4 bg-white dark:bg-transparent">
                                <ContentArea
                                    value={isEditing ? (editValues.text || '') : (card.text || card.front)}
                                    onCommit={(val) => updateEditValue('text', val)}
                                    images={isEditing ? (editValues.frontImages || []) : (card.frontImages || [])}
                                    onAddImage={(img) => addImage('front', img)}
                                    onRemoveImage={(idx) => removeImage('front', idx)}
                                    onViewImage={setViewImage}
                                    placeholder="The {{c1::answer}} is hidden."
                                    isCloze={true}
                                    isEditing={isEditing}
                                    onSave={() => saveEditing({ stopPropagation: () => { } })}
                                />
                            </div>
                            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-dashed">
                                <ContentArea
                                    label="Extra Info"
                                    value={isEditing ? (editValues.back || '') : card.back}
                                    onCommit={(val) => updateEditValue('back', val)}
                                    images={isEditing ? (editValues.backImages || []) : (card.backImages || [])}
                                    onAddImage={(img) => addImage('back', img)}
                                    onRemoveImage={(idx) => removeImage('back', idx)}
                                    onViewImage={setViewImage}
                                    placeholder="Optional context or explanation..."
                                    isEditing={isEditing}
                                    onSave={() => saveEditing({ stopPropagation: () => { } })}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-white dark:bg-transparent">
                                <ContentArea
                                    label="Front"
                                    value={isEditing ? (editValues.front || '') : card.front}
                                    onCommit={(val) => updateEditValue('front', val)}
                                    images={isEditing ? (editValues.frontImages || []) : (card.frontImages || [])}
                                    onAddImage={(img) => addImage('front', img)}
                                    onRemoveImage={(idx) => removeImage('front', idx)}
                                    onViewImage={setViewImage}
                                    placeholder="Question..."
                                    isEditing={isEditing}
                                    onSave={() => saveEditing({ stopPropagation: () => { } })}
                                />
                            </div>
                            <div className="p-3 bg-slate-50/50 dark:bg-slate-800/50">
                                <ContentArea
                                    label="Back"
                                    value={isEditing ? (editValues.back || '') : card.back}
                                    onCommit={(val) => updateEditValue('back', val)}
                                    images={isEditing ? (editValues.backImages || []) : (card.backImages || [])}
                                    onAddImage={(img) => addImage('back', img)}
                                    onRemoveImage={(idx) => removeImage('back', idx)}
                                    onViewImage={setViewImage}
                                    placeholder="Answer..."
                                    isEditing={isEditing}
                                    onSave={() => saveEditing({ stopPropagation: () => { } })}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer / Tags */}
                {card.tags && card.tags.length > 0 && !isEditing && (
                    <div className="px-3 py-2 border-t bg-muted/10 flex flex-wrap gap-1">
                        {card.tags.map((tag, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded border">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Persistent Edit Footer */}
                {isEditing && (
                    <div className="flex flex-col gap-2 px-3 py-2 bg-muted/30 border-t animate-in slide-in-from-top-1">

                        {/* Tags Input */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Tags:</span>
                            <TagInput
                                tags={editValues.tags || []}
                                onChange={(newTags) => updateEditValue('tags', newTags)}
                                onSave={() => saveEditing({ stopPropagation: () => { } })} // Safe mock event
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateEditValue('type', editValues.type === 'basic' ? 'cloze' : 'basic');
                                }}
                                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary"
                            >
                                <Type size={12} />
                                {editValues.type === 'basic' ? 'To Cloze' : 'To Basic'}
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={cancelEditing}
                                    className="text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 text-muted-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEditing}
                                    className="text-xs flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                                >
                                    <Check size={12} />
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Full Screen Modal */}
            {viewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setViewImage(null)}
                >
                    <img
                        src={viewImage}
                        className="max-w-full max-h-full rounded shadow-2xl"
                        alt="Full View"
                    />
                    <button className="absolute top-4 right-4 text-white hover:text-red-400 bg-black/50 rounded-full p-2">
                        <X size={24} />
                    </button>
                </div>
            )}
        </>
    );
}

export function SortableFlashcard({ card, ...props }) {
    // We need to know if THIS card is editing to disable drag listeners
    // Ideally we shouldn't couple this too tightly, but accessing the store here is the most direct way
    const { editingCardId } = useAppStore();
    const isEditing = editingCardId === card.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: card.id, disabled: isEditing }); // Native disabled prop usually works if supported, else we conditionalize listeners

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...(!isEditing ? listeners : {})} // Only attach listeners if NOT editing
        >
            <Flashcard card={card} {...props} />
        </div>
    );
}
