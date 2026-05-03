"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Compass,
  Home,
  LogIn,
  LogOut,
  PlusSquare,
  Search,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/upload", icon: PlusSquare, label: "Upload" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("note_share_token"));
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem("note_share_token");
    setIsLoggedIn(false);
    router.push("/login");
  }

  return (
    <>
      {/* ── Desktop / tablet: fixed left sidebar ───────────────────── */}
      <nav className="hidden md:flex fixed inset-y-0 left-0 z-50 flex-col bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 w-[72px] xl:w-[244px] px-3 py-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 mb-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <BookOpen className="w-7 h-7 shrink-0" strokeWidth={1.75} />
          <span className="hidden xl:block text-[22px] font-bold tracking-tight leading-none select-none">
            NoteShare
          </span>
        </Link>

        {/* Nav links */}
        <ul className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                    active
                      ? "font-semibold text-black dark:text-white"
                      : "font-normal text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <Icon
                    className="w-6 h-6 shrink-0"
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  <span className="hidden xl:block text-[15px]">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom actions */}
        <ul className="flex flex-col gap-1">
          {isLoggedIn ? (
            <>
              <li>
                <Link
                  href="/profile"
                  className={`flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                    pathname === "/profile"
                      ? "font-semibold text-black dark:text-white"
                      : "font-normal text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <User
                    className="w-6 h-6 shrink-0"
                    strokeWidth={pathname === "/profile" ? 2.5 : 1.75}
                  />
                  <span className="hidden xl:block text-[15px]">Profile</span>
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal"
                >
                  <LogOut className="w-6 h-6 shrink-0" strokeWidth={1.75} />
                  <span className="hidden xl:block text-[15px]">Log out</span>
                </button>
              </li>
            </>
          ) : (
            <li>
              <Link
                href="/login"
                className="flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-normal"
              >
                <LogIn className="w-6 h-6 shrink-0" strokeWidth={1.75} />
                <span className="hidden xl:block text-[15px]">Log in</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* ── Mobile: fixed bottom bar ────────────────────────────────── */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-1 py-2 safe-area-inset-bottom">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                active
                  ? "text-black dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.75} />
            </Link>
          );
        })}
        <Link
          href={isLoggedIn ? "/profile" : "/login"}
          aria-label={isLoggedIn ? "Profile" : "Log in"}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
            pathname === "/profile" || pathname === "/login"
              ? "text-black dark:text-white"
              : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <User
            className="w-6 h-6"
            strokeWidth={
              pathname === "/profile" || pathname === "/login" ? 2.5 : 1.75
            }
          />
        </Link>
      </nav>
    </>
  );
}
