export function dimensionToAspectRatio({
  width,
  height,
}: {
  width: number;
  height: number;
}): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}
