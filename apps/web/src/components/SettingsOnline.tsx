import { Check, Palette, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppTheme } from "@/lib/theme";
import { useTheme } from "@/components/ThemeProvider";

const themes: Array<{
  key: AppTheme;
  label: string;
  description: string;
  preview: { bg: string; panel: string; accent: string };
}> = [
  {
    key: "default",
    label: "Default",
    description: "Current look (dark + emerald).",
    preview: { bg: "rgb(2 6 23)", panel: "rgb(15 23 42)", accent: "rgb(52 211 153)" },
  },
  {
    key: "light",
    label: "Light",
    description: "Bright background with the same calm accent.",
    preview: { bg: "rgb(248 250 252)", panel: "rgb(255 255 255)", accent: "rgb(5 150 105)" },
  },
  {
    key: "aurora",
    label: "Aurora",
    description: "Deep navy with a violet accent.",
    preview: { bg: "rgb(3 7 18)", panel: "rgb(17 24 39)", accent: "rgb(167 139 250)" },
  },
];

export function SettingsOnline() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
        <Settings className="h-5 w-5 text-[rgb(var(--accent))]" aria-hidden />
        Settings
      </h1>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-[rgb(var(--muted))]" aria-hidden />
          <h2 className="text-sm font-medium uppercase tracking-wide text-[rgb(var(--muted-2))]">
            Colour scheme
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((t) => {
            const active = t.key === theme;
            return (
              <button
                key={t.key}
                type="button"
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2",
                  "border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.35)] hover:bg-[rgb(var(--panel)/0.5)]",
                  "focus-visible:ring-[rgb(var(--accent)/0.35)]",
                  active && "ring-1 ring-[rgb(var(--accent)/0.6)]",
                )}
                onClick={() => setTheme(t.key)}
                aria-pressed={active}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[rgb(var(--fg))]">{t.label}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted))]">{t.description}</p>
                  </div>
                  {active ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.15)] text-[rgb(var(--accent))]">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border"
                    style={{ background: t.preview.bg, borderColor: "rgba(255,255,255,0.08)" }}
                    aria-hidden
                  />
                  <span
                    className="h-4 w-4 rounded-full border"
                    style={{ background: t.preview.panel, borderColor: "rgba(255,255,255,0.08)" }}
                    aria-hidden
                  />
                  <span
                    className="h-4 w-4 rounded-full border"
                    style={{ background: t.preview.accent, borderColor: "rgba(255,255,255,0.08)" }}
                    aria-hidden
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setTheme("default")}>
            Reset to default
          </Button>
        </div>
      </section>
    </div>
  );
}

