import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type TripPhotoLightboxImageHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

/**
 * Owns zoom/pan per photo; parent sets `key={photoIndex}` so state resets when navigating.
 */
const TripPhotoLightboxImage = forwardRef<
  TripPhotoLightboxImageHandle,
  {
    src: string;
    blocked: boolean;
    onZoomUiChange: (s: { scale: number; panX: number; panY: number }) => void;
  }
>(function TripPhotoLightboxImage({ src, blocked, onZoomUiChange }, ref) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const notify = useCallback(
    (nextScale: number, nextPan: { x: number; y: number }) => {
      onZoomUiChange({ scale: nextScale, panX: nextPan.x, panY: nextPan.y });
    },
    [onZoomUiChange],
  );

  useEffect(() => {
    notify(scale, pan);
  }, [scale, pan, notify]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        setScale((s) => {
          const next = clamp(s + 0.25, MIN_SCALE, MAX_SCALE);
          return next;
        });
      },
      zoomOut: () => {
        setScale((s) => {
          const next = clamp(s - 0.25, MIN_SCALE, MAX_SCALE);
          if (next <= MIN_SCALE) setPan({ x: 0, y: 0 });
          return next;
        });
      },
      resetZoom: () => {
        setScale(1);
        setPan({ x: 0, y: 0 });
      },
    }),
    [],
  );

  const onWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      if (blocked) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = -e.deltaY * 0.002;
      setScale((s) => {
        const next = clamp(s + delta, MIN_SCALE, MAX_SCALE);
        if (next <= MIN_SCALE) setPan({ x: 0, y: 0 });
        return next;
      });
    },
    [blocked],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale <= MIN_SCALE || blocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    setPan({
      x: d.origX + (e.clientX - d.startX),
      y: d.origY + (e.clientY - d.startY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d && e.pointerId === d.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-10 py-4 sm:px-14"
      onWheel={onWheel}
    >
      <div className="flex max-h-full max-w-full items-center justify-center overflow-visible">
        <div
          className={cn(
            "touch-none select-none",
            scale > MIN_SCALE ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.08s ease-out",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            src={src}
            alt=""
            className="max-h-[min(85vh,900px)] max-w-[min(100vw-8rem,1200px)] object-contain"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
});

export function TripPhotoLightbox({
  openIndex,
  onClose,
  onIndexChange,
  photoDataUrls,
  isFavouriteAt,
  onToggleFavourite,
  onRemove,
}: {
  openIndex: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  photoDataUrls: readonly string[];
  isFavouriteAt: (index: number) => boolean;
  onToggleFavourite: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const titleId = useId();
  const imageRef = useRef<TripPhotoLightboxImageHandle>(null);
  const [zoomUi, setZoomUi] = useState({ scale: 1, panX: 0, panY: 0 });
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const count = photoDataUrls.length;
  const index = openIndex;
  const open = index !== null && count > 0 && index >= 0 && index < count;
  const src = open ? photoDataUrls[index]! : "";

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (removeConfirmOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setRemoveConfirmOpen(false);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange(index! > 0 ? index! - 1 : count - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange(index! < count - 1 ? index! + 1 : 0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, removeConfirmOpen, onClose, onIndexChange, index, count]);

  const goPrev = () => {
    if (index === null) return;
    onIndexChange(index > 0 ? index - 1 : count - 1);
  };

  const goNext = () => {
    if (index === null) return;
    onIndexChange(index < count - 1 ? index + 1 : 0);
  };

  const confirmRemove = () => {
    if (index === null) return;
    onRemove(index);
    setRemoveConfirmOpen(false);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[rgb(var(--bg)/0.92)] backdrop-blur-[2px]"
            aria-label="Close viewer"
            onClick={onClose}
          />
          <div
            className="relative z-10 flex min-h-0 flex-1 flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.9)] px-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[rgb(var(--border))]"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
                <p id={titleId} className="truncate text-sm text-[rgb(var(--muted))]">
                  Photo {index! + 1} of {count}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[rgb(var(--border))]"
                  onClick={() => index !== null && onToggleFavourite(index)}
                  aria-label={
                    isFavouriteAt(index!) ? "Remove from favourites" : "Add to favourites"
                  }
                  aria-pressed={index !== null ? isFavouriteAt(index) : false}
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      index !== null && isFavouriteAt(index)
                        ? "fill-amber-400 text-amber-400"
                        : "text-amber-300",
                    )}
                  />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[rgb(var(--border))] text-red-500 hover:bg-red-500/10"
                  onClick={() => setRemoveConfirmOpen(true)}
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="mx-1 hidden h-6 w-px bg-[rgb(var(--border))] sm:block" aria-hidden />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[rgb(var(--border))]"
                  onClick={() => imageRef.current?.zoomOut()}
                  disabled={zoomUi.scale <= MIN_SCALE}
                  aria-label="Zoom out"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[rgb(var(--border))]"
                  onClick={() => imageRef.current?.zoomIn()}
                  disabled={zoomUi.scale >= MAX_SCALE}
                  aria-label="Zoom in"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[rgb(var(--border))]"
                  onClick={() => imageRef.current?.resetZoom()}
                  disabled={
                    zoomUi.scale <= MIN_SCALE && zoomUi.panX === 0 && zoomUi.panY === 0
                  }
                  aria-label="Reset zoom"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute left-1 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.85)] p-0 sm:left-2"
                onClick={goPrev}
                disabled={count <= 1}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-1 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.85)] p-0 sm:right-2"
                onClick={goNext}
                disabled={count <= 1}
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>

              <TripPhotoLightboxImage
                ref={imageRef}
                key={index}
                src={src}
                blocked={removeConfirmOpen}
                onZoomUiChange={setZoomUi}
              />
            </div>

            <p className="shrink-0 px-3 pb-3 text-center text-xs text-[rgb(var(--muted-2))]">
              Scroll wheel or +/- to zoom. Drag when zoomed. Arrow keys to navigate. Escape to close.
            </p>
          </div>
        </div>
      ) : null}

      {open && removeConfirmOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="photo-remove-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Dismiss"
            onClick={() => setRemoveConfirmOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel))] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="photo-remove-title" className="text-lg font-semibold text-[rgb(var(--fg))]">
              Remove this photo?
            </h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              It will be deleted from this trip on this device only. You can use Cancel to keep it.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRemoveConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-700 text-white hover:bg-red-600"
                onClick={confirmRemove}
              >
                Remove photo
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
