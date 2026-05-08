import { Home, List, Plus, Settings, TreePine } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";

import { EditTripOnline } from "@/components/EditTripOnline";
import { HomeOnline } from "@/components/HomeOnline";
import { NewTripOnline } from "@/components/NewTripOnline";
import { SettingsOnline } from "@/components/SettingsOnline";
import { TripDetailOnline } from "@/components/TripDetailOnline";
import { TripsOnline } from "@/components/TripsOnline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const path = location.pathname;
  const tripsTabActive = path.startsWith("/trips") && path !== "/trips/new";
  const addTabActive = path === "/trips/new";

  return (
    <div className="flex min-h-dvh flex-col bg-[rgb(var(--bg))] pt-[env(safe-area-inset-top)] text-[rgb(var(--fg))]">
      <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.95)] px-4 py-3 md:px-6 md:py-4">
        <nav className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-2 font-semibold" to="/">
            <TreePine className="h-7 w-7 shrink-0 text-[rgb(var(--accent))] md:h-8 md:w-8" aria-hidden />
            <span className="truncate">Camp Log</span>
          </Link>

          <div className="flex items-center justify-end gap-2 md:gap-3">
            <div className="hidden flex-wrap items-center justify-end gap-2 md:flex md:gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/">
                  <Home className="h-4 w-4" aria-hidden />
                  Home
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/trips/new">
                  <Plus className="h-4 w-4" aria-hidden />
                  Add trip
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/trips">
                  <List className="h-4 w-4" aria-hidden />
                  Trips
                </Link>
              </Button>
            </div>

            <Link
              to="/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.4)] text-[rgb(var(--muted))] transition-colors hover:bg-[rgb(var(--panel)/0.5)] hover:text-[rgb(var(--fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.4)]"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-6 md:px-6 md:pb-10 md:pt-10">
        {children}
      </main>
      <footer className="mx-auto max-w-3xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-center text-[10px] text-[rgb(var(--muted-2))] md:px-6 md:pb-4">
        Copyright &copy; {new Date().getFullYear()} Camp Log
      </footer>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[rgb(var(--border))] bg-[rgb(var(--bg)/0.95)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Primary navigation"
      >
        <div className="mx-auto flex max-w-lg justify-around">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "flex min-w-[4.5rem] flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
                isActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--muted-2))]",
              )
            }
          >
            <Home className="h-6 w-6" aria-hidden />
            Home
          </NavLink>
          <Link
            to="/trips"
            className={cn(
              "flex min-w-[4.5rem] flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
              tripsTabActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--muted-2))]",
            )}
          >
            <List className="h-6 w-6" aria-hidden />
            Trips
          </Link>
          <Link
            to="/trips/new"
            className={cn(
              "flex min-w-[4.5rem] flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
              addTabActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--muted-2))]",
            )}
          >
            <Plus className="h-6 w-6" aria-hidden />
            Add
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Shell>
            <HomeOnline />
          </Shell>
        }
      />
      <Route
        path="/trips"
        element={
          <Shell>
            <TripsOnline />
          </Shell>
        }
      />
      <Route
        path="/trips/new"
        element={
          <Shell>
            <NewTripOnline />
          </Shell>
        }
      />
      <Route
        path="/trips/:id/edit"
        element={
          <Shell>
            <EditTripOnline />
          </Shell>
        }
      />
      <Route
        path="/trips/:id"
        element={
          <Shell>
            <TripDetailOnline />
          </Shell>
        }
      />
      <Route
        path="/settings"
        element={
          <Shell>
            <SettingsOnline />
          </Shell>
        }
      />
    </Routes>
  );
}
