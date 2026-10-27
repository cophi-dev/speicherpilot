/**
 * The active step is the last one whose top has reached the reading line.
 * A list that has not been laid out (every height is 0) stays on step 0.
 */
export function stepFromLayout(tops: readonly number[], heights: readonly number[], line: number): number {
  if (heights.length === 0 || heights.every((height) => height <= 0)) {
    return 0;
  }
  let active = 0;
  for (let index = 0; index < tops.length; index += 1) {
    if (tops[index] <= line) {
      active = index;
    }
  }
  return active;
}
