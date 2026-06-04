"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const handleTouch = () => {};
    document.body.addEventListener("touchstart", handleTouch, { passive: true });
    return () => {
      document.body.removeEventListener("touchstart", handleTouch);
    };
  }, []);

  return (
    <div key={pathname} className="flex-1 flex flex-col min-h-full page-transition">
      {children}
    </div>
  );
}
