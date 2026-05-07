import { ImagePlus, Star, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fileToJpegDataUrl } from "@/lib/compress-image";
import { adjustFavouritePhotoIndicesOnRemove } from "@/lib/local-trips";

const MAX_PHOTOS = 24;

function effectiveCardCoverIndex(
  photos: readonly string[],
  thumbnailIndex: number | null,
): number {
  if (photos.length === 0) return -1;
  if (
    thumbnailIndex !== null &&
    thumbnailIndex >= 0 &&
    thumbnailIndex < photos.length
  ) {
    return thumbnailIndex;
  }
  return photos.length - 1;
}

function togglePhotoFavourite(indices: readonly number[], i: number): number[] {
  const set = new Set(indices);
  if (set.has(i)) set.delete(i);
  else set.add(i);
  return [...set].sort((a, b) => a - b);
}

export function TripPhotoPicker({
  photos,
  onChange,
  thumbnailIndex,
  onThumbnailIndexChange,
  favouritePhotoIndices,
  onFavouritePhotoIndicesChange,
}: {
  photos: readonly string[];
  onChange: (next: string[]) => void;
  thumbnailIndex: number | null;
  onThumbnailIndexChange: (next: number | null) => void;
  favouritePhotoIndices: readonly number[];
  onFavouritePhotoIndicesChange: (next: number[]) => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos per trip.`);
      return;
    }
    const slice = [...files].slice(0, remaining).filter((f) => f.type.startsWith("image/"));
    if (slice.length === 0) return;
    setBusy(true);
    try {
      const next: string[] = [...photos];
      for (const file of slice) {
        try {
          next.push(await fileToJpegDataUrl(file));
        } catch {
          setError("Could not read one of the images—try another file.");
        }
      }
      onChange(next);
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (index: number) => {
    const next = photos.filter((_, i) => i !== index);
    let thumb = thumbnailIndex;
    if (thumb !== null) {
      if (index === thumb) thumb = null;
      else if (index < thumb) thumb = thumb - 1;
    }
    if (next.length === 0) thumb = null;
    const favs = adjustFavouritePhotoIndicesOnRemove(favouritePhotoIndices, index);
    onChange(next);
    onThumbnailIndexChange(thumb);
    onFavouritePhotoIndicesChange(favs);
  };

  const coverIdx = effectiveCardCoverIndex(photos, thumbnailIndex);
  const usingLatestAsCover =
    photos.length > 0 &&
    (thumbnailIndex === null ||
      thumbnailIndex < 0 ||
      thumbnailIndex >= photos.length);

  return (
    <div className="space-y-3">
      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={busy || photos.length >= MAX_PHOTOS}
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || photos.length >= MAX_PHOTOS}
          className="border-[rgb(var(--border))]"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {busy ? "Processing…" : "Add photos"}
        </Button>
        <span className="text-xs text-[rgb(var(--muted-2))]">{photos.length}/{MAX_PHOTOS}</span>
        {photos.length > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto border-[rgb(var(--border))] bg-transparent px-2 py-1 text-xs font-normal text-[rgb(var(--muted))] hover:bg-[rgb(var(--panel)/0.35)] hover:text-[rgb(var(--fg))]"
            onClick={() => onThumbnailIndexChange(null)}
          >
            {usingLatestAsCover ? (
              <span className="text-[rgb(var(--accent))]">Using latest upload as card photo</span>
            ) : (
              "Use latest upload as card photo"
            )}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((src, i) => {
            const isCardCover = i === coverIdx;
            const isPhotoFavourite = favouritePhotoIndices.includes(i);
            return (
              <li
                key={`${i}-${src.slice(0, 32)}`}
                className={`relative aspect-square overflow-hidden rounded-lg border bg-[rgb(var(--panel))] ${
                  isCardCover
                    ? "border-[rgb(var(--accent)/0.65)] ring-1 ring-[rgb(var(--accent)/0.25)]"
                    : "border-[rgb(var(--border))]"
                }`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute left-1 top-1 rounded-md bg-[rgb(var(--bg)/0.8)] p-1 text-amber-300 hover:text-amber-100"
                  onClick={() =>
                    onFavouritePhotoIndicesChange(togglePhotoFavourite(favouritePhotoIndices, i))
                  }
                  aria-label={isPhotoFavourite ? "Remove photo from favourites" : "Favourite photo"}
                  aria-pressed={isPhotoFavourite}
                >
                  <Star
                    className={`h-4 w-4 ${isPhotoFavourite ? "fill-amber-400 text-amber-400" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-md bg-[rgb(var(--bg)/0.8)] p-1 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                  onClick={() => removeAt(i)}
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex items-stretch justify-center bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-6">
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-1 text-center text-xs font-medium transition-colors ${
                      isCardCover
                        ? "bg-[rgb(var(--accent-2))] text-white"
                        : "bg-[rgb(var(--panel)/0.85)] text-[rgb(var(--fg))] hover:bg-[rgb(var(--panel-2))]"
                    }`}
                    onClick={() => onThumbnailIndexChange(i)}
                  >
                    {isCardCover ? "Card photo" : "Set as card photo"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
