/** Nutzbare Plot-Breite: clientWidth minus horizontales Padding (viewBox = diese Breite). */
export function chartShellContentWidth(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const pl = parseFloat(style.paddingLeft) || 0;
  const pr = parseFloat(style.paddingRight) || 0;
  return Math.max(0, Math.floor(el.clientWidth - pl - pr));
}