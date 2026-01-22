import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';
import { GripVertical, GripHorizontal } from 'lucide-react';

export function SplitView({ left, right, className, ratio = "2:3" }) {
  // Parse ratio (e.g. "2:3" -> 40%)
  const getInitialSize = () => {
    if (!ratio) return 40;
    const [l, r] = ratio.split(':').map(Number);
    if (!l || !r) return 40;
    return (l / (l + r)) * 100;
  };

  const [panelSize, setPanelSize] = useState(getInitialSize());
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Update size if ratio changes
  useEffect(() => {
    setPanelSize(getInitialSize());
  }, [ratio]);

  const startDragging = useCallback((e) => {
    // Only prevent default on mouse events to allow scrolling? 
    // Actually for drag handle we usually want to prevent default.
    // e.preventDefault(); 
    setIsDragging(true);
  }, []);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrag = useCallback((e) => {
    if (isDragging && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      // Use aspect ratio to determine split direction:
      // If width > height, we are in landscape/desktop mode (horizontal split)
      // If height > width, we are in portrait/mobile mode (vertical split)
      const isHorizontal = containerRect.width > containerRect.height;

      let newSize;
      if (!isHorizontal) {
        // Vertical split (portrait): Calculate height percentage
        const relativeY = e.clientY - containerRect.top;
        newSize = (relativeY / containerRect.height) * 100;
      } else {
        // Horizontal split (landscape): Calculate width percentage
        const relativeX = e.clientX - containerRect.left;
        newSize = (relativeX / containerRect.width) * 100;
      }

      // Clamp between 20% and 80%
      if (newSize > 20 && newSize < 80) {
        setPanelSize(newSize);
      }
    }
  }, [isDragging]);

  const onDragTouch = useCallback((e) => {
    if (isDragging && containerRef.current) {
      e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      const containerRect = containerRef.current.getBoundingClientRect();
      const isHorizontal = containerRect.width > containerRect.height;

      let newSize;
      if (!isHorizontal) {
        const relativeY = touch.clientY - containerRect.top;
        newSize = (relativeY / containerRect.height) * 100;
      } else {
        const relativeX = touch.clientX - containerRect.left;
        newSize = (relativeX / containerRect.width) * 100;
      }

      if (newSize > 20 && newSize < 80) {
        setPanelSize(newSize);
      }
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('touchmove', onDragTouch, { passive: false });
      window.addEventListener('touchend', stopDragging);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onDragTouch);
      window.removeEventListener('touchend', stopDragging);
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onDragTouch);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging, onDrag, onDragTouch, stopDragging]);

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col landscape:flex-row h-full w-full", className)}
      style={{
        '--split-size': `${panelSize}%`
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden transition-[height,width] duration-75 ease-out",
          "w-full h-[var(--split-size)] landscape:h-full landscape:w-[var(--split-size)]"
        )}
      >
        <div className="h-full w-full">
          {left}
        </div>
      </div>

      {/* Drag Handle */}
      <div
        onMouseDown={startDragging}
        onTouchStart={startDragging}
        className={cn(
          "flex items-center justify-center z-50 transition-colors shrink-0 bg-border hover:bg-primary/50 touch-none",
          "h-3 w-full cursor-row-resize landscape:w-3 landscape:h-full landscape:cursor-col-resize",
          isDragging && "bg-primary"
        )}
      >
        <GripVertical size={12} className="hidden landscape:block text-muted-foreground" />
        <GripHorizontal size={12} className="landscape:hidden text-muted-foreground" />
      </div>

      <div
        className="flex-1 relative overflow-hidden bg-secondary/30"
      >
        <div className="h-full w-full">
          {right}
        </div>
      </div>

      {/* Overlay to prevent iframe/pdf capturing events while dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-row-resize landscape:cursor-col-resize" />
      )}
    </div>
  );
}
