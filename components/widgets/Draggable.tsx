'use client';

import { useEffect, useRef, useState } from 'react';
import WidgetChrome from './WidgetChrome';

interface DraggableProps {
  id: string;
  initialX: number;
  initialY: number;
  bounds: { width: number; height: number };
  zIndex?: number;
  onWidgetFocus?: (id: string) => void;
  onDragCancel?: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  children: React.ReactNode;
}

export default function Draggable({
  id,
  initialX,
  initialY,
  bounds,
  zIndex = 50,
  onWidgetFocus,
  onDragCancel,
  onDragEnd,
  children,
}: DraggableProps) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const positionRef = useRef(position);

  useEffect(() => {
    setPosition({ x: initialX, y: initialY });
    positionRef.current = { x: initialX, y: initialY };
  }, [initialX, initialY]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    // Find the container element (parent with fixed positioning)
    if (ref.current) {
      let parent = ref.current.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.position === 'fixed' || style.position === 'absolute') {
          containerRef.current = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, []);

  const getContainerOffset = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    return { x: 0, y: 0 };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (ref.current && bounds.width > 0 && bounds.height > 0) {
        const containerOffset = getContainerOffset();
        // Convert viewport coordinates to container-relative coordinates
        const newX = e.clientX - containerOffset.x - dragOffset.x;
        const newY = e.clientY - containerOffset.y - dragOffset.y;

        // Constrain to bounds
        const widgetWidth = ref.current.offsetWidth;
        const widgetHeight = ref.current.offsetHeight;
        const constrainedX = Math.max(0, Math.min(newX, bounds.width - widgetWidth));
        const constrainedY = Math.max(0, Math.min(newY, bounds.height - widgetHeight));

        setPosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      setIsDragging(false);
      if (ref.current) {
        ref.current.releasePointerCapture(e.pointerId);
      }
      // Use ref to get current position to avoid stale closure
      onDragEnd(id, positionRef.current.x, positionRef.current.y);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, dragOffset, bounds, id, onDragEnd, position]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Bring widget to top immediately on click
    onWidgetFocus?.(id);

    // Don't start dragging if clicking on a link, image, or button
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'A' ||
      target.tagName === 'IMG' ||
      target.closest('a') ||
      target.closest('img')
    ) {
      return;
    }

    if (ref.current) {
      const containerOffset = getContainerOffset();
      // Calculate offset relative to container, not viewport
      // This is the distance from the element's top-left to where the user clicked
      // Use positionRef to ensure we have the latest position
      setDragOffset({
        x: e.clientX - containerOffset.x - positionRef.current.x,
        y: e.clientY - containerOffset.y - positionRef.current.y,
      });
      setIsDragging(true);
      ref.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    onDragCancel?.(id);
  };

  return (
    <div
      ref={ref}
      className="absolute pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        zIndex: zIndex,
      }}
      onPointerDown={handlePointerDown}
      onPointerCancel={handlePointerCancel}
    >
      <WidgetChrome isDragging={isDragging}>{children}</WidgetChrome>
    </div>
  );
}

