"use client";

import { usePathname } from "next/navigation";

const AUTH_PATHS = ["/login", "/register"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.includes(pathname);

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <main className="md:ml-[72px] xl:ml-[244px] min-h-screen pb-16 md:pb-0">
      {children}
    </main>
  );
}
