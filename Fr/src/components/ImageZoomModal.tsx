import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

interface ImageZoomModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageZoomModal({ src, alt = 'Fotografie', onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  useEffect(() => {
    if (!src) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  const clampScale = (val: number) => Math.min(3.5, Math.max(1, Number(val.toFixed(2))));

  const handleZoomIn = () => setScale((prev) => clampScale(prev + 0.5));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = clampScale(prev - 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isDraggingRef.current = false;
      pinchStartDistRef.current = getTouchDistance(e.touches);
      pinchStartScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.preventDefault();
      const currentDist = getTouchDistance(e.touches);
      const ratio = currentDist / pinchStartDistRef.current;
      const nextScale = clampScale(pinchStartScaleRef.current * ratio);
      setScale(nextScale);
      if (nextScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDraggingRef.current && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100000] bg-[#090D16]/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="w-full max-w-4xl flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 min-w-0 bg-[#101726] border border-white/[0.08] px-3 py-1.5 rounded-xl">
          <span className="text-xs font-medium text-slate-200 truncate">{alt}</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono-stats shrink-0">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="Micșorează"
            className="p-2 rounded-xl bg-[#101726] hover:bg-white/[0.08] disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.5}
            title="Mărește"
            className="p-2 rounded-xl bg-[#101726] hover:bg-white/[0.08] disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Resetează zoom"
            className="p-2 rounded-xl bg-[#101726] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Închide"
            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 transition-colors ml-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClose}
        style={{ touchAction: 'none' }}
        className="flex-1 w-full max-w-4xl my-3 flex items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 relative"
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onMouseDown={handleMouseDown}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            cursor: scale > 1 ? (isDraggingRef.current ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (scale === 1) setScale(2);
          }}
          className="max-h-[75vh] max-w-full object-contain transition-transform duration-150 ease-out"
        />
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        Desktop: folosește + / - sau rotița • Mobil: pinch sau glisează
      </p>
    </div>
  );
}