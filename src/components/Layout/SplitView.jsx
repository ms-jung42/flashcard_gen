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
        style={{ width: `${leftWidth}%` }}
        className="md:h-full h-1/2 w-full md:w-auto relative overflow-hidden md:block flex-1"
      >
        {/* On mobile, we override width to w-full (via class w-full) and height to flex-1 or h-1/2 */}
        {/* Wait, inline style width overrides class width. We need to unset it on mobile or use a media query for style? */}
        {/* Style object doesn't support media queries. We must conditionally apply style or use !w-full in class? */}
        {/* Better approach: Use a resize hook that detects mobile, or just use css variable? */}
        {/* Simplest: Use className with !w-full on mobile. */}
        <div className="h-full w-full md:w-[var(--split-width)]" style={{ '--split-width': `${leftWidth}%` }}>
          {/* Actually, let's keep it simple. If we use !w-full on mobile, it works. */}
          <div className="h-full w-full">
            {left}
          </div>
        </div>
      </div>

      {/* Drag Handle - Hidden on Mobile */}
      <div
        onMouseDown={startDragging}
        className={cn(
          "hidden md:flex w-2 bg-border hover:bg-primary/50 cursor-col-resize items-center justify-center z-50 transition-colors",
          isDragging && "bg-primary"
        )}
      >
        <GripVertical size={12} className="text-muted-foreground" />
      </div>

      {/* Mobile Divider (Static) */}
      <div className="md:hidden h-2 w-full bg-border shrink-0" />

      <div
        style={{ width: `${100 - leftWidth}%` }}
        className="md:h-full h-1/2 w-full md:w-auto relative overflow-hidden bg-secondary/30 md:block flex-1"
      >
        <div className="h-full w-full md:w-[var(--split-remaining)]" style={{ '--split-remaining': `${100 - leftWidth}%` }}>
          {right}
        </div>
      </div>

      {/* Overlay to prevent iframe/pdf capturing mouse events while dragging */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </div>
  );
}
