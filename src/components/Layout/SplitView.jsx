import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { GripVertical } from 'lucide-react';

export function SplitView({ left, right, className, ratio = "2:3" }) {
  // Parse ratio (e.g. "2:3" -> 40%)
  const getInitialWidth = () => {
    if (!ratio) return 40;
    const [l, r] = ratio.split(':').map(Number);
    if (!l || !r) return 40;
    return (l / (l + r)) * 100;
  };

  const [leftWidth, setLeftWidth] = useState(getInitialWidth());
  const [isDragging, setIsDragging] = useState(false);

  // Update width if ratio changes (e.g. via Settings layout flip)
  useEffect(() => {
    setLeftWidth(getInitialWidth());
  }, [ratio]);

  const startDragging = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrag = useCallback((e) => {
    if (isDragging) {
      const windowWidth = window.innerWidth;
      const newLeftWidth = (e.clientX / windowWidth) * 100;
      // Clamp between 20% and 80%
      if (newLeftWidth > 20 && newLeftWidth < 80) {
        setLeftWidth(newLeftWidth);
      }
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDragging);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, [isDragging, onDrag, stopDragging]);

  return (
    <div className={cn("flex flex-col md:flex-row h-full w-full", className)}>
      <div
        className="md:h-full h-1/2 w-full md:w-[var(--split-width)] relative overflow-hidden flex-1 md:flex-none"
        style={{ '--split-width': `${leftWidth}%` }}
      >
        {/* Inner content wrapper */}
        <div className="h-full w-full">
          {left}
        </div>
      </div>

      {/* Drag Handle - Hidden on Mobile */}
      <div
        onMouseDown={startDragging}
        className={cn(
          "hidden md:flex w-2 bg-border hover:bg-primary/50 cursor-col-resize items-center justify-center z-50 transition-colors shrink-0",
          isDragging && "bg-primary"
        )}
      >
        <GripVertical size={12} className="text-muted-foreground" />
      </div>

      {/* Mobile Divider (Static) */}
      <div className="md:hidden h-2 w-full bg-border shrink-0" />

      <div
        className="md:h-full h-1/2 w-full md:flex-1 relative overflow-hidden bg-secondary/30 flex-1"
      >
        {/* Right panel takes remaining space on desktop via flex-1 (since left is fixed width) */}
        <div className="h-full w-full">
          {right}
        </div>
      </div>

      {/* Overlay to prevent iframe/pdf capturing mouse events while dragging */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </div>
  );
}
