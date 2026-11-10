import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Clip",
};

export default function ClipLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark" style={{ margin: 0, background: "#0b0d0f", minHeight: "100vh" }}>{children}</div>;
}
