import {
  GeometricPrimitive,
  GridLayerId,
  SolvedGrid,
  SvgColorTheme,
  SvgRenderOptions,
} from './types.js';

interface ThemePalette {
  background: string;
  subGrid: string;
  brahmasutra: string;
  horizontal_grid: string;
  facial_grid: string;
  karnasutra: string;
  halo_arcs: string;
  hull_contours: string;
  lotus_throne: string;
  measurements: string;
  landmarks: string;
  titleText: string;
  subtitleText: string;
}

export const SVG_THEMES: Record<SvgColorTheme, ThemePalette> = {
  traditional: {
    background: '#fbf6ec',
    subGrid: '#e8dec8',
    brahmasutra: '#c83228',
    horizontal_grid: '#8c6239',
    facial_grid: '#9e2a2b',
    karnasutra: '#2b5876',
    halo_arcs: '#b8860b',
    hull_contours: '#1f2937',
    lotus_throne: '#a44a3f',
    measurements: '#5c4033',
    landmarks: '#c83228',
    titleText: '#2c1810',
    subtitleText: '#6b4c35',
  },
  blueprint: {
    background: '#0a192f',
    subGrid: '#112240',
    brahmasutra: '#ff6b6b',
    horizontal_grid: '#4dabf7',
    facial_grid: '#ffd43b',
    karnasutra: '#63e6be',
    halo_arcs: '#748ffc',
    hull_contours: '#e6f1ff',
    lotus_throne: '#f783ac',
    measurements: '#8892b0',
    landmarks: '#ffd43b',
    titleText: '#e6f1ff',
    subtitleText: '#8892b0',
  },
  monochrome: {
    background: '#ffffff',
    subGrid: '#eeeeee',
    brahmasutra: '#111111',
    horizontal_grid: '#555555',
    facial_grid: '#000000',
    karnasutra: '#666666',
    halo_arcs: '#444444',
    hull_contours: '#000000',
    lotus_throne: '#222222',
    measurements: '#333333',
    landmarks: '#000000',
    titleText: '#000000',
    subtitleText: '#444444',
  },
  dark: {
    background: '#0f1117',
    subGrid: '#1c202b',
    brahmasutra: '#f43f5e',
    horizontal_grid: '#64748b',
    facial_grid: '#f59e0b',
    karnasutra: '#06b6d4',
    halo_arcs: '#eab308',
    hull_contours: '#f8fafc',
    lotus_throne: '#ec4899',
    measurements: '#94a3b8',
    landmarks: '#f43f5e',
    titleText: '#f8fafc',
    subtitleText: '#94a3b8',
  },
};

export const ALL_GRID_LAYERS: GridLayerId[] = [
  'halo_arcs',
  'horizontal_grid',
  'karnasutra',
  'lotus_throne',
  'hull_contours',
  'facial_grid',
  'brahmasutra',
  'measurements',
  'landmarks',
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function round(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

function renderPrimitiveSvg(
  prim: GeometricPrimitive,
  color: string,
  strokeScale: number
): string {
  const dashAttr = prim.dashed ? ' stroke-dasharray="4 3"' : '';
  const baseWidth =
    prim.layer === 'brahmasutra'
      ? 1.6
      : prim.layer === 'hull_contours'
        ? 1.5
        : prim.layer === 'facial_grid'
          ? 1.2
          : 0.9;
  const sw = round(baseWidth * strokeScale);

  switch (prim.kind) {
    case 'line':
      return `<line id="${prim.id}" x1="${round(prim.from.x)}" y1="${round(prim.from.y)}" x2="${round(prim.to.x)}" y2="${round(prim.to.y)}" stroke="${color}" stroke-width="${sw}"${dashAttr} />`;

    case 'circle':
      return `<circle id="${prim.id}" cx="${round(prim.center.x)}" cy="${round(prim.center.y)}" r="${round(prim.radius)}" fill="none" stroke="${color}" stroke-width="${sw}"${dashAttr} />`;

    case 'ellipse':
      return `<ellipse id="${prim.id}" cx="${round(prim.center.x)}" cy="${round(prim.center.y)}" rx="${round(prim.rx)}" ry="${round(prim.ry)}" fill="none" stroke="${color}" stroke-width="${sw}"${dashAttr} />`;

    case 'bezier':
      return `<path id="${prim.id}" d="M ${round(prim.p0.x)} ${round(prim.p0.y)} C ${round(prim.p1.x)} ${round(prim.p1.y)}, ${round(prim.p2.x)} ${round(prim.p2.y)}, ${round(prim.p3.x)} ${round(prim.p3.y)}" fill="none" stroke="${color}" stroke-width="${sw}"${dashAttr} />`;

    case 'polyline': {
      const pts = prim.points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
      const tag = prim.closed ? 'polygon' : 'polyline';
      return `<${tag} id="${prim.id}" points="${pts}" fill="none" stroke="${color}" stroke-width="${sw}"${dashAttr} />`;
    }
  }
}

/**
 * Renders a SolvedGrid into a standalone, layered SVG document string.
 */
export function renderGridToSvg(
  grid: SolvedGrid,
  options: SvgRenderOptions = {}
): string {
  const theme = options.theme ?? 'traditional';
  const palette = SVG_THEMES[theme];
  const visibleLayers = new Set<GridLayerId>(options.visibleLayers ?? ALL_GRID_LAYERS);
  const strokeScale = options.strokeWidthScale ?? 1.0;
  const showSubGridYuka = options.showSubGridYuka ?? false;
  const showTitleCartouche = options.showTitleCartouche ?? true;

  const { minX, minY, width, height } = grid.bounds;
  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(minX)} ${round(minY)} ${round(width)} ${round(height)}" width="${round(width)}" height="${round(height)}" data-deity-id="${escapeXml(grid.deity.id)}" data-schema-version="${escapeXml(grid.deity.schemaVersion)}">`
  );

  lines.push(
    `  <rect x="${round(minX)}" y="${round(minY)}" width="${round(width)}" height="${round(height)}" fill="${palette.background}" />`
  );

  // Optional 1-Sor background coordinate lattice & 1-Yuka facial micro-grid
  if (showSubGridYuka) {
    lines.push(`  <g id="layer-subgrid" opacity="0.55">`);
    const stepPx = grid.pixelsPerSor;
    for (let s = -36; s <= 36; s += 2) {
      const x = s * stepPx;
      lines.push(
        `    <line x1="${round(x)}" y1="${round(minY)}" x2="${round(x)}" y2="${round(minY + height)}" stroke="${palette.subGrid}" stroke-width="0.5" />`
      );
    }
    for (let s = -10; s <= grid.totalHeightSor + 4; s += 2) {
      const y = s * stepPx;
      lines.push(
        `    <line x1="${round(minX)}" y1="${round(y)}" x2="${round(minX + width)}" y2="${round(y)}" stroke="${palette.subGrid}" stroke-width="0.5" />`
      );
    }
    lines.push(`  </g>`);
  }

  // Group primitives by layer in canonical painter's order
  const orderedDrawLayers: GridLayerId[] = [
    'halo_arcs',
    'horizontal_grid',
    'karnasutra',
    'lotus_throne',
    'hull_contours',
    'facial_grid',
    'brahmasutra',
  ];

  for (const layerId of orderedDrawLayers) {
    if (!visibleLayers.has(layerId)) continue;
    const layerPrims = grid.primitives.filter((p) => p.layer === layerId);
    if (layerPrims.length === 0) continue;

    const color = palette[layerId];
    lines.push(`  <g id="layer-${layerId}">`);
    for (const prim of layerPrims) {
      lines.push(`    ${renderPrimitiveSvg(prim, color, strokeScale)}`);
    }
    lines.push(`  </g>`);
  }

  // Landmarks layer
  if (visibleLayers.has('landmarks')) {
    lines.push(`  <g id="layer-landmarks">`);
    for (const anchor of Object.values(grid.anchors)) {
      const coordLabel =
        Math.abs(anchor.ySor - anchor.sSor) >= 0.01
          ? `${round(anchor.sSor)}s • y=${round(anchor.ySor)}s`
          : `${round(anchor.sSor)}s`;
      lines.push(
        `    <circle cx="${round(anchor.spinePoint.x)}" cy="${round(anchor.spinePoint.y)}" r="${round(2.6 * strokeScale)}" fill="${palette.landmarks}" />`
      );
      lines.push(
        `    <text x="${round(anchor.spinePoint.x + 6)}" y="${round(anchor.spinePoint.y - 3)}" fill="${palette.landmarks}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="8.5">${escapeXml(anchor.id)} (${coordLabel})</text>`
      );
    }
    lines.push(`  </g>`);
  }

  // Measurements layer
  if (visibleLayers.has('measurements')) {
    lines.push(`  <g id="layer-measurements">`);
    for (const m of grid.measurements) {
      lines.push(
        `    <text x="${round(m.position.x)}" y="${round(m.position.y)}" fill="${palette.measurements}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="9.5" font-weight="600" text-anchor="end">${escapeXml(m.text)}</text>`
      );
      if (m.subText) {
        lines.push(
          `    <text x="${round(m.position.x)}" y="${round(m.position.y + 10)}" fill="${palette.subtitleText}" font-family="system-ui, sans-serif" font-size="7.5" text-anchor="end">${escapeXml(m.subText)}</text>`
        );
      }
    }
    lines.push(`  </g>`);
  }

  // Title Cartouche
  if (showTitleCartouche) {
    const titleY = minY + 26;
    lines.push(`  <g id="layer-cartouche">`);
    lines.push(
      `    <text x="0" y="${round(titleY)}" fill="${palette.titleText}" font-family="Georgia, serif" font-size="16" font-weight="bold" text-anchor="middle">${escapeXml(grid.deity.name.tibetan)}  •  ${escapeXml(grid.deity.name.english)}</text>`
    );
    lines.push(
      `    <text x="0" y="${round(titleY + 16)}" fill="${palette.subtitleText}" font-family="ui-monospace, SFMono-Regular, monospace" font-size="10" text-anchor="middle">${escapeXml(grid.deity.name.sanskrit)} | Class: ${grid.deity.unitSystem.canonicalStandingSpanSor} Sor-mo (${grid.deity.classification}) | Seated Grid: ${grid.totalHeightSor} Sor (${grid.totalHeightYuka} Yuka)</text>`
    );
    lines.push(`  </g>`);
  }

  lines.push(`</svg>`);
  return lines.join('\n');
}

