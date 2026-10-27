"use client";

import dynamic from "next/dynamic";

const ExampleDays = dynamic(() => import("@/components/home/ExampleDays").then((mod) => mod.ExampleDays), {
  loading: () => <section id="beispieltage" className="day-paper beispieltage" aria-hidden="true" />,
});

/** Client island so the example days ship as their own bundle. The default day still renders on the server. */
export function ExampleDaysIsland() {
  return <ExampleDays />;
}
