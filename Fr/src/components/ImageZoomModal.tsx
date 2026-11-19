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
      className="fixed inset-0 z-[100000] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Bara de control sus */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-2 mb-3 z-20">
        <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-300 truncate">
          {alt} • <span className="text-emerald-400">{Math.round(scale * 100)}%</span>
        </div>

        {/* Butoane + / - / Reset vizibile pe desktop și utile și pe mobil */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="Micșorează (-)"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white border border-slate-700 transition-colors"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.5}
            title="Mărește (+)"
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white border border-emerald-700 transition-colors"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Resetează zoom"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Închide"
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border border-rose-700 transition-colors ml-1"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Zona imaginii */}
      <div
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
        className="flex-1 w-full max-w-4xl flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 relative"
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
          onClick={() => {
            if (scale === 1) setScale(2);
          }}
          className="max-h-[75vh] max-w-full object-contain transition-transform duration-150 ease-out"
        />
      </div>

      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 mt-3 text-center">
        Desktop: folosește + / - sau rotița mouse-ului • Mobil: ciupește (pinch) sau glisează cu degetul
      </p>
    </div>
  );
}