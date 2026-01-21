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
    <div className={cn("flex h-full w-full", className)}>
      <div
        style={{ width: `${leftWidth}%` }}
        className="h-full relative overflow-hidden"
      >
        {left}
      </div>

      {/* Drag Handle */}
      <div
        onMouseDown={startDragging}
        className={cn(
          "w-2 bg-border hover:bg-primary/50 cursor-col-resize flex items-center justify-center z-50 transition-colors",
          isDragging && "bg-primary"
        )}
      >
        <GripVertical size={12} className="text-muted-foreground" />
      </div>

      <div
        style={{ width: `${100 - leftWidth}%` }}
        className="h-full relative overflow-hidden bg-secondary/30"
      >
        {right}
      </div>

      {/* Overlay to prevent iframe/pdf capturing mouse events while dragging */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </div>
  );
}
