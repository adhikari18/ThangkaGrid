/**
 * 5-Point Gauss-Legendre Numerical Arc-Length Integration & Newton-Raphson Inversion
 * for Cubic Hermite Tribhaṅga Splines.
 *
 * Used to parameterize the deflected Tribhaṅga (triple-bend) spine by true Euclidean
 * curve length s (in Sor-mo) rather than vertical projection y, ensuring canonical
 * spinal segments (e.g. 12 Sor-mo thorax, 12 Sor-mo abdomen) preserve exact curve
 * length under extreme lateral sway.
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

export interface ArcLengthSolverOptions {
  tolerance?: number;
  maxIterations?: number;
  panels?: number;
}

export interface SpineKnotSpec {
  sSor: number;
  xSor: number;
  slopeDxDy?: number;
}

export interface ArcLengthSpineSegment {
  index: number;
  sStartSor: number;
  sEndSor: number;
  arcLengthSor: number;
  yStartSor: number;
  yEndSor: number;
  dySor: number;
  x0Sor: number;
  x1Sor: number;
  m0: number;
  m1: number;
}

export interface SpinePointEvaluation {
  sSor: number;
  t: number;
  segmentIndex: number;
  xSor: number;
  ySor: number;
  tangentAngleRad: number;
  normalVector: { x: number; y: number };
}

export interface ArcLengthSpineSpline {
  enabled: boolean;
  totalArcLengthSor: number;
  totalVerticalSpanSor: number;
  segments: ArcLengthSpineSegment[];
  evaluateAtArcLength: (sSor: number) => SpinePointEvaluation;
  measureArcLength: (sStartSor: number, sEndSor: number) => number;
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

/**
 * Computes the Euclidean arc length of a cubic Hermite spinal segment on an arbitrary
 * parameter sub-interval [tStart, tEnd] subset of [0, 1].
 */
export function computeHermiteSubArcLength(
  tStart: number,
  tEnd: number,
  x0: number,
  x1: number,
  m0: number,
  m1: number,
  dy: number,
  panels: number = 1
): number {
  const a = Math.max(0, Math.min(1, Math.min(tStart, tEnd)));
  const b = Math.max(0, Math.min(1, Math.max(tStart, tEnd)));
  if (b - a <= 1e-15) {
    return 0;
  }

  return gaussLegendre5Integrate(
    (tau) => evalCubicHermiteSegment(tau, x0, x1, m0, m1, dy).speed,
    a,
    b,
    panels
  );
}

/**
 * Inverts the arc-length integral s(t) on a cubic Hermite segment via Newton-Raphson
 * iteration (with bracketed bisection safeguard) to find t(s) in [0, 1] such that
 * computeHermiteArcLength(t, x0, x1, m0, m1, dy) === targetArcLengthSor.
 */
export function invertHermiteArcLength(
  targetArcLengthSor: number,
  x0: number,
  x1: number,
  m0: number,
  m1: number,
  dy: number,
  totalArcLengthSor?: number,
  options: ArcLengthSolverOptions = {}
): number {
  const tol = options.tolerance ?? 1e-10;
  const maxIter = options.maxIterations ?? 24;
  const panels = options.panels ?? 1;

  const totalLen =
    totalArcLengthSor ?? computeHermiteArcLength(1, x0, x1, m0, m1, dy, panels);

  if (totalLen <= 1e-12 || targetArcLengthSor <= 0) {
    return 0;
  }
  if (targetArcLengthSor >= totalLen) {
    return 1;
  }

  // Fast path for straight vertical plumb segment
  if (Math.abs(x1 - x0) <= 1e-12 && Math.abs(m0) <= 1e-12 && Math.abs(m1) <= 1e-12) {
    return targetArcLengthSor / totalLen;
  }

  let tLow = 0;
  let tHigh = 1;
  let t = targetArcLengthSor / totalLen;

  for (let iter = 0; iter < maxIter; iter++) {
    const currentS = computeHermiteArcLength(t, x0, x1, m0, m1, dy, panels);
    const residual = currentS - targetArcLengthSor;

    if (Math.abs(residual) <= tol || tHigh - tLow <= 1e-12) {
      return t;
    }

    if (residual < 0) {
      tLow = t;
    } else {
      tHigh = t;
    }

    const { speed } = evalCubicHermiteSegment(t, x0, x1, m0, m1, dy);
    if (speed > 1e-9) {
      const newtonNext = t - residual / speed;
      if (newtonNext > tLow && newtonNext < tHigh) {
        t = newtonNext;
        continue;
      }
    }

    t = 0.5 * (tLow + tHigh);
  }

  return t;
}

/**
 * Solves for the foreshortened vertical span dy in [0, targetArcLengthSor] of a cubic
 * Hermite spinal segment so that its total Euclidean arc length over t in [0, 1] equals
 * targetArcLengthSor. Uses Newton-Raphson root-finding with bisection safeguarding.
 */
export function solveSegmentVerticalSpan(
  targetArcLengthSor: number,
  x0: number,
  x1: number,
  m0: number,
  m1: number,
  options: ArcLengthSolverOptions = {}
): number {
  if (targetArcLengthSor <= 0) {
    return 0;
  }

  const dx = Math.abs(x1 - x0);
  if (dx <= 1e-12 && Math.abs(m0) <= 1e-12 && Math.abs(m1) <= 1e-12) {
    return targetArcLengthSor;
  }

  // At dy = 0, the cubic Hermite curve has monotonic derivative x'(t) = 6t(1-t)(x1 - x0)
  // whose total horizontal variation is |x1 - x0|. If |x1 - x0| >= targetArcLengthSor,
  // vertical foreshortening reaches its geometric limit dy = 0.
  if (dx >= targetArcLengthSor) {
    return 0;
  }

  const tol = options.tolerance ?? 1e-10;
  const maxIter = options.maxIterations ?? 28;
  const panels = options.panels ?? 1;

  let dyLow = 0;
  let dyHigh = targetArcLengthSor;
  let dy = Math.sqrt(Math.max(0, targetArcLengthSor * targetArcLengthSor - dx * dx));

  for (let iter = 0; iter < maxIter; iter++) {
    const currentLen = computeHermiteArcLength(1, x0, x1, m0, m1, dy, panels);
    const residual = currentLen - targetArcLengthSor;

    if (Math.abs(residual) <= tol || dyHigh - dyLow <= 1e-12) {
      return dy;
    }

    if (residual < 0) {
      dyLow = dy;
    } else {
      dyHigh = dy;
    }

    // Analytic derivative dL/d(dy) integrated with 5-point Gauss-Legendre quadrature
    const dLdDy = gaussLegendre5Integrate(
      (tau) => {
        const tau2 = tau * tau;
        const dh10 = 3 * tau2 - 4 * tau + 1;
        const dh11 = 3 * tau2 - 2 * tau;
        const bTau = dh10 * m0 + dh11 * m1;
        const { dxdt, speed } = evalCubicHermiteSegment(tau, x0, x1, m0, m1, dy);
        if (speed <= 1e-12) {
          return 0;
        }
        return (dxdt * bTau + dy) / speed;
      },
      0,
      1,
      panels
    );

    if (dLdDy > 1e-9) {
      const newtonNext = dy - residual / dLdDy;
      if (newtonNext > dyLow && newtonNext < dyHigh) {
        dy = newtonNext;
        continue;
      }
    }

    dy = 0.5 * (dyLow + dyHigh);
  }

  return dy;
}

/**
 * Constructs a C1-continuous, arc-length parameterized piecewise cubic Hermite spine spline
 * from ordered canonical knots (sSor, xSor).
 */
export function buildArcLengthSpineSpline(
  knots: SpineKnotSpec[],
  enabled: boolean = true,
  options: ArcLengthSolverOptions = {}
): ArcLengthSpineSpline {
  const panels = options.panels ?? 1;
  const totalArcLengthSor = knots.length > 0 ? knots[knots.length - 1].sSor - knots[0].sSor : 0;

  if (!enabled || knots.length < 2) {
    const s0 = knots[0]?.sSor ?? 0;
    return {
      enabled: false,
      totalArcLengthSor,
      totalVerticalSpanSor: totalArcLengthSor,
      segments: knots.slice(0, -1).map((k, idx) => {
        const next = knots[idx + 1];
        const len = next.sSor - k.sSor;
        return {
          index: idx,
          sStartSor: k.sSor,
          sEndSor: next.sSor,
          arcLengthSor: len,
          yStartSor: k.sSor,
          yEndSor: next.sSor,
          dySor: len,
          x0Sor: 0,
          x1Sor: 0,
          m0: 0,
          m1: 0,
        };
      }),
      evaluateAtArcLength: (sSor: number): SpinePointEvaluation => ({
        sSor,
        t: totalArcLengthSor > 0 ? Math.max(0, Math.min(1, (sSor - s0) / totalArcLengthSor)) : 0,
        segmentIndex: 0,
        xSor: 0,
        ySor: sSor,
        tangentAngleRad: 0,
        normalVector: { x: 1, y: 0 },
      }),
      measureArcLength: (sStartSor: number, sEndSor: number): number =>
        Math.abs(sEndSor - sStartSor),
    };
  }

  // Compute Catmull-Rom / finite-difference slopes (dx/ds) at knots unless explicitly provided
  const slopes: number[] = knots.map((k, i) => {
    if (k.slopeDxDy !== undefined) {
      return k.slopeDxDy;
    }
    if (i === 0) {
      const next = knots[1];
      const ds = next.sSor - k.sSor;
      return ds > 1e-6 ? (next.xSor - k.xSor) / ds : 0;
    }
    if (i === knots.length - 1) {
      return 0;
    }
    const prev = knots[i - 1];
    const next = knots[i + 1];
    const ds = next.sSor - prev.sSor;
    return ds > 1e-6 ? (next.xSor - prev.xSor) / ds : 0;
  });

  // Build segments and solve foreshortened vertical spans dySor so each segment preserves exact arc length
  const segments: ArcLengthSpineSegment[] = [];
  let currentYSor = knots[0].sSor;

  for (let i = 0; i < knots.length - 1; i++) {
    const k0 = knots[i];
    const k1 = knots[i + 1];
    const segArcLen = k1.sSor - k0.sSor;
    const m0 = slopes[i];
    const m1 = slopes[i + 1];

    // Clamp lateral delta only if physically impossible (> segArcLen)
    const rawDx = k1.xSor - k0.xSor;
    const x0 = k0.xSor;
    const x1 =
      Math.abs(rawDx) > segArcLen
        ? x0 + Math.sign(rawDx) * segArcLen
        : k1.xSor;

    const dySor = solveSegmentVerticalSpan(segArcLen, x0, x1, m0, m1, options);
    const yStartSor = currentYSor;
    const yEndSor = yStartSor + dySor;
    currentYSor = yEndSor;

    segments.push({
      index: i,
      sStartSor: k0.sSor,
      sEndSor: k1.sSor,
      arcLengthSor: segArcLen,
      yStartSor,
      yEndSor,
      dySor,
      x0Sor: x0,
      x1Sor: x1,
      m0,
      m1,
    });
  }

  const totalVerticalSpanSor =
    segments.length > 0 ? segments[segments.length - 1].yEndSor - segments[0].yStartSor : 0;

  const evaluateAtArcLength = (sSor: number): SpinePointEvaluation => {
    const firstSeg = segments[0];
    if (sSor <= firstSeg.sStartSor) {
      const angle = Math.atan(firstSeg.m0);
      const deltaS = sSor - firstSeg.sStartSor;
      return {
        sSor,
        t: 0,
        segmentIndex: 0,
        xSor: firstSeg.x0Sor + deltaS * Math.sin(angle),
        ySor: firstSeg.yStartSor + deltaS * Math.cos(angle),
        tangentAngleRad: angle,
        normalVector: { x: Math.cos(angle), y: -Math.sin(angle) },
      };
    }

    const lastSeg = segments[segments.length - 1];
    if (sSor >= lastSeg.sEndSor) {
      const deltaS = sSor - lastSeg.sEndSor;
      return {
        sSor,
        t: 1,
        segmentIndex: lastSeg.index,
        xSor: lastSeg.x1Sor,
        ySor: lastSeg.yEndSor + deltaS,
        tangentAngleRad: 0,
        normalVector: { x: 1, y: 0 },
      };
    }

    let seg = firstSeg;
    for (let i = 0; i < segments.length; i++) {
      if (sSor >= segments[i].sStartSor && sSor <= segments[i].sEndSor) {
        seg = segments[i];
        break;
      }
    }

    const localS = sSor - seg.sStartSor;
    const t = invertHermiteArcLength(
      localS,
      seg.x0Sor,
      seg.x1Sor,
      seg.m0,
      seg.m1,
      seg.dySor,
      seg.arcLengthSor,
      options
    );

    const { x, yDelta, dxdt, dydt } = evalCubicHermiteSegment(
      t,
      seg.x0Sor,
      seg.x1Sor,
      seg.m0,
      seg.m1,
      seg.dySor
    );

    const angle =
      Math.hypot(dxdt, dydt) > 1e-9
        ? Math.atan2(dxdt, dydt)
        : Math.atan(seg.m0 * (1 - t) + seg.m1 * t);

    return {
      sSor,
      t,
      segmentIndex: seg.index,
      xSor: x,
      ySor: seg.yStartSor + yDelta,
      tangentAngleRad: angle,
      normalVector: { x: Math.cos(angle), y: -Math.sin(angle) },
    };
  };

  const measureArcLength = (sStartSor: number, sEndSor: number): number => {
    const a = Math.min(sStartSor, sEndSor);
    const b = Math.max(sStartSor, sEndSor);
    if (b - a <= 1e-12) {
      return 0;
    }

    let total = 0;
    for (const seg of segments) {
      const overlapStart = Math.max(a, seg.sStartSor);
      const overlapEnd = Math.min(b, seg.sEndSor);
      if (overlapEnd <= overlapStart) {
        continue;
      }

      const tStart = invertHermiteArcLength(
        overlapStart - seg.sStartSor,
        seg.x0Sor,
        seg.x1Sor,
        seg.m0,
        seg.m1,
        seg.dySor,
        seg.arcLengthSor,
        options
      );
      const tEnd = invertHermiteArcLength(
        overlapEnd - seg.sStartSor,
        seg.x0Sor,
        seg.x1Sor,
        seg.m0,
        seg.m1,
        seg.dySor,
        seg.arcLengthSor,
        options
      );

      total += computeHermiteSubArcLength(
        tStart,
        tEnd,
        seg.x0Sor,
        seg.x1Sor,
        seg.m0,
        seg.m1,
        seg.dySor,
        panels
      );
    }

    return total;
  };

  return {
    enabled: true,
    totalArcLengthSor,
    totalVerticalSpanSor,
    segments,
    evaluateAtArcLength,
    measureArcLength,
  };
}
