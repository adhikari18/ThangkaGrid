/**
 * 5-Point Gauss-Legendre Numerical Arc-Length Integration for Cubic Hermite Splines.
 *
 * Used to parameterize the deflected Tribhaṅga (triple-bend) spine by true Euclidean
 * curve length s (in Sor-mo) rather than vertical projection y.
 */

export const GAUSS_LEGENDRE_5_NODES: readonly [number, number, number, number, number] = [
  -Math.sqrt(5 + 2 * Math.sqrt(10 / 7)) / 3,
  -Math.sqrt(5 - 2 * Math.sqrt(10 / 7)) / 3,
  0,
  Math.sqrt(5 - 2 * Math.sqrt(10 / 7)) / 3,
  Math.sqrt(5 + 2 * Math.sqrt(10 / 7)) / 3,
];

export const GAUSS_LEGENDRE_5_WEIGHTS: readonly [number, number, number, number, number] = [
  (322 - 13 * Math.sqrt(70)) / 900,
  (322 + 13 * Math.sqrt(70)) / 900,
  128 / 225,
  (322 + 13 * Math.sqrt(70)) / 900,
  (322 - 13 * Math.sqrt(70)) / 900,
];

export interface HermiteEvalResult {
  x: number;
  yDelta: number;
  dxdt: number;
  dydt: number;
  speed: number;
  dxdy: number;
}

/**
 * Integrates a scalar function fn(t) over [a, b] using 5-point Gauss-Legendre quadrature
 * (exact for polynomials up to degree 9 on each panel).
 */
export function gaussLegendre5Integrate(
  fn: (t: number) => number,
  a: number,
  b: number,
  panels: number = 1
): number {
  if (Math.abs(b - a) <= 1e-15) {
    return 0;
  }

  const numPanels = Math.max(1, Math.floor(panels));
  const step = (b - a) / numPanels;
  let total = 0;

  for (let p = 0; p < numPanels; p++) {
    const subA = a + p * step;
    const subB = subA + step;
    const halfSpan = 0.5 * (subB - subA);
    const mid = 0.5 * (subA + subB);

    let panelSum = 0;
    for (let i = 0; i < 5; i++) {
      const tau = mid + halfSpan * GAUSS_LEGENDRE_5_NODES[i];
      panelSum += GAUSS_LEGENDRE_5_WEIGHTS[i] * fn(tau);
    }
    total += halfSpan * panelSum;
  }

  return total;
}

/**
 * Evaluates a 2D cubic Hermite spinal segment on t in [0, 1] with lateral endpoints (x0, x1),
 * endpoint slopes dx/dy (m0, m1), and vertical span dy.
 */
export function evalCubicHermiteSegment(
  t: number,
  x0: number,
  x1: number,
  m0: number,
  m1: number,
  dy: number
): HermiteEvalResult {
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const x = h00 * x0 + h10 * dy * m0 + h01 * x1 + h11 * dy * m1;
  const yDelta = t * dy;

  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;

  const dxdt = dh00 * x0 + dh10 * dy * m0 + dh01 * x1 + dh11 * dy * m1;
  const dydt = dy;
  const speed = Math.hypot(dxdt, dydt);
  const dxdy = dy > 1e-9 ? dxdt / dy : 0;

  return { x, yDelta, dxdt, dydt, speed, dxdy };
}

/**
 * Computes the Euclidean arc length of a cubic Hermite spinal segment from t = 0 to t = tEnd
 * using 5-point Gauss-Legendre numerical quadrature.
 */
export function computeHermiteArcLength(
  tEnd: number,
  x0: number,
  x1: number,
  m0: number,
  m1: number,
  dy: number,
  panels: number = 1
): number {
  const clampedT = Math.max(0, Math.min(1, tEnd));
  if (clampedT <= 1e-15) {
    return 0;
  }

  return gaussLegendre5Integrate(
    (tau) => evalCubicHermiteSegment(tau, x0, x1, m0, m1, dy).speed,
    0,
    clampedT,
    panels
  );
}
