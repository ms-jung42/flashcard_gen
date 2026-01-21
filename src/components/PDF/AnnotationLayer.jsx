import React, { useRef, useState, useEffect } from 'react';

export function AnnotationLayer({ pageNumber, scale, snapshotScale = 3.0, width, height, originalWidth, originalHeight, annotations, onAddAnnotation, tool, onSnapshotComplete, color = '#ffeb3b', opacity = 0.4 }) {

    // ... (rest of code)


    const canvasRef = useRef(null);
    const [isPainting, setIsPainting] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);

    // Snapshot State
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionCurrent, setSelectionCurrent] = useState(null);

    // Draw Drawing Paths
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear everything

        // 1. Draw Saved Annotations
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawPath = (points, pathColor, pathOpacity) => {
            if (points.length < 1) return;
            ctx.beginPath();
            ctx.strokeStyle = pathColor;
            ctx.lineWidth = 15 * scale;
            ctx.globalAlpha = pathOpacity;

            ctx.moveTo(points[0].x * scale, points[0].y * scale);
            points.forEach(p => ctx.lineTo(p.x * scale, p.y * scale));
            ctx.stroke();
            ctx.globalAlpha = 1.0; // Reset
        };

        (annotations || []).forEach(ann => {
            drawPath(ann.points, ann.color, ann.opacity);
        });

        // 2. Draw Current Highlighter Path
        if (tool === 'draw' && currentPath.length > 0) {
            drawPath(currentPath, color, opacity);
        }

        // 3. Draw Snapshot Selection Box
        if (tool === 'snapshot' && selectionStart && selectionCurrent) {
            const x = Math.min(selectionStart.x, selectionCurrent.x);
            const y = Math.min(selectionStart.y, selectionCurrent.y);
            const w = Math.abs(selectionCurrent.x - selectionStart.x);
            const h = Math.abs(selectionCurrent.y - selectionStart.y);

            ctx.fillStyle = 'rgba(0, 120, 255, 0.2)';
            ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
            ctx.lineWidth = 2;

            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }

    }, [annotations, currentPath, scale, color, opacity, width, height, selectionStart, selectionCurrent, tool]);

    // Helpers
    const getRawCoords = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const getDocCoords = (e) => {
        const raw = getRawCoords(e);
        const modalWidth = width; // Should match canvas width
        const modalHeight = height;

        // Map raw pixels to original document space
        const xRatio = raw.x / modalWidth;
        const yRatio = raw.y / modalHeight;

        return {
            x: xRatio * originalWidth,
            y: yRatio * originalHeight
        };
    };

    const startPaint = (e) => {
        if (tool === 'cursor') return;
        setIsPainting(true);
        if (tool === 'draw') {
            setCurrentPath([getDocCoords(e)]);
        } else if (tool === 'snapshot') {
            setSelectionStart(getRawCoords(e)); // Use raw interface coords for box drawing
            setSelectionCurrent(getRawCoords(e));
        }
    };

    const paint = (e) => {
        if (!isPainting) return;
        if (tool === 'draw') {
            setCurrentPath(prev => [...prev, getDocCoords(e)]);
        } else if (tool === 'snapshot') {
            setSelectionCurrent(getRawCoords(e));
        }
    };

    const endPaint = async () => {
        if (!isPainting) return;
        setIsPainting(false);

        if (tool === 'draw' && currentPath.length > 1) {
            onAddAnnotation(pageNumber, {
                type: 'path',
                points: currentPath,
                color,
                opacity
            });
            setCurrentPath([]);
        } else if (tool === 'snapshot' && selectionStart && selectionCurrent) {
            // CAPTURE LOGIC
            await captureSnapshot();
            setSelectionStart(null);
            setSelectionCurrent(null);
        }
    };

    const captureSnapshot = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !window.pdfDocument) return;

        // Visual selection in displayed Canvas pixels
        const x = Math.min(selectionStart.x, selectionCurrent.x);
        const y = Math.min(selectionStart.y, selectionCurrent.y);
        const w = Math.abs(selectionCurrent.x - selectionStart.x);
        const h = Math.abs(selectionCurrent.y - selectionStart.y);

        if (w < 5 || h < 5) return;

        try {
            // 1. Map selection to PDF Point Space (Unscaled)
            const pdfX = (x / width) * originalWidth;
            const pdfY = (y / height) * originalHeight;
            const pdfW = (w / width) * originalWidth;
            const pdfH = (h / height) * originalHeight;

            // 2. Prepare High-Res Render
            const RENDER_SCALE = snapshotScale;
            const pdfPage = await window.pdfDocument.getPage(pageNumber);
            const viewport = pdfPage.getViewport({ scale: RENDER_SCALE });

            // 3. Create Output Canvas (Sized to selection)
            const targetCanvas = document.createElement('canvas');
            // Use integer sizing to avoid blurring
            targetCanvas.width = Math.ceil(pdfW * RENDER_SCALE);
            targetCanvas.height = Math.ceil(pdfH * RENDER_SCALE);
            const ctx = targetCanvas.getContext('2d');

            // 4. Translate: Shift the full page render so selection sits at (0,0)
            ctx.translate(-pdfX * RENDER_SCALE, -pdfY * RENDER_SCALE);

            // 5. Render PDF
            await pdfPage.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            // 6. Copy to Clipboard
            targetCanvas.toBlob(blob => {
                navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]).then(() => {
                    if (onSnapshotComplete) onSnapshotComplete();
                }).catch(err => console.error("Clipboard write failed", err));
            }, 'image/png');

        } catch (e) {
            console.error("High-Res Snapshot failed", e);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: tool !== 'cursor' ? 'auto' : 'none',
                cursor: tool === 'draw' ? 'crosshair' : (tool === 'snapshot' ? 'cell' : 'default'),
                zIndex: tool !== 'cursor' ? 50 : 1
            }}
            onMouseDown={startPaint}
            onMouseMove={paint}
            onMouseUp={endPaint}
            onMouseLeave={endPaint}
        />
    );
}
