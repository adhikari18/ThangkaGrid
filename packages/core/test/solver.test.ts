import { describe, expect, it } from 'vitest';
import {
  computeHermiteArcLength,
  decomposeSor,
  evalCubicHermiteSegment,
  exportGridToDxf,
  formatSorYuka,
  GAUSS_LEGENDRE_5_NODES,
  GAUSS_LEGENDRE_5_WEIGHTS,
  gaussLegendre5Integrate,
  GREEN_TARA_PRESET,
  renderGridToSvg,
  SHAKYAMUNI_SEATED_PRESET,
  solveDeityGrid,
  sorAndYukaToSor,
  sorToTala,
  sorToYuka,
  VAJRAPANI_WRATHFUL_PRESET,
  validateDeityDefinition,
} from '../src/index.js';

describe('@thangkagrid/core 5-point Gauss-Legendre quadrature & Hermite arc-length', () => {
  it('integrates polynomials up to degree 9 exactly on arbitrary intervals', () => {
    // Sum of weights on [-1, 1] is 2.0, nodes are symmetric around 0
    const weightSum = GAUSS_LEGENDRE_5_WEIGHTS.reduce((acc, w) => acc + w, 0);
    expect(weightSum).toBeCloseTo(2.0, 12);
    expect(GAUSS_LEGENDRE_5_NODES[2]).toBe(0);
    expect(GAUSS_LEGENDRE_5_NODES[0]).toBeCloseTo(-GAUSS_LEGENDRE_5_NODES[4], 12);

    // Integrate f(t) = 10 * t^9 - 6 * t^5 + 3 * t^2 over [0, 2]
    // Antiderivative: t^10 - t^6 + t^3 -> at t=2: 1024 - 64 + 8 = 968
    const polyIntegral = gaussLegendre5Integrate(
      (t) => 10 * Math.pow(t, 9) - 6 * Math.pow(t, 5) + 3 * t * t,
      0,
      2
    );
    expect(polyIntegral).toBeCloseTo(968, 9);
  });

  it('computes exact Euclidean arc length for straight and deflected cubic Hermite segments', () => {
    // 1. Vertical plumb segment (x0 = 0, x1 = 0, m0 = 0, m1 = 0, dy = 12) -> arc length = 12
    expect(computeHermiteArcLength(1.0, 0, 0, 0, 0, 12)).toBeCloseTo(12.0, 10);
    expect(computeHermiteArcLength(0.5, 0, 0, 0, 0, 12)).toBeCloseTo(6.0, 10);

    // 2. Straight inclined line of horizontal span 5 and vertical span 12 (slope m = 5/12) -> hypotenuse = 13
    const slope = 5 / 12;
    expect(computeHermiteArcLength(1.0, 0, 5, slope, slope, 12)).toBeCloseTo(13.0, 10);

    // 3. Deflected S-curve has arc length strictly exceeding vertical span dy
    const curvedLength = computeHermiteArcLength(1.0, -3.5, 1.25, -0.2, 0.25, 12);
    expect(curvedLength).toBeGreaterThan(12.8);

    const midEval = evalCubicHermiteSegment(0.5, -3.5, 1.25, 0, 0, 12);
    expect(midEval.x).toBeCloseTo((-3.5 + 1.25) / 2, 10);
    expect(midEval.yDelta).toBeCloseTo(6.0, 10);
  });
});

describe('@thangkagrid/core unit system (Sor-mo, Yuka, Tāla)', () => {
  it('converts between Sor-mo, Yuka (barley-grains), and Tāla (face-spans)', () => {
    expect(sorAndYukaToSor(5, 4)).toBe(5.5);
    expect(sorToYuka(12)).toBe(96);
    expect(sorToTala(120)).toBe(10);
    expect(formatSorYuka(12)).toBe('12 sor');
    expect(formatSorYuka(5.25)).toBe('5 sor 2 yuka');

    const decomposed = decomposeSor(26.5);
    expect(decomposed).toEqual({
      tala: 2,
      sor: 2,
      yuka: 4,
      wholeSor: 26,
    });
  });
});

describe('@thangkagrid/core preset validator', () => {
  it('validates all canonical presets cleanly with zero errors', () => {
    for (const preset of [
      SHAKYAMUNI_SEATED_PRESET,
      GREEN_TARA_PRESET,
      VAJRAPANI_WRATHFUL_PRESET,
    ]) {
      const result = validateDeityDefinition(preset);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    }
  });

  it('flags broken vertical anchor chains', () => {
    const broken = structuredClone(SHAKYAMUNI_SEATED_PRESET);
    broken.verticalSegments[2].topAnchor = 'non_existent_anchor';
    const result = validateDeityDefinition(broken);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path.includes('verticalSegments[2]'))).toBe(true);
  });
});

describe('@thangkagrid/core iconometric solver', () => {
  it('solves Shakyamuni Buddha (125 Sor-mo class) canonical seated landmarks', () => {
    const solved = solveDeityGrid(SHAKYAMUNI_SEATED_PRESET, { pixelsPerSor: 10 });

    expect(solved.totalHeightSor).toBe(70);
    expect(solved.totalHeightYuka).toBe(560);
    expect(solved.anchors['crown_top'].ySor).toBe(0);
    expect(solved.anchors['ushnisha_top'].ySor).toBe(2);
    expect(solved.anchors['hairline'].ySor).toBe(6);
    expect(solved.anchors['urna'].ySor).toBe(10);
    expect(solved.anchors['nose_base'].ySor).toBe(14);
    expect(solved.anchors['chin'].ySor).toBe(18);
    expect(solved.anchors['neck_base'].ySor).toBe(22);
    expect(solved.anchors['heart'].ySor).toBe(34);
    expect(solved.anchors['navel'].ySor).toBe(46);
    expect(solved.anchors['throne_top'].ySor).toBe(58);
    expect(solved.anchors['throne_base'].ySor).toBe(70);

    // Without Tribhanga sway, the central Brahmasutra remains at X = 0
    expect(solved.anchors['heart'].spinePoint.x).toBeCloseTo(0, 5);
    expect(solved.anchors['urna'].spinePoint.x).toBeCloseTo(0, 5);
  });

  it('applies Tribhanga cubic Hermite spinal deflection and normal rotation for Green Tārā (120 Sor-mo)', () => {
    const solved = solveDeityGrid(GREEN_TARA_PRESET, { pixelsPerSor: 10 });

    expect(solved.deity.tribhanga.enabled).toBe(true);
    // Heart deflects left (-3.5 sor = -35 px), hip counter-sways right (+3.0 sor = +30 px)
    expect(solved.anchors['heart'].spinePoint.x).toBeCloseTo(-35, 3);
    expect(solved.anchors['throne_top'].spinePoint.x).toBeCloseTo(30, 3);

    // Facial axis has a non-zero tangent angle due to headTiltDeg
    expect(Math.abs(solved.anchors['urna'].tangentAngleRad)).toBeGreaterThan(0.05);
  });

  it('renders layered SVG wireframe and exports AxiDraw-compatible DXF', () => {
    const solved = solveDeityGrid(SHAKYAMUNI_SEATED_PRESET);
    const svg = renderGridToSvg(solved, {
      theme: 'traditional',
      showSubGridYuka: true,
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('id="layer-brahmasutra"');
    expect(svg).toContain('id="layer-facial_grid"');
    expect(svg).toContain('id="layer-halo_arcs"');
    expect(svg).toContain('Shakyamuni Buddha');

    const dxf = exportGridToDxf(solved);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('FACIAL_GRID');
    expect(dxf).toContain('HALO_ARCS');
    expect(dxf).toContain('EOF');
  });
});

