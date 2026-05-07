import { ArrowLeft, Flame, Navigation, Pencil, Star } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { getGoogleMapsDirectionsUrl } from "@/lib/google-maps-url";
import { TripPhotoLightbox } from "@/components/TripPhotoLightbox";
import {
  formatTripListDateLine,
  getTripVisitsChronological,
  removeLocalTripPhoto,
  toggleLocalTripPhotoFavourite,
  useLocalTrip,
} from "@/lib/local-trips";

export function TripDetailOnline() {
  const { id } = useParams<{ id: string }>();
  const trip = useLocalTrip(id);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!id) {
    return <p className="text-[rgb(var(--muted))]">Missing trip id.</p>;
  }

  const directionsUrl = trip
    ? getGoogleMapsDirectionsUrl({
        latitude: trip.latitude,
        longitude: trip.longitude,
        placeName: trip.placeName,
      })
    : null;

  if (trip === undefined) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/trips" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to trips
          </Link>
        </Button>
        <p className="text-[rgb(var(--muted))]">That trip was not found.</p>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/trips" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            All trips
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to={`/trips/${trip.id}/edit`} className="inline-flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <header className="space-y-2 border-b border-[rgb(var(--border))] pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">{trip.title}</h1>
          <div className="flex items-center gap-1 text-amber-400" aria-label={`Rating ${trip.rating} out of 5`}>
            {trip.isFavourite ? (
              <Flame className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden />
            ) : null}
            <span className="inline-flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${trip.rating >= n ? "fill-amber-400 text-amber-400" : "text-[rgb(var(--border))]"}`}
                  aria-hidden
                />
              ))}
            </span>
          </div>
        </div>
        <p className="text-[rgb(var(--muted))]">
          {formatTripListDateLine(trip)}
          {trip.placeName ? ` · ${trip.placeName}` : ""}
        </p>
        {trip.tags.length > 0 ? (
          <p className="flex flex-wrap gap-2">
            {trip.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-[rgb(var(--panel-2))] px-2.5 py-0.5 text-xs text-[rgb(var(--muted))]"
              >
                {t}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {trip.visits.length > 1 || trip.visits.some((v) => v.notes.trim()) ? (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">Visits</h2>
          <ol className="mt-3 space-y-4 border-l-2 border-[rgb(var(--accent)/0.35)] pl-4">
            {getTripVisitsChronological(trip).map((v) => (
              <li key={v.id} className="relative pl-1">
                <span
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[rgb(var(--bg))] bg-[rgb(var(--accent-2))]"
                  aria-hidden
                />
                <p className="text-sm font-medium text-[rgb(var(--fg))]">
                  {v.startDate} → {v.endDate}
                </p>
                {v.notes.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[rgb(var(--muted))]">{v.notes}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {trip.photoDataUrls.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">Photos</h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted-2))]">
            Star a photo to show it on the <Link to="/">home</Link> gallery.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {trip.photoDataUrls.map((src, i) => {
              const isFav = trip.favouritePhotoIndices.includes(i);
              return (
                <li
                  key={`${i}-${src.slice(0, 24)}`}
                  className="relative aspect-square overflow-hidden rounded-lg border border-[rgb(var(--border))]"
                >
                  <button
                    type="button"
                    className="absolute inset-0 z-0 block h-full w-full text-left"
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`Open photo ${i + 1} larger`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="pointer-events-none h-full w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    className="absolute left-1 top-1 z-10 rounded-md bg-[rgb(var(--bg)/0.8)] p-1 text-amber-300 hover:text-amber-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLocalTripPhotoFavourite(trip.id, i);
                    }}
                    aria-label={isFav ? "Remove photo from favourites" : "Favourite photo"}
                    aria-pressed={isFav}
                  >
                    <Star
                      className={`h-4 w-4 ${isFav ? "fill-amber-400 text-amber-400" : ""}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <TripPhotoLightbox
            openIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
            photoDataUrls={trip.photoDataUrls}
            isFavouriteAt={(i) => trip.favouritePhotoIndices.includes(i)}
            onToggleFavourite={(i) => {
              toggleLocalTripPhotoFavourite(trip.id, i);
            }}
            onRemove={(idx) => {
              const next = removeLocalTripPhoto(trip.id, idx);
              if (!next) return;
              if (next.photoDataUrls.length === 0) setLightboxIndex(null);
              else setLightboxIndex(Math.min(idx, next.photoDataUrls.length - 1));
            }}
          />
        </section>
      ) : null}

      {trip.notes ? (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-[rgb(var(--fg))]">{trip.notes}</p>
        </section>
      ) : null}

      {directionsUrl ? (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">Location</h2>
          <div className="mt-3">
            <Button asChild className="w-full sm:w-auto">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Navigation className="h-4 w-4 shrink-0" aria-hidden />
                Get directions
              </a>
            </Button>
            <p className="mt-2 text-xs text-[rgb(var(--muted-2))]">
              Opens Google Maps with directions to this trip (from your current location when Maps
              allows it).
            </p>
          </div>
          {trip.latitude != null && trip.longitude != null ? (
            <p className="mt-3 font-mono text-sm text-[rgb(var(--muted))]">
              {trip.latitude.toFixed(5)}, {trip.longitude.toFixed(5)}
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="text-xs text-[rgb(var(--muted-2))]">
        Updated {new Date(trip.updatedAt).toLocaleString()}
      </footer>
    </article>
  );
}
