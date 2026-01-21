import React, { useEffect, useRef } from 'react';
import { exportProjectZip, importProjectZip } from '../../utils/projectExport';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableFlashcard } from './Flashcard';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { BrainCircuit, FilePlus, FileType, Layers, Loader2, Plus, Save, Trash2, Hash, Upload, Download } from 'lucide-react';

export function CardGraph() {
    const {
        cards, isProcessing, pdfFile, updateCard, removeCard, createManualCard,
        activePage, currentPage, setActivePage, generateCardsFromPage, setCurrentPage,
        selectedCardIds, clearSelection, reorderCards, toggleCardSelection,
        importCards, annotations, stats // Need annotations/stats for export
    } = useAppStore();

    // sensors for dnd
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), // Require 8px drag to start
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleBulkDelete = () => {
        if (confirm(`Delete ${selectedCardIds.length} cards?`)) {
            selectedCardIds.forEach(id => removeCard(id));
            clearSelection();
        }
    };

    const handleExport = async () => {
        if (cards.length === 0) return;
        const fullState = { cards, annotations, stats, currentPage, activePage };
        await exportProjectZip(cards, pdfFile?.name, fullState);
    };

    const fileInputRef = useRef(null);
    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const importedState = await importProjectZip(file);
            if (importedState && importedState.cards) {
                // Merge logic via store action
                importCards(importedState.cards);
                alert(`Imported ${importedState.cards.length} cards successfully.`);
            }
        } catch (error) {
            console.error("Import failed:", error);
            alert("Failed to import project: " + error.message);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
        }
    };

    const scrollRef = useRef(null);
    const isAutoScrolling = useRef(false);
    const startScrollPos = useRef(null); // Reference point for manual scroll detection

    // Group cards by page
    const groupedCards = cards.reduce((acc, card) => {
        const page = card.pageNumber || 'Unsorted';
        if (!acc[page]) acc[page] = [];
        acc[page].push(card);
        return acc;
    }, {});

    // Sort pages numerically
    const sortedPages = Object.keys(groupedCards).sort((a, b) => {
        if (a === 'Unsorted') return -1;
        if (b === 'Unsorted') return 1;
        return Number(a) - Number(b);
    });

    // Scroll to Active Page when it changes (Focus Mode)
    useEffect(() => {
        if (activePage && scrollRef.current) {
            const element = document.getElementById(`card-group-${activePage}`);
            if (element) {
                isAutoScrolling.current = true;
                startScrollPos.current = null; // Reset manual scroll tracker

                // Intelligent Scroll Alignment
                const fitsInView = element.offsetHeight < (window.innerHeight - 150);
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: fitsInView ? 'center' : 'start'
                });

                setTimeout(() => {
                    isAutoScrolling.current = false;
                    // Set the reference point to where we landed after auto-scroll
                    if (scrollRef.current) startScrollPos.current = scrollRef.current.scrollTop;
                }, 800);
            }
        }
    }, [activePage]);

    // Re-center when generation completes
    const prevProcessing = useRef(isProcessing);
    useEffect(() => {
        if (prevProcessing.current && !isProcessing && activePage) {
            const element = document.getElementById(`card-group-${activePage}`);
            if (element) {
                isAutoScrolling.current = true;
                startScrollPos.current = null;

                const fitsInView = element.offsetHeight < (window.innerHeight - 150);
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: fitsInView ? 'center' : 'start'
                });
                setTimeout(() => {
                    isAutoScrolling.current = false;
                    if (scrollRef.current) startScrollPos.current = scrollRef.current.scrollTop;
                }, 800);
            }
        }
        prevProcessing.current = isProcessing;
    }, [isProcessing, activePage]);

    // DND Handlers
    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId !== overId) {
            const activeIndex = cards.findIndex(c => c.id === activeId);
            const overIndex = cards.findIndex(c => c.id === overId);

            if (activeIndex !== -1 && overIndex !== -1) {
                const activeCard = cards[activeIndex];
                const overCard = cards[overIndex];

                // Update page number if moving between groups
                if (activeCard.pageNumber !== overCard.pageNumber) {
                    updateCard(activeId, { pageNumber: overCard.pageNumber });
                }

                // Reorder in store immediately for visual feedback
                reorderCards(activeIndex, overIndex);
            }
        }
    };

    const handleDragEnd = (event) => {
        // No-op (handled in DragOver)
    };

    // Scroll Logic
    const handleScroll = (e) => {
        // If we shouldn't track (auto-scrolling or no active page), just update the ref to keep it fresh so we don't jump
        if (isAutoScrolling.current || !activePage) {
            return;
        }

        const currentScroll = e.target.scrollTop;

        // Initialize reference point if missing (e.g., user started scrolling without auto-scroll trigger)
        if (startScrollPos.current === null) {
            startScrollPos.current = currentScroll;
            return;
        }

        const diff = Math.abs(currentScroll - startScrollPos.current);

        // Threshold to exit focus mode (150px)
        if (diff > 150) {
            console.log("Exiting focus mode via scroll");
            setActivePage(null);
            startScrollPos.current = null;
        }
    };

    const handleManualCreate = (type = 'basic') => {
        const targetPage = activePage || currentPage || 1;
        createManualCard(targetPage, type);
        setTimeout(() => {
            const element = document.getElementById(`card-group-${targetPage}`);
            if (element && !isAutoScrolling.current) {
                isAutoScrolling.current = true;
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => isAutoScrolling.current = false, 800);
            }
        }, 100);
    };

    const handleGenerateMore = () => {
        const targetPage = activePage || currentPage || 1;
        if (targetPage && !isProcessing) {
            generateCardsFromPage(targetPage);
        }
    };

    const handleDividerClick = (page) => {
        if (page !== 'Unsorted') {
            const pageNum = Number(page);
            setCurrentPage(pageNum);
            setActivePage(pageNum);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".zip"
                className="hidden"
            />
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                {/* Cards Scroll Area */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
                >
                    {/* Large top padding to allow first group to center */}
                    <div className="h-[40vh]"></div>

                    {isProcessing && (
                        <div className="sticky top-0 z-50 w-full bg-primary/10 backdrop-blur border-b border-primary/20 p-2 flex items-center justify-center gap-2 text-primary animate-in slide-in-from-top">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Processing...</span>
                        </div>
                    )}

                    {cards.length === 0 && !isProcessing && (
                        <div className="flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
                            <Layers className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No cards yet</p>
                            <p className="text-sm">Select a PDF page to generate flashcards</p>
                        </div>
                    )}

                    <SortableContext
                        items={cards.map(c => c.id)}
                        strategy={rectSortingStrategy}
                    >
                        {sortedPages.map(page => (
                            <div
                                key={page}
                                id={`card-group-${page}`}
                                className={cn(
                                    "transition-all duration-500 w-full",
                                    activePage && String(activePage) !== String(page) ? "opacity-30 blur-[2px] grayscale" : "opacity-100 scale-100"
                                )}
                            >
                                {/* Group Header */}
                                <div
                                    className="flex items-center gap-4 mb-4 group cursor-pointer"
                                    onClick={() => handleDividerClick(page)}
                                >
                                    <div className="h-px flex-1 bg-border group-hover:bg-primary/50 transition-colors"></div>
                                    <span className={cn(
                                        "text-xs font-bold text-muted-foreground uppercase tracking-wider bg-secondary/50 px-3 py-1 rounded-full transition-colors",
                                        "group-hover:bg-primary group-hover:text-primary-foreground"
                                    )}>
                                        {page === 'Unsorted' ? 'General' : `Page ${page}`}
                                    </span>
                                    <div className="h-px flex-1 bg-border group-hover:bg-primary/50 transition-colors"></div>
                                </div>

                                {/* Cards Grid - Adaptive Layout */}
                                <div className="flex flex-wrap gap-4 justify-center items-start">
                                    {groupedCards[page].map(card => (
                                        <div key={card.id} className="w-full max-w-[320px] flex-grow-0 flex-shrink-0">
                                            <SortableFlashcard
                                                card={card}
                                                onUpdate={updateCard}
                                                onDelete={removeCard}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </SortableContext>

                    {/* Large bottom padding to allow last group to center */}
                    <div className="h-[40vh]"></div>
                </div>
            </DndContext>

            {/* Bottom Action Bar */}
            {selectedCardIds.length > 0 ? (
                <div className="h-20 border-t bg-blue-50/90 dark:bg-blue-900/50 backdrop-blur-md flex items-center justify-between px-8 sticky bottom-0 z-40 animate-in slide-in-from-bottom">
                    <span className="font-bold text-blue-700 dark:text-blue-100">{selectedCardIds.length} Selected</span>
                    <div className="flex gap-2">
                        <button onClick={clearSelection} className="px-4 py-2 text-sm font-medium hover:bg-black/5 rounded">Cancel</button>
                        <button
                            onClick={() => {
                                const tagStr = prompt("Enter tags to add (comma separated):");
                                if (tagStr) {
                                    const tags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
                                    if (tags.length > 0) {
                                        useAppStore.getState().addTagsToCards(selectedCardIds, tags);
                                        clearSelection();
                                    }
                                }
                            }}
                            className="bg-indigo-600 text-white px-5 py-2 rounded-full shadow hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Hash size={16} />
                            Add Tags
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="bg-destructive text-white px-6 py-2 rounded-full shadow hover:bg-destructive/90 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            Delete Selected
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-20 border-t bg-background/80 backdrop-blur-md flex items-center justify-center gap-2 md:gap-4 px-2 md:px-8 sticky bottom-0 z-40">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleManualCreate('basic')}
                            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 md:px-4 md:py-2.5 rounded-l-full font-medium hover:bg-secondary/80 transition-colors shadow-sm active:scale-95 text-xs md:text-sm border-r border-border"
                            title="Add a Basic card (Front/Back)"
                        >
                            <FilePlus size={14} className="md:w-4 md:h-4" />
                            Basic
                        </button>
                        <button
                            onClick={() => handleManualCreate('cloze')}
                            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 md:px-4 md:py-2.5 rounded-r-full font-medium hover:bg-secondary/80 transition-colors shadow-sm active:scale-95 text-xs md:text-sm"
                            title="Add a Cloze card (Fill in the blank)"
                        >
                            <FileType size={14} className="md:w-4 md:h-4" />
                            Cloze
                        </button>
                    </div>

                    <div className="h-6 md:h-8 w-px bg-border mx-1 md:mx-2"></div>

                    <button
                        onClick={handleGenerateMore}
                        disabled={(!activePage && !currentPage) || !(groupedCards[activePage || currentPage]?.length > 0)}
                        className="flex items-center gap-2 bg-[var(--primary-soft)] text-primary px-3 py-2 md:px-5 md:py-2.5 rounded-full font-medium hover:opacity-90 transition-all shadow-md active:scale-95 text-xs md:text-sm mr-auto disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title={!(groupedCards[activePage || currentPage]?.length > 0) ? "No cards on this page yet" : "Ask AI to generate more cards from this page"}
                    >
                        <BrainCircuit size={14} className="md:w-4 md:h-4" />
                        Generate More
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleImportClick}
                            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-2 md:px-4 md:py-2.5 rounded-l-full font-medium hover:bg-secondary/80 transition-colors shadow-sm active:scale-95 text-xs md:text-sm border-r border-border"
                            title="Import project from ZIP"
                        >
                            <Upload size={14} className="md:w-4 md:h-4" />
                            <span className="hidden md:inline">Import</span>
                        </button>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 md:px-6 md:py-2.5 rounded-r-full font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 active:scale-95 text-xs md:text-sm"
                        >
                            <Download size={14} className="md:w-4 md:h-4" />
                            <span className="hidden md:inline">Export</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
