"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

function incomingMainReady(root: HTMLElement | null): boolean {
  if (!root) {
    return false;
  }
  const heading = root.querySelector("h1, .v4-start-h1, .v4-chapter-h2");
  return Boolean(heading) && (root.textContent?.length ?? 0) > 160;
}

/**
 * Behält den sichtbaren Seiteninhalt bei Client-Navigation, bis der neue Baum
 * (versteckt gemountet) ein Haupt-Heading hat — kein leerer Viewport-Zwischenzustand.
 */
export function NavigationMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visiblePath, setVisiblePath] = useState(pathname);
  const [frozen, setFrozen] = useState<ReactNode>(children);
  const incomingRef = useRef<HTMLDivElement>(null);
  const latestChildren = useRef(children);
  latestChildren.current = children;

  useEffect(() => {
    if (pathname === visiblePath) {
      setFrozen(children);
    }
  }, [children, pathname, visiblePath]);

  useEffect(() => {
    if (pathname === visiblePath) {
      return;
    }
    let cancelled = false;
    const finish = () => {
      if (cancelled) {
        return;
      }
      setFrozen(latestChildren.current);
      setVisiblePath(pathname);
    };
    const poll = () => {
      if (incomingMainReady(incomingRef.current)) {
        finish();
      }
    };
    poll();
    const id = window.setInterval(poll, 50);
    const cap = window.setTimeout(finish, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(cap);
    };
  }, [pathname, visiblePath]);

  const navigating = pathname !== visiblePath;

  return (
    <div className="nav-main-root">
      {navigating ? <div className="nav-main-frozen">{frozen}</div> : null}
      <div
        ref={incomingRef}
        className={navigating ? "nav-main-incoming" : undefined}
        aria-hidden={navigating ? true : undefined}
      >
        {children}
      </div>
    </div>
  );
}
