import { tripInputSchema, type TripInput } from "@camp-log/contracts";
import { Flame, Star } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { TripMapPicker, type LatLng } from "@/components/TripMapPicker";
import { TripPhotoPicker } from "@/components/TripPhotoPicker";
import { TripVisitsEditor } from "@/components/TripVisitsEditor";
import { Button } from "@/components/ui/button";
import {
  getTripSpanFromVisits,
  normalizeTripVisitsForSave,
  type TripVisit,
} from "@/lib/local-trips";
import { randomId } from "@/lib/random-id";

const FORM_ID = "trip-editor-form";

const inputClass =
  "w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.35)] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted-2))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent)/0.4)]";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export type TripEditorFormProps = {
  heading: string;
  description: string;
  cancelPath: string;
  submitLabel: string;
  /** Starting field values (edit mode or partially filled create). */
  initial: {
    title?: string;
    /** Used only when `visits` is omitted (defaults to one stay). */
    startDate?: string;
    endDate?: string;
    /** Preferred: full visit history; overrides start/end when provided. */
    visits?: TripVisit[];
    notes?: string;
    tagsText?: string;
    rating?: number;
    isFavourite?: boolean;
    placeName?: string;
    pin?: LatLng;
    photos?: string[];
    /** Index into `photos` for trip list card image; omit/`null` = use last uploaded. */
    thumbnailPhotoIndex?: number | null;
    /** Photo indices shown in the home gallery when starred. */
    favouritePhotoIndices?: number[];
  };
  /** Whether to request browser geolocation for the pin when no initial pin is meaningful */
  useGeolocationPin?: boolean;
  onSave: (payload: {
    input: TripInput;
    photos: string[];
    thumbnailPhotoIndex: number | null;
    favouritePhotoIndices: number[];
    visits: TripVisit[];
  }) => void | Promise<void>;
};

function buildInitialVisits(initial: TripEditorFormProps["initial"]): TripVisit[] {
  if (initial.visits && initial.visits.length > 0) {
    return initial.visits.map((v) => ({
      id: v.id,
      startDate: v.startDate,
      endDate: v.endDate,
      notes: v.notes ?? "",
    }));
  }
  const sd = initial.startDate ?? todayIsoDate();
  const ed = initial.endDate ?? sd;
  return [{ id: randomId(), startDate: sd, endDate: ed, notes: "" }];
}

export function TripEditorForm({
  heading,
  description,
  cancelPath,
  submitLabel,
  initial,
  useGeolocationPin = false,
  onSave,
}: TripEditorFormProps) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [visits, setVisits] = useState<TripVisit[]>(() => buildInitialVisits(initial));
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [tagsText, setTagsText] = useState(initial.tagsText ?? "");
  const [rating, setRating] = useState(initial.rating ?? 4);
  const [isFavourite, setIsFavourite] = useState(initial.isFavourite ?? false);
  const [placeName, setPlaceName] = useState(initial.placeName ?? "");
  const [pin, setPin] = useState<LatLng>(initial.pin ?? { lat: 0, lng: 0 });
  const [photos, setPhotos] = useState<string[]>(initial.photos ?? []);
  const [thumbnailPhotoIndex, setThumbnailPhotoIndex] = useState<number | null>(
    initial.thumbnailPhotoIndex ?? null,
  );
  const [favouritePhotoIndices, setFavouritePhotoIndices] = useState<number[]>(
    initial.favouritePhotoIndices ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const titleId = useId();
  const placeId = useId();
  const notesId = useId();
  const tagsId = useId();

  useEffect(() => {
    if (!useGeolocationPin || initial.pin) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { maximumAge: 120_000, timeout: 10_000 },
    );
  }, [useGeolocationPin, initial.pin]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const tagNames = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (visits.length === 0) {
      setFormError("Add at least one visit.");
      return;
    }

    const visitsSorted = normalizeTripVisitsForSave(visits);
    for (const v of visitsSorted) {
      if (v.startDate > v.endDate) {
        setFormError("Each stay must end on or after it starts.");
        return;
      }
    }

    const span = getTripSpanFromVisits(visitsSorted);

    const parsed = tripInputSchema.safeParse({
      title,
      startDate: span.startDate,
      endDate: span.endDate,
      latitude: pin.lat,
      longitude: pin.lng,
      placeName: placeName.trim() ? placeName.trim() : null,
      notes,
      rating,
      isFavourite,
      tagNames,
    });

    if (!parsed.success) {
      setFormError("Check title, dates, and rating.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        input: parsed.data,
        photos,
        thumbnailPhotoIndex,
        favouritePhotoIndices,
        visits: visitsSorted,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Could not save trip";
      setFormError(
        msg.includes("QuotaExceeded") || msg.includes("quota")
          ? "Storage full—remove some photos or clear old data."
          : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{heading}</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted-2))]">{description}</p>
        </div>
        <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
          <Link to={cancelPath}>Cancel</Link>
        </Button>
      </div>

      <form id={FORM_ID} className="space-y-6 pb-4 md:pb-0" onSubmit={onSubmit}>
        <div>
          <label htmlFor={titleId} className="mb-1 block text-sm font-medium text-[rgb(var(--muted))]">
            Title
          </label>
          <input
            id={titleId}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summer lake weekend"
            required
            maxLength={200}
          />
        </div>

        <TripVisitsEditor visits={visits} onChange={setVisits} />

        <div>
          <label htmlFor={placeId} className="mb-1 block text-sm font-medium text-[rgb(var(--muted))]">
            Place name
          </label>
          <input
            id={placeId}
            className={inputClass}
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Optional"
            maxLength={500}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-[rgb(var(--muted))]">Map pin</p>
          <TripMapPicker position={pin} onChange={setPin} />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-[rgb(var(--muted))]">Photos</span>
          <p className="mb-2 text-xs text-[rgb(var(--muted-2))]">
            Use the star on a photo to include it in the <Link to="/">home</Link> gallery.
          </p>
          <TripPhotoPicker
            photos={photos}
            onChange={setPhotos}
            thumbnailIndex={thumbnailPhotoIndex}
            onThumbnailIndexChange={setThumbnailPhotoIndex}
            favouritePhotoIndices={favouritePhotoIndices}
            onFavouritePhotoIndicesChange={setFavouritePhotoIndices}
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-[rgb(var(--muted))]">Rating</span>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors ${
                  rating === n
                    ? "border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--panel-2))]"
                }`}
                onClick={() => setRating(n)}
                aria-label={`Set rating to ${n} stars`}
                title={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={`h-5 w-5 ${rating >= n ? "fill-amber-400 text-amber-400" : "text-[rgb(var(--muted-2))]"}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-[rgb(var(--fg))]">Favourite</p>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
              isFavourite
                ? "border-amber-400/70 bg-amber-500/15 text-amber-300"
                : "border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted-2))] hover:bg-[rgb(var(--panel-2))]"
            }`}
            aria-pressed={isFavourite}
            aria-label={isFavourite ? "Mark as not favourite" : "Mark as favourite"}
            onClick={() => setIsFavourite((prev) => !prev)}
          >
            <Flame className={`h-5 w-5 ${isFavourite ? "fill-amber-400" : ""}`} aria-hidden />
          </button>
        </div>

        <div>
          <label htmlFor={tagsId} className="mb-1 block text-sm font-medium text-[rgb(var(--muted))]">
            Tags
          </label>
          <input
            id={tagsId}
            className={inputClass}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Comma-separated, e.g. canoe, friends"
          />
        </div>

        <div>
          <label htmlFor={notesId} className="mb-1 block text-sm font-medium text-[rgb(var(--muted))]">
            Trip notes
          </label>
          <p className="mb-1 text-xs text-[rgb(var(--muted-2))]">
            Overall notes for this place—separate from each stay above.
          </p>
          <textarea
            id={notesId}
            className={`${inputClass} min-h-[120px] resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={20_000}
          />
        </div>

        {formError ? (
          <p className="text-sm text-red-400" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="hidden md:block">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "Saving…" : submitLabel}
          </Button>
        </div>

        {/* Space so content stays above mobile sticky actions + bottom tab bar */}
        <div className="h-[calc(7.5rem+env(safe-area-inset-bottom))] shrink-0 md:hidden" aria-hidden />
      </form>

      <div
        className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 flex gap-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.95)] px-4 py-2.5 backdrop-blur-md md:hidden"
      >
        <Button variant="outline" asChild className="min-h-11 flex-1">
          <Link to={cancelPath}>Cancel</Link>
        </Button>
        <Button
          type="submit"
          form={FORM_ID}
          disabled={saving}
          className="min-h-11 flex-[2]"
        >
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
