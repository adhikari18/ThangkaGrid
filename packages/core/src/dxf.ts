import {
  CubicBezierPrimitive,
  DxfExportOptions,
  EllipsePrimitive,
  GridLayerId,
  Point2D,
  SolvedGrid,
} from './types.js';
import { ALL_GRID_LAYERS } from './svg.js';

const DXF_LAYER_COLORS: Record<GridLayerId, number> = {
  brahmasutra: 1, // Red
  horizontal_grid: 8, // Grey
  facial_grid: 2, // Yellow
  karnasutra: 4, // Cyan
  halo_arcs: 30, // Orange/Gold
  hull_contours: 7, // White/Black
  lotus_throne: 6, // Magenta
  measurements: 9,
  landmarks: 1,
};

function dxfCoord(val: number, scale: number): string {
  return (Math.round(val * scale * 1000) / 1000).toFixed(3);
}

function sampleCubicBezier(prim: CubicBezierPrimitive, segments: number): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    const x =
      mt * mt * mt * prim.p0.x +
      3 * mt * mt * t * prim.p1.x +
      3 * mt * t * t * prim.p2.x +
      t * t * t * prim.p3.x;
    const y =
      mt * mt * mt * prim.p0.y +
      3 * mt * mt * t * prim.p1.y +
      3 * mt * t * t * prim.p2.y +
      t * t * t * prim.p3.y;
    pts.push({ x, y });
  }
  return pts;
}

function sampleEllipse(prim: EllipsePrimitive, segments: number): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (2 * Math.PI * i) / segments;
    pts.push({
      x: prim.center.x + Math.cos(theta) * prim.rx,
      y: prim.center.y + Math.sin(theta) * prim.ry,
    });
  }
  return pts;
}

function emitDxfLine(
  out: string[],
  layerName: string,
  p1: Point2D,
  p2: Point2D,
  scale: number
): void {
  // Flip Y axis so CAD +Y points upward
  out.push(
    '0',
    'LINE',
    '8',
    layerName,
    '10',
    dxfCoord(p1.x, scale),
    '20',
    dxfCoord(-p1.y, scale),
    '30',
    '0.0',
    '11',
    dxfCoord(p2.x, scale),
    '21',
    dxfCoord(-p2.y, scale),
    '31',
    '0.0'
  );
}

function emitDxfPolylineSegments(
  out: string[],
  layerName: string,
  points: Point2D[],
  scale: number
): void {
  for (let i = 0; i < points.length - 1; i++) {
    emitDxfLine(out, layerName, points[i], points[i + 1], scale);
  }
}

/**
 * Exports a SolvedGrid into an AutoCAD R12 / AxiDraw pen-plotter compatible ASCII DXF file.
 */
export function exportGridToDxf(
  grid: SolvedGrid,
  options: DxfExportOptions = {}
): string {
  const visibleLayers = new Set<GridLayerId>(options.visibleLayers ?? ALL_GRID_LAYERS);
  const bezierSegments = options.bezierSegments ?? 20;
  const circleSegments = options.circleSegments ?? 64;
  const unitScale = options.unitScale ?? 1.0;

  const out: string[] = [];

  // 1. HEADER SECTION
  out.push(
    '999',
    `ThangkaGrid DXF Export - Deity: ${grid.deity.name.english} (${grid.deity.id})`,
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$ACADVER',
    '1',
    'AC1009',
    '0',
    'ENDSEC'
  );

  // 2. TABLES SECTION (Layers)
  out.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '10');
  for (const layerId of ALL_GRID_LAYERS) {
    if (!visibleLayers.has(layerId)) continue;
    const layerUpper = layerId.toUpperCase();
    const color = DXF_LAYER_COLORS[layerId] ?? 7;
    out.push(
      '0',
      'LAYER',
      '2',
      layerUpper,
      '70',
      '0',
      '62',
      String(color),
      '6',
      'CONTINUOUS'
    );
  }
  out.push('0', 'ENDTAB', '0', 'ENDSEC');

  // 3. ENTITIES SECTION
  out.push('0', 'SECTION', '2', 'ENTITIES');

  for (const prim of grid.primitives) {
    if (!visibleLayers.has(prim.layer)) continue;
    const layerUpper = prim.layer.toUpperCase();

    switch (prim.kind) {
      case 'line':
        emitDxfLine(out, layerUpper, prim.from, prim.to, unitScale);
        break;

      case 'circle':
        out.push(
          '0',
          'CIRCLE',
          '8',
          layerUpper,
          '10',
          dxfCoord(prim.center.x, unitScale),
          '20',
          dxfCoord(-prim.center.y, unitScale),
          '30',
          '0.0',
          '40',
          dxfCoord(prim.radius, unitScale)
        );
        break;

      case 'ellipse': {
        const pts = sampleEllipse(prim, circleSegments);
        emitDxfPolylineSegments(out, layerUpper, pts, unitScale);
        break;
      }

      case 'bezier': {
        const pts = sampleCubicBezier(prim, bezierSegments);
        emitDxfPolylineSegments(out, layerUpper, pts, unitScale);
        break;
      }

      case 'polyline': {
        const pts = prim.closed ? [...prim.points, prim.points[0]] : prim.points;
        emitDxfPolylineSegments(out, layerUpper, pts, unitScale);
        break;
      }
    }
  }

  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\n') + '\n';
}

