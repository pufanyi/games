// Pool is chaotic: a last-bit difference in one collision changes the outcome a
// few collisions later. JavaScript's + - * / and Math.sqrt are exactly
// specified, but Math.exp, sin, cos, pow and hypot may differ between
// browsers, so the simulation uses only the former and the functions here.

/** e^(−x) for x ≥ 0, from arithmetic only. */
export function expNeg(x: number): number {
  if (x > 700) return 0;
  // Halve x until the series converges fast, then square back up.
  let halvings = 0;
  while (x > 0.0625) {
    x *= 0.5;
    halvings++;
  }
  let term = 1;
  let sum = 1;
  for (let i = 1; i <= 10; i++) {
    term *= -x / i;
    sum += term;
  }
  for (; halvings > 0; halvings--) sum *= sum;
  return sum;
}
