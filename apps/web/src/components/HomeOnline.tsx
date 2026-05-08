import { Home, Image as ImageIcon, List, Plus, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  collectFavouritePhotoGalleryItems,
  formatTripListDateLine,
  getLastAddedTrip,
  getTripListThumbnailUrl,
  useLocalTripsSnapshot,
} from "@/lib/local-trips";

type SeasonKey = "spring" | "summer" | "autumn" | "winter";

function seasonFromIsoDate(isoDate: string, latitude: number | null): SeasonKey {
  const month = Number.parseInt(isoDate.slice(5, 7), 10);
  const isSouthernHemisphere = latitude != null && latitude < 0;
  if (!isSouthernHemisphere) {
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }
  if (month >= 3 && month <= 5) return "autumn";
  if (month >= 6 && month <= 8) return "winter";
  if (month >= 9 && month <= 11) return "spring";
  return "summer";
}

export function HomeOnline() {
  const trips = useLocalTripsSnapshot();
  const lastAdded = getLastAddedTrip(trips);
  const gallery = collectFavouritePhotoGalleryItems(trips);
  const lastThumb = lastAdded ? getTripListThumbnailUrl(lastAdded) : null;

  const averageRating = useMemo(() => {
    if (trips.length === 0) return 0;
    const total = trips.reduce((sum, trip) => sum + trip.rating, 0);
    return total / trips.length;
  }, [trips]);

  const memoryOfDay = useMemo(() => {
    if (gallery.length === 0) return null;
    const daySeed = Math.floor(Date.now() / 86_400_000);
    const i = Math.abs(daySeed) % gallery.length;
    return gallery[i] ?? null;
  }, [gallery]);

  const seasonCounts = useMemo(() => {
    const counts: Record<SeasonKey, number> = {
      spring: 0,
      summer: 0,
      autumn: 0,
      winter: 0,
    };
    for (const trip of trips) {
      for (const visit of trip.visits) {
        counts[seasonFromIsoDate(visit.startDate, trip.latitude)] += 1;
      }
    }
    return counts;
  }, [trips]);
  const seasonalTotal =
    seasonCounts.spring + seasonCounts.summer + seasonCounts.autumn + seasonCounts.winter;
  const seasonPercent = (value: number) =>
    seasonalTotal > 0 ? Math.max((value / seasonalTotal) * 100, 8) : 25;
  const [activeSeason, setActiveSeason] = useState<SeasonKey | null>(null);
  const seasonOrder: SeasonKey[] = ["spring", "summer", "autumn", "winter"];
  const seasonToneClass: Record<SeasonKey, string> = {
    spring: "bg-emerald-400/85",
    summer: "bg-amber-300/85",
    autumn: "bg-orange-400/80",
    winter: "bg-sky-300/80",
  };
  const seasonLabel: Record<SeasonKey, string> = {
    spring: "Spring",
    summer: "Summer",
    autumn: "Autumn",
    winter: "Winter",
  };
  const seasonSegments = seasonOrder.map((season) => ({
    season,
    width: seasonPercent(seasonCounts[season]),
  }));
  const activeSeasonCenterPercent = (() => {
    if (!activeSeason) return 50;
    let cursor = 0;
    for (const segment of seasonSegments) {
      const center = cursor + segment.width / 2;
      if (segment.season === activeSeason) return center;
      cursor += segment.width;
    }
    return 50;
  })();

  return (
    <div className="space-y-8">
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
        <Home className="h-5 w-5 text-[rgb(var(--accent))]" aria-hidden />
        Home
      </h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.3)] p-3">
            <p className="inline-flex items-center gap-1 text-xs text-[rgb(var(--muted))]">
              <List className="h-3.5 w-3.5" aria-hidden />
              Trips
            </p>
            <p className="mt-1 text-xl font-semibold">{trips.length}</p>
          </div>
          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.3)] p-3">
            <p className="inline-flex items-center gap-1 text-xs text-[rgb(var(--muted))]">
              <Star className="h-3.5 w-3.5" aria-hidden />
              Avg rating
            </p>
            <p className="mt-1 text-xl font-semibold">{averageRating.toFixed(1)}</p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
          Seasonal activity
        </h2>
        <div className="relative">
          {activeSeason ? (
            <p
              className="pointer-events-none absolute top-0 z-10 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 py-1 text-xs whitespace-nowrap text-[rgb(var(--fg))] shadow-md"
              style={{
                left: `clamp(4.5rem, ${activeSeasonCenterPercent}%, calc(100% - 4.5rem))`,
              }}
            >
              {seasonLabel[activeSeason]}: {seasonCounts[activeSeason]} visit
              {seasonCounts[activeSeason] === 1 ? "" : "s"}
            </p>
          ) : null}
          <div className="relative h-8 w-full">
            <div
              className="pointer-events-none absolute left-0 right-0 top-1/2 flex h-2 -translate-y-1/2 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.4)]"
              role="img"
              aria-label={`Season visits: spring ${seasonCounts.spring}, summer ${seasonCounts.summer}, autumn ${seasonCounts.autumn}, winter ${seasonCounts.winter}`}
            >
              {seasonSegments.map(({ season, width }) => (
                <div
                  key={season}
                  className={seasonToneClass[season]}
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
              ))}
            </div>

            <div className="absolute inset-0 flex">
              {seasonSegments.map(({ season, width }) => (
                <button
                  key={season}
                  type="button"
                  className="h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.4)]"
                  style={{ width: `${width}%` }}
                  aria-label={`${seasonLabel[season]}: ${seasonCounts[season]} visits`}
                  onMouseEnter={() => setActiveSeason(season)}
                  onMouseLeave={() => setActiveSeason((current) => (current === season ? null : current))}
                  onFocus={() => setActiveSeason(season)}
                  onBlur={() => setActiveSeason((current) => (current === season ? null : current))}
                  onClick={() => setActiveSeason((current) => (current === season ? null : season))}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-[rgb(var(--muted-2))]">Spring · Summer · Autumn · Winter</p>
      </section>

      {memoryOfDay ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
            Memory of the day
          </h2>
          <Link
            to={`/trips/${memoryOfDay.tripId}`}
            className="group flex items-center gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.3)] p-3 transition-colors hover:bg-[rgb(var(--panel)/0.5)]"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel-2))]">
              <img src={memoryOfDay.url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-xs text-[rgb(var(--accent))]">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                Featured from your photo collection
              </p>
              <p className="mt-0.5 truncate font-medium text-[rgb(var(--fg))]">{memoryOfDay.tripTitle}</p>
            </div>
          </Link>
        </section>
      ) : null}

      {lastAdded ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
            Latest trip
          </h2>
          <Link
            to={`/trips/${lastAdded.id}`}
            className="flex gap-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.4)] p-4 transition-colors hover:bg-[rgb(var(--panel)/0.6)]"
          >
            {lastThumb ? (
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel-2))]">
                <img src={lastThumb} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-[rgb(var(--accent))]">
                Last added
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">{lastAdded.title}</h3>
              <p className="mt-1 text-sm text-[rgb(var(--muted-2))]">
                {formatTripListDateLine(lastAdded)}
                {lastAdded.placeName ? ` · ${lastAdded.placeName}` : ""}
              </p>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
          Favourite photos
        </h2>
        {gallery.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[rgb(var(--border))] px-4 py-8 text-center text-[rgb(var(--muted-2))]">
            <p>Mark trip photos with a star to feature them here.</p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link to="/trips">Open trips</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((item) => (
              <li key={`${item.tripId}-${item.photoIndex}`} className="relative">
                <Link
                  to={`/trips/${item.tripId}`}
                  aria-label={`View trip: ${item.tripTitle}`}
                  className="group relative block aspect-square overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)]"
                >
                  <img
                    src={item.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs font-medium text-white">{item.tripTitle}</p>
                  </div>
                  <Star
                    className="absolute right-2 top-2 h-4 w-4 fill-amber-400 text-amber-400 drop-shadow"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-3 border-t border-[rgb(var(--border))] pt-6">
        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link to="/trips">
              <List className="h-4 w-4" aria-hidden />
              All trips
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/trips/new">
              <Plus className="h-4 w-4" aria-hidden />
              Add trip
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
