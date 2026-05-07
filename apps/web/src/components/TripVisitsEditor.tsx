import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import type { TripVisit } from "@/lib/local-trips";
import { randomId } from "@/lib/random-id";

const inputClass =
  "w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.35)] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted-2))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent)/0.4)]";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TripVisitsEditor({
  visits,
  onChange,
}: {
  visits: TripVisit[];
  onChange: (next: TripVisit[]) => void;
}) {
  const legendId = useId();

  const addVisit = () => {
    const t = todayIsoDate();
    onChange([
      ...visits,
      { id: randomId(), startDate: t, endDate: t, notes: "" },
    ]);
  };

  const removeVisit = (id: string) => {
    if (visits.length <= 1) return;
    onChange(visits.filter((v) => v.id !== id));
  };

  const patchVisit = (
    id: string,
    patch: Partial<Pick<TripVisit, "startDate" | "endDate" | "notes">>,
  ) => {
    onChange(visits.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  return (
    <div className="space-y-4" aria-labelledby={legendId}>
      <div>
        <span id={legendId} className="mb-2 block text-sm font-medium text-[rgb(var(--muted))]">
          Visits
        </span>
        <p className="text-xs text-[rgb(var(--muted-2))]">
          One row per stay at this place—add another when you go back. Trip notes at the bottom
          describe the spot overall; notes here are optional for a single stay.
        </p>
      </div>

      <div className="space-y-3">
        {visits.map((v, index) => {
          const sid = `${v.id}-start`;
          const eid = `${v.id}-end`;
          const nid = `${v.id}-notes`;
          return (
            <div
              key={v.id}
              className="space-y-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.4)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[rgb(var(--muted))]">Stay {index + 1}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1 text-xs text-[rgb(var(--muted))] disabled:opacity-40"
                  disabled={visits.length <= 1}
                  onClick={() => removeVisit(v.id)}
                  aria-label={`Remove stay ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={sid} className="mb-1 block text-xs text-[rgb(var(--muted-2))]">
                    Start
                  </label>
                  <input
                    id={sid}
                    type="date"
                    required
                    className={inputClass}
                    value={v.startDate}
                    onChange={(e) => patchVisit(v.id, { startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={eid} className="mb-1 block text-xs text-[rgb(var(--muted-2))]">
                    End
                  </label>
                  <input
                    id={eid}
                    type="date"
                    required
                    className={inputClass}
                    value={v.endDate}
                    onChange={(e) => patchVisit(v.id, { endDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={nid} className="mb-1 block text-xs text-[rgb(var(--muted-2))]">
                  Notes for this stay (optional)
                </label>
                <textarea
                  id={nid}
                  className={`${inputClass} min-h-[72px] resize-y text-sm`}
                  value={v.notes}
                  onChange={(e) => patchVisit(v.id, { notes: e.target.value })}
                  placeholder="Weather, site number, etc."
                  maxLength={20_000}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addVisit}
      >
        <Plus className="h-4 w-4" />
        Add another visit
      </Button>
    </div>
  );
}
