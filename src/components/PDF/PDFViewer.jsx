import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, X, MousePointer2, Pencil, Highlighter, Trash2,
    FileUp, Loader2, Wand2, Bookmark, Camera, FileText
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnnotationLayer } from './AnnotationLayer';
import { cn } from '../../lib/utils';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
).toString();

const FALLBACK_WIDTH = 600; // Approximate A4 width at 100%

export function PDFViewer() {
    const { pdfFile, setPdfFile, isProcessing, generateCardsFromPage, setActivePage, activePage, setCurrentPage, currentPage, annotations, addAnnotation, userSettings } = useAppStore();
    const snapshotScaleAuto = userSettings.snapshotScaleAuto || 3.0;
    const snapshotScaleManual = userSettings.snapshotScaleManual || 3.0;
    const [numPages, setNumPages] = useState(null);
    const [selectedPage, setSelectedPage] = useState(null);
    const [scale, setScale] = useState(1.0);
    const [outline, setOutline] = useState(null);
    const [isOutlineOpen, setIsOutlineOpen] = useState(false);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [tool, setTool] = useState('cursor'); // 'cursor' | 'draw' | 'snapshot'

    // Store UNSCALED (base) dimensions for each page
    const [pageDimensions, setPageDimensions] = useState({});

    const scrollContainerRef = useRef(null);
    const observerRef = useRef(null);
    const prevScaleRef = useRef(scale);
    const scrollSnapshotRef = useRef(null);
    const isAutoScrollingRef = useRef(false);

    const onDocumentLoadSuccess = async (pdf) => {
        setPdfDocument(pdf);
        window.pdfDocument = pdf; // Expose for Snapshot listener
        setNumPages(pdf.numPages);
        const outlineData = await pdf.getOutline();
        setOutline(outlineData);
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) setPdfFile(file);
    };

    const handlePageProcess = (pageNumber) => {
        generateCardsFromPage(pageNumber);
    };

    // Store UNSCALED dimensions (react-pdf returns scaled dimensions, so divide by scale)
    const handlePageLoadSuccess = (page, pageNum, currentScale) => {
        setPageDimensions(prev => ({
            ...prev,
            [pageNum]: {
                // page.width/height are already scaled by react-pdf, so we divide to get base dimensions
                width: page.width / currentScale,
                height: page.height / currentScale
            }
        }));
    };

    // SCALE HANDLING: Anchor Page (Robust against fixed gaps)
    const handleScaleChange = (newScale) => {
        const container = scrollContainerRef.current;
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const viewportCenterY = containerRect.top + (containerRect.height / 2);

            let candidate = null;

            // Iterate all rendered pages to find the one under the crosshair
            const pages = document.querySelectorAll('.pdf-page-container');

            for (const page of pages) {
                const rect = page.getBoundingClientRect();
                // Check intersection with center line
                if (rect.top <= viewportCenterY && rect.bottom >= viewportCenterY) {
                    candidate = page;
                    break;
                }
            }

            // Fallback: If hitting a gap, find closest page
            if (!candidate && pages.length > 0) {
                let minDist = Infinity;
                for (const page of pages) {
                    const rect = page.getBoundingClientRect();
                    const dist = Math.min(Math.abs(rect.top - viewportCenterY), Math.abs(rect.bottom - viewportCenterY));
                    if (dist < minDist) {
                        minDist = dist;
                        candidate = page;
                    }
                }
            }

            if (candidate) {
                const pageNum = parseInt(candidate.getAttribute('data-page-number'));
                const rect = candidate.getBoundingClientRect();

                const offset = viewportCenterY - rect.top;
                const ratio = Math.max(0, Math.min(1, offset / rect.height));

                scrollSnapshotRef.current = {
                    pageNum: pageNum,
                    ratio: ratio
                };
            }
        }
        setScale(newScale);
    };


    // Restore scroll after scale change
    useLayoutEffect(() => {
        if (scrollSnapshotRef.current && scrollContainerRef.current && scale !== prevScaleRef.current) {
            const snapshot = scrollSnapshotRef.current;
            const container = scrollContainerRef.current;

            // We only care about pageNum strategy now
            if (snapshot.pageNum) {
                const pageEl = document.getElementById(`page_${snapshot.pageNum}`);
                if (pageEl) {
                    // Restore Center: PageTop + (PageHeight * Ratio) = ViewportCenter
                    const pageTop = pageEl.offsetTop; // Relative to container top
                    const pageHeight = pageEl.offsetHeight; // This should be the NEW scaled height

                    const targetCenterY = pageTop + (pageHeight * snapshot.ratio);
                    const targetScrollTop = targetCenterY - (container.clientHeight / 2);

                    isAutoScrollingRef.current = true;
                    container.scrollTop = targetScrollTop;

                    setTimeout(() => {
                        isAutoScrollingRef.current = false;
                    }, 100);
                }
            }
            scrollSnapshotRef.current = null;
        }
        prevScaleRef.current = scale;
    }, [scale]);

    // Ref to track if the activePage update came from rolling the PDF (internal) 
    // vs clicking the sidebar (external)
    const isInternalUpdate = useRef(false);

    // Sync Active Page from Store (e.g. clicking dividers)
    useEffect(() => {
        // If the update came from our own scroll observer, DON'T force scroll back
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        // Only scroll if we have a valid page AND the document is actually loaded (numPages set)
        if (activePage && numPages) {
            // We verify the element exists before trying to scroll
            const pageEl = document.getElementById(`page_${activePage}`);
            if (pageEl) {
                scrollToPage(activePage);
            }
        }
    }, [activePage, numPages]);

    const handleOutlineClick = async (item) => {
        if (!pdfDocument || !item.dest) return;
        try {
            const dest = typeof item.dest === 'string' ? await pdfDocument.getDestination(item.dest) : item.dest;
            if (dest) {
                const pageIndex = await pdfDocument.getPageIndex(dest[0]);
                const pageNum = pageIndex + 1;
                scrollToPage(pageNum);
                setCurrentPage(pageNum);
                setActivePage(pageNum);
            }
        } catch (e) {
            console.error("Navigation failed", e);
        }
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!numPages) return;

            // Ignore if focus is in an input or textarea
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

            // Check if we are in the "draw" tool or similar? Maybe not needed as long as we aren't typing text.

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const newPage = Math.max(1, (activePageRef.current || currentPage || 1) - 1);
                scrollToPage(newPage);
                setActivePage(newPage);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const newPage = Math.min(numPages, (activePageRef.current || currentPage || 1) + 1);
                scrollToPage(newPage);
                setActivePage(newPage);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [numPages, currentPage]); // Dependency on numPages and currentPage/activePageRef logic handled via ref in handler if possible, but simple re-bind is fine.

    // Snapshot Listener for LLM Generation
    const { snapshotRequest, generateCardsFromImage } = useAppStore();

    useEffect(() => {
        if (!snapshotRequest) return;

        const { page, id } = snapshotRequest;
        const pageContainer = document.querySelector(`.pdf-page-container[data-page-number="${page}"]`);

        if (!pageContainer || !window.pdfDocument) {
            console.error("Snapshot failed: Page not found in DOM or PDF not ready");
            useAppStore.getState().setProcessing(false);
            return;
        }

        const capture = async () => {
            try {
                // Wait a frame to ensure render
                await new Promise(r => requestAnimationFrame(r));

                // 3. Offscreen High-Res Render Strategy
                if (!window.pdfDocument) throw new Error("PDF Document not loaded");
                const pdfPage = await window.pdfDocument.getPage(page);

                // Target ~2400px width (2k+ Resolution)
                const targetScale = snapshotScaleAuto;
                const viewport = pdfPage.getViewport({ scale: targetScale });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                // Render PDF to Canvas
                await pdfPage.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;

                // Render Annotations (Overlay)
                const pageAnnotations = useAppStore.getState().annotations[page] || [];
                if (pageAnnotations.length > 0) {
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    pageAnnotations.forEach(ann => {
                        if (ann.type === 'path' && ann.points.length > 0) {
                            ctx.beginPath();
                            ctx.strokeStyle = ann.color;
                            ctx.lineWidth = 15 * targetScale; // Scale line width
                            ctx.globalAlpha = ann.opacity;

                            // Points are stored in "original PDF point space" (unscaled)
                            // We just multiply by targetScale
                            ctx.moveTo(ann.points[0].x * targetScale, ann.points[0].y * targetScale);
                            ann.points.forEach(p => {
                                ctx.lineTo(p.x * targetScale, p.y * targetScale);
                            });
                            ctx.stroke();
                            ctx.globalAlpha = 1.0;
                        }
                    });
                }

                // Export High Res
                const base64 = canvas.toDataURL('image/jpeg', 0.95); // High quality JPEG

                // 4. Extract Text Layer
                let textContent = "";
                try {
                    const textContentObj = await pdfPage.getTextContent();
                    textContent = textContentObj.items.map(item => item.str).join(' ');
                } catch (err) {
                    console.warn("Text extraction failed:", err);
                }

                generateCardsFromImage(base64, page, textContent);

            } catch (e) {
                console.error("Capture failed", e);
                useAppStore.getState().setProcessing(false);
            }
        };

        capture();

    }, [snapshotRequest]);

    // Sync activePage to a ref to avoid restarting the observer on every state change
    const activePageRef = useRef(activePage);
    useEffect(() => {
        activePageRef.current = activePage;
    }, [activePage]);

    // Intersection observer for tracking current page
    useEffect(() => {
        if (!numPages || !scrollContainerRef.current) return;
        const options = { root: scrollContainerRef.current, rootMargin: '-45% 0px -45% 0px', threshold: 0.01 };
        const handleIntersect = (entries) => {
            if (isAutoScrollingRef.current) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const pageNum = parseInt(entry.target.getAttribute('data-page-number'));
                    if (pageNum) {
                        setCurrentPage(pageNum);

                        // Update store, but mark as internal so we don't auto-scroll back to center
                        // Use ref to check current state without closure staleness or dep-array re-runs
                        if (activePageRef.current !== pageNum) {
                            isInternalUpdate.current = true;
                            setActivePage(pageNum);
                        }
                    }
                }
            });
        };
        observerRef.current = new IntersectionObserver(handleIntersect, options);
        // Need to wait a tick for elements to be in DOM
        setTimeout(() => {
            document.querySelectorAll('.pdf-page-container').forEach(el => observerRef.current?.observe(el));
        }, 100);
        return () => observerRef.current?.disconnect();
    }, [numPages, pdfFile]); // REMOVED activePage from dependencies to prevent loop

    const scrollToPage = (pageNum, behavior = 'smooth') => {
        setSelectedPage(pageNum);
        const element = document.getElementById(`page_${pageNum}`);
        if (element) {
            element.scrollIntoView({ behavior, block: 'center' });
        }
    };

    if (!pdfFile) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-secondary/20">
                <label className="cursor-pointer group flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform border border-border">
                        <FileUp className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 tracking-tight">Upload PDF</h3>
                    <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
                </label>
            </div>
        );
    }

    const RENDER_WINDOW = 3;
    const renderRangeStart = Math.max(1, (currentPage || 1) - RENDER_WINDOW);
    const renderRangeEnd = Math.min(numPages || 1, (currentPage || 1) + RENDER_WINDOW);

    return (
        <div className="h-full flex flex-col bg-slate-100 dark:bg-black border-r dark:border-slate-800 relative group" onMouseEnter={() => currentPage && setActivePage(currentPage)}>
            {/* Header */}
            <div className="h-12 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between gap-2 shadow-sm z-30 relative transition-colors">
                <div className="flex items-center gap-1">
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-md mr-2">
                        <FileText size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[150px] truncate" title={pdfFile?.name}>
                        {pdfFile ? pdfFile.name : 'No PDF Loaded'}
                    </span>
                    {/* Close PDF Button */}
                    <button
                        onClick={() => setPdfFile(null)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors ml-2"
                        title="Close PDF"
                    >
                        <X size={16} />
                    </button>
                    <div className="w-px h-6 bg-border mx-2"></div>
                    <button onClick={() => setIsOutlineOpen(!isOutlineOpen)} className={cn("p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors", isOutlineOpen && "text-primary bg-primary/10")} title="Table of Contents" disabled={!outline}><Bookmark size={18} /></button>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={() => handleScaleChange(Math.max(0.5, scale - 0.1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ZoomOut size={18} /></button>
                    <span className="text-xs font-mono w-12 text-center text-slate-600 dark:text-slate-400">{(scale * 100).toFixed(0)}%</span>
                    <button onClick={() => handleScaleChange(Math.min(2.0, scale + 0.1))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ZoomIn size={18} /></button>
                    <div className="w-px h-6 bg-border mx-1"></div>
                    <button
                        onClick={() => setTool(tool === 'draw' ? 'cursor' : 'draw')}
                        className={cn("p-1.5 rounded transition-all", tool === 'draw' ? "bg-yellow-100 text-yellow-600 ring-1 ring-yellow-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground")}
                        title="Highlighter"
                    >
                        <Highlighter size={18} />
                    </button>
                    <button
                        onClick={() => setTool(tool === 'snapshot' ? 'cursor' : 'snapshot')}
                        className={cn("p-1.5 rounded transition-all", tool === 'snapshot' ? "bg-blue-100 text-blue-600 ring-1 ring-blue-400" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground")}
                        title="Snapshot Tool (Drag to copy)"
                    >
                        <Camera size={18} />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Outline Sidebar */}
                {isOutlineOpen && outline && (
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur border-r z-40 shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-left duration-200">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm">Contents</h3><button onClick={() => setIsOutlineOpen(false)} className="text-xs text-muted-foreground">Close</button></div>
                        <div className="flex flex-col gap-1">{outline.map((item, i) => (<button key={i} onClick={() => handleOutlineClick(item)} className="text-left text-sm text-foreground/80 hover:text-primary hover:bg-primary/5 px-2 py-1.5 rounded truncate transition-colors">{item.title}</button>))}</div>
                    </div>
                )}

                {/* PDF Content */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-slate-100/50">
                    <div
                        className="flex flex-col items-center gap-6 transition-[padding] duration-300"
                        style={{
                            paddingTop: (pageDimensions?.[1]?.height)
                                ? `max(0px, calc(45vh - ${(pageDimensions[1].height * (scale || 1)) / 2}px))`
                                : '2rem',
                            paddingBottom: (pageDimensions?.[numPages]?.height)
                                ? `max(0px, calc(45vh - ${(pageDimensions[numPages].height * (scale || 1)) / 2}px))`
                                : '2rem',
                            minHeight: 'calc(100vh - 3rem)' // Ensure container fills height so flex centering would work if valid
                        }}
                    >
                        <Document
                            file={pdfFile}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="contents" // Use contents to let children participate in the flex container above
                            loading={<div className="py-20"><Loader2 className="animate-spin text-primary" /></div>}
                        >
                            {Array.from(new Array(numPages), (el, index) => {
                                const pageNum = index + 1;
                                const isVisible = pageNum >= renderRangeStart && pageNum <= renderRangeEnd;
                                const dim = pageDimensions[pageNum]; // These are now UNSCALED dimensions

                                // Calculate scaled dimensions for display
                                const scaledWidth = dim ? dim.width * scale : FALLBACK_WIDTH * scale;
                                const scaledHeight = dim ? dim.height * scale : FALLBACK_WIDTH * 1.414 * scale;

                                return (
                                    <div
                                        id={`page_${pageNum}`}
                                        key={`page_${pageNum}`}
                                        data-page-number={pageNum}
                                        className={cn("pdf-page-container relative group origin-top bg-white shadow-sm")}
                                        // CRITICAL FIX: Always enforce explicit dimensions.
                                        // Never use 'auto' or layout will collapse during async loading, destroying scroll position.
                                        style={{
                                            width: scaledWidth,
                                            height: scaledHeight,
                                            // Optional: min-content to avoid cutting off if somehow calculation is slightly off
                                            minHeight: scaledHeight
                                        }}
                                        onClick={() => tool === 'cursor' && scrollToPage(pageNum)}
                                        onDoubleClick={() => tool === 'cursor' && handlePageProcess(pageNum)}
                                    >
                                        {isVisible ? (
                                            <>
                                                <Page
                                                    pageNumber={pageNum}
                                                    scale={scale}
                                                    // REMOVED width prop to allow scale to govern dimensions naturally
                                                    onLoadSuccess={(page) => handlePageLoadSuccess(page, pageNum, scale)}
                                                    renderTextLayer={tool === 'cursor'}
                                                    renderAnnotationLayer={tool === 'cursor'}
                                                />
                                                {dim && (
                                                    <AnnotationLayer
                                                        pageNumber={pageNum}
                                                        scale={scale}
                                                        snapshotScale={snapshotScaleManual} // Pass setting
                                                        width={scaledWidth}   // Scaled canvas size
                                                        height={scaledHeight} // Scaled canvas size
                                                        originalWidth={dim.width}   // Unscaled for coordinate mapping
                                                        originalHeight={dim.height} // Unscaled for coordinate mapping
                                                        annotations={annotations[pageNum]}
                                                        onAddAnnotation={addAnnotation}
                                                        tool={tool}
                                                        onSnapshotComplete={() => setTool('cursor')}
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-muted-foreground/20 text-4xl font-bold">{pageNum}</div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10">{pageNum}</div>
                                    </div>
                                );
                            })}
                        </Document>
                    </div>
                </div>
            </div>

            {/* FAB */}
            {
                (selectedPage || isProcessing) && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
                        <button
                            disabled={isProcessing || !pdfDocument}
                            onClick={() => selectedPage && handlePageProcess(selectedPage)}
                            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl font-semibold hover:scale-105 active:scale-95 border border-white/20"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {isProcessing ? `Processing...` : `Process Page ${selectedPage}`}
                        </button>
                    </div>
                )
            }
        </div >
    );
}
