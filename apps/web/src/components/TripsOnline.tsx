import { ChevronDown, Flame, List, Plus, SlidersHorizontal, Star } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LocalTrip } from "@/lib/local-trips";
import {
  formatTripListDateLine,
  getLastVisitEndForSort,
  getTripListThumbnailUrl,
  useLocalTripsSnapshot,
} from "@/lib/local-trips";

type VisitBucket = "1" | "2" | "3+";
type RatingSort = "high" | "low";

function tripMatchesVisitBuckets(trip: LocalTrip, buckets: ReadonlySet<VisitBucket>): boolean {
  if (buckets.size === 0) return true;
  const n = trip.visits.length;
  return (
    (buckets.has("1") && n === 1) ||
    (buckets.has("2") && n === 2) ||
    (buckets.has("3+") && n >= 3)
  );
}

function filterTrips(
  trips: readonly LocalTrip[],
  options: {
    favouritesOnly: boolean;
    searchQuery: string;
    selectedVisitBuckets: ReadonlySet<VisitBucket>;
    selectedTags: ReadonlySet<string>;
  },
): LocalTrip[] {
  const q = options.searchQuery.trim().toLowerCase();
  return trips.filter((trip) => {
    if (options.favouritesOnly && !trip.isFavourite) return false;

    if (q) {
      const titleOk = String(trip.title ?? "")
        .toLowerCase()
        .includes(q);
      const placeOk = String(trip.placeName ?? "")
        .toLowerCase()
        .includes(q);
      const tagOk = trip.tags.some((t) => String(t).toLowerCase().includes(q));
      if (!titleOk && !placeOk && !tagOk) return false;
    }

    if (!tripMatchesVisitBuckets(trip, options.selectedVisitBuckets)) return false;

    if (options.selectedTags.size > 0) {
      const any = trip.tags.some((t) => options.selectedTags.has(t));
      if (!any) return false;
    }

    return true;
  });
}

function TripCard({ trip }: { trip: LocalTrip }) {
  const thumbUrl = getTripListThumbnailUrl(trip);
  const ratingStars = [1, 2, 3, 4, 5];
  return (
    <li>
      <Link
        to={`/trips/${trip.id}`}
        className="flex gap-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.3)] p-4 transition-colors hover:bg-[rgb(var(--panel)/0.5)]"
      >
        {thumbUrl ? (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel-2))]">
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          
          <div className="min-w-0">
          <div
            className="flex shrink-0 items-center gap-1 text-amber-400"
            title={`${trip.rating} / 5`}
            aria-label={`Rating ${trip.rating} out of 5`}
          >
            {trip.isFavourite ? (
              <Flame className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            ) : null}
            <span className="inline-flex items-center gap-0.5">
              {ratingStars.map((n) => (
                <Star
                  key={n}
                  className={`h-3.5 w-3.5 ${trip.rating >= n ? "fill-amber-400 text-amber-400" : "text-[rgb(var(--border))]"}`}
                  aria-hidden
                />
              ))}
            </span>
          </div>
            <h2 className="font-medium text-[rgb(var(--fg))]">{trip.title}</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted-2))]">
              {formatTripListDateLine(trip)}
              {trip.placeName ? ` · ${trip.placeName}` : ""}
            </p>
            {trip.tags.length > 0 ? (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {trip.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[rgb(var(--panel-2))] px-2 py-0.5 text-xs text-[rgb(var(--muted))]"
                  >
                    {t}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          
        </div>
      </Link>
    </li>
  );
}

const searchInputClass =
  "w-full min-w-0 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.35)] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted-2))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent)/0.4)]";

export function TripsOnline() {
  const allTrips = useLocalTripsSnapshot();
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [ratingSort, setRatingSort] = useState<RatingSort>("high");
  const [selectedVisitBuckets, setSelectedVisitBuckets] = useState<Set<VisitBucket>>(
    () => new Set(),
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());

  const searchId = useId();

  const sortedTrips = useMemo(() => {
    const byRecent = [...allTrips].sort((a, b) =>
      getLastVisitEndForSort(a) < getLastVisitEndForSort(b) ? 1 : -1,
    );
    return byRecent.sort((a, b) => {
      if (a.rating === b.rating) return 0;
      return ratingSort === "high" ? b.rating - a.rating : a.rating - b.rating;
    });
  }, [allTrips, ratingSort]);

  const { uniqueTags } = useMemo(() => {
    const tagSet = new Set<string>();
    for (const t of allTrips) {
      for (const tag of t.tags) tagSet.add(tag);
    }
    return {
      uniqueTags: [...tagSet].sort((a, b) => a.localeCompare(b)),
    };
  }, [allTrips]);

  const visibleTrips = useMemo(
    () =>
      filterTrips(sortedTrips, {
        favouritesOnly,
        searchQuery,
        selectedVisitBuckets,
        selectedTags,
      }),
    [
      sortedTrips,
      favouritesOnly,
      searchQuery,
      selectedVisitBuckets,
      selectedTags,
    ],
  );

  const moreFiltersCount =
    (favouritesOnly ? 1 : 0) +
    1 + // rating sort is always active
    selectedVisitBuckets.size +
    selectedTags.size;

  const hasActiveMoreFilters = moreFiltersCount > 0;
  const hasActiveSearch = searchQuery.trim().length > 0;
  const showFilterSummary =
    allTrips.length > 0 &&
    (favouritesOnly || hasActiveSearch || hasActiveMoreFilters);

  function toggleVisitBucket(b: VisitBucket) {
    setSelectedVisitBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function clearMoreFilters() {
    setFavouritesOnly(false);
    setRatingSort("high");
    setSearchQuery("");
    setSelectedVisitBuckets(new Set());
    setSelectedTags(new Set());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
            <List className="h-5 w-5 text-[rgb(var(--accent))]" aria-hidden />
            Trips
          </h1>
        </div>
        <Button asChild size="sm" className="shrink-0 self-start">
          <Link to="/trips/new">
            <Plus className="h-4 w-4" aria-hidden />
            Add trip
          </Link>
        </Button>
      </div>

      {allTrips.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <label htmlFor={searchId} className="sr-only">
                Search trips
              </label>
              <input
                id={searchId}
                type="search"
                enterKeyHint="search"
                placeholder="Search title, place, tags…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={searchInputClass}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[rgb(var(--border))]"
                aria-expanded={moreFiltersOpen}
                aria-controls="trips-more-filters"
                onClick={() => setMoreFiltersOpen((o) => !o)}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                More filters
                {moreFiltersCount > 0 && !moreFiltersOpen ? (
                  <span className="rounded-full bg-[rgb(var(--accent)/0.2)] px-1.5 text-xs tabular-nums text-[rgb(var(--accent))]">
                    {moreFiltersCount}
                  </span>
                ) : null}
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", moreFiltersOpen && "rotate-180")}
                  aria-hidden
                />
              </Button>
            </div>
          </div>

          {moreFiltersOpen ? (
              <div
                id="trips-more-filters"
                className="space-y-6 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.2)] p-4"
              >
              <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
                  Trip type
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors",
                      favouritesOnly
                        ? "border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--panel-2))]",
                    )}
                    onClick={() => setFavouritesOnly((v) => !v)}
                    aria-pressed={favouritesOnly}
                  >
                    <Flame className="h-4 w-4" aria-hidden />
                    Favourites only
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
                  Sort by rating
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "high" as const, label: "Highest first" },
                      { key: "low" as const, label: "Lowest first" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors",
                        ratingSort === key
                          ? "border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--panel-2))]",
                      )}
                      onClick={() => setRatingSort(key)}
                      aria-pressed={ratingSort === key}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
                  Times visited
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "1" as const, label: "1 visit" },
                      { key: "2" as const, label: "2 visits" },
                      { key: "3+" as const, label: "3+ visits" },
                    ] as const
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm transition-colors",
                        selectedVisitBuckets.has(key)
                          ? "border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--panel-2))]",
                      )}
                      onClick={() => toggleVisitBucket(key)}
                      aria-pressed={selectedVisitBuckets.has(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-[rgb(var(--muted-2))]">
                  Leave none selected for any number of visits.
                </p>
              </div>

              {uniqueTags.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
                    Tags
                  </p>
                  <div className="max-h-36 flex flex-wrap gap-2 overflow-y-auto rounded-md border border-[rgb(var(--border))] p-2">
                    {uniqueTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          selectedTags.has(tag)
                          ? "border-[rgb(var(--accent)/0.6)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--accent))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--panel-2))]",
                        )}
                        onClick={() => toggleTag(tag)}
                        aria-pressed={selectedTags.has(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-[rgb(var(--muted-2))]">
                    Trips that include any selected tag. Leave none selected to show all.
                  </p>
                </div>
              )}

              {hasActiveMoreFilters ? (
                <Button type="button" variant="outline" size="sm" onClick={clearMoreFilters}>
                  Clear more filters
                </Button>
              ) : null}
            </div>
          ) : null}

          {showFilterSummary ? (
            <p className="text-xs text-[rgb(var(--muted-2))]">
              Showing {visibleTrips.length} of {sortedTrips.length}
              {favouritesOnly ? " · Favourites only" : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {allTrips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[rgb(var(--border))] px-4 py-6">
          <p className="text-sm text-[rgb(var(--muted))]">No trips have been added yet.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/trips/new">
              <Plus className="h-4 w-4" aria-hidden />
              Add your first trip
            </Link>
          </Button>
        </div>
      ) : visibleTrips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[rgb(var(--border))] px-4 py-10 text-center">
          <p className="text-[rgb(var(--muted-2))]">No trips match your filters.</p>
          <Button type="button" className="mt-4" size="sm" variant="outline" onClick={() => {
            setFavouritesOnly(false);
            clearMoreFilters();
          }}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </ul>
      )}
    </div>
  );
}
