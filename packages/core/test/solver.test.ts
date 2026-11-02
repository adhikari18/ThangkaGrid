import { describe, expect, it } from 'vitest';
import {
  decomposeSor,
  exportGridToDxf,
  formatSorYuka,
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
