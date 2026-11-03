import type { ReactNode } from "react";

import { LazyMethodikBody } from "@/components/methodik/LazyMethodikBody";

type MethodikSectionProps = {
  id: string;
  title: ReactNode;
  level?: 2 | 3;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Collapsible methodik block; `id` stays stable for deep links. Body ships only after open (HTML gate). */
export function MethodikSection({ id, title, level = 2, defaultOpen = false, children }: MethodikSectionProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <details id={id} className="methodik-section" open={defaultOpen}>
      <summary className="methodik-section-summary">
        <Heading>{title}</Heading>
      </summary>
      <div className="methodik-section-body">
        <LazyMethodikBody sectionId={id} initialOpen={defaultOpen}>{children}</LazyMethodikBody>
      </div>
    </details>
  );
}
