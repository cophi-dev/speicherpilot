/** Synchronous first-paint theme (localStorage / system). Keep tiny — runs in <head> before CSS paint. */
export const THEME_INIT_SCRIPT_ID = "speicherpilot-theme-init";

export const THEME_INIT_SCRIPT = `(() => {
  try {
    const STORAGE = "speicherpilot-theme";
    const LEGACY = "bessforge-theme";
    const root = document.documentElement;
    const stored = localStorage.getItem(STORAGE) ?? localStorage.getItem(LEGACY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved =
      stored === "light" || stored === "dark"
        ? stored
        : stored === "system"
          ? prefersDark
            ? "dark"
            : "light"
          : prefersDark
            ? "dark"
            : "light";
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved === "dark" ? "dark" : "light";
  } catch {
    /* ignore */
  }
})();`;