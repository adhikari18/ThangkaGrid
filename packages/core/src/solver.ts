import {
  AnatomicalZone,
  BoundingBox,
  DeityDefinition,
  GeometricPrimitive,
  Point2D,
  SolvedAnchor,
  SolvedGrid,
  SolvedMeasurementLabel,
  SolvedWidthLandmark,
  SolverOverrides,
  TribhangaConfig,
} from './types.js';
import { formatSorYuka, sorAndYukaToSor, sorToTala, sorToYuka, yukaToSor } from './units.js';

const DEFAULT_PIXELS_PER_SOR = 12;

/**
 * Evaluates a cubic Hermite spline interval t in [0, 1] with values (x0, x1) and tangents (m0, m1).
 */
function evalHermite(
  t: number,
  x0: number,
  x1: number,
  m0: number,
  m1: number,
  dy: number
): { x: number; dxdy: number } {
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const x = h00 * x0 + h10 * dy * m0 + h01 * x1 + h11 * dy * m1;

  // Analytic derivative dh/dt divided by dy
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;

  const dxdt = dh00 * x0 + dh10 * dy * m0 + dh01 * x1 + dh11 * dy * m1;
  const dxdy = dy > 1e-6 ? dxdt / dy : 0;

  return { x, dxdy };
}

/**
 * Builds the continuous Tribhanga (triple-bend) spinal evaluator x(ySor) and dx/dy(ySor)
 * across the canonical anatomical knots along the Brahmasutra.
 */
function createTribhangaEvaluator(
  anchorYMap: Record<string, number>,
  tribhanga: TribhangaConfig
): (ySor: number) => { xSor: number; tangentAngleRad: number; normalVector: Point2D } {
  if (!tribhanga.enabled) {
    return () => ({
      xSor: 0,
      tangentAngleRad: 0,
      normalVector: { x: 1, y: 0 },
    });
  }

  const yCrown = anchorYMap['crown_top'] ?? 0;
  const yChin = anchorYMap['chin'] ?? 18;
  const yNeck = anchorYMap['neck_base'] ?? 22;
  const yHeart = anchorYMap['heart'] ?? 34;
  const yNavel = anchorYMap['navel'] ?? 46;
  const ySeat = anchorYMap['throne_top'] ?? 58;
  const yBase = anchorYMap['throne_base'] ?? 70;

  const headTiltRad = (tribhanga.headTiltDeg * Math.PI) / 180;
  const headSlope = Math.tan(headTiltRad);

  // At neck_base, the lateral offset is neckDeflectionSor.
  // The chin and crown follow the head tilt angle upward from neck_base.
  const xNeck = tribhanga.neckDeflectionSor;
  const xChin = xNeck - (yNeck - yChin) * Math.sin(headTiltRad);
  const xCrown = xChin - (yChin - yCrown) * Math.sin(headTiltRad);

  const knots: Array<{ y: number; x: number }> = [
    { y: yCrown, x: xCrown },
    { y: yChin, x: xChin },
    { y: yNeck, x: xNeck },
    { y: yHeart, x: tribhanga.heartDeflectionSor },
    { y: yNavel, x: tribhanga.waistDeflectionSor },
    { y: ySeat, x: tribhanga.hipDeflectionSor },
    { y: yBase, x: 0 },
  ];

  // Compute Catmull-Rom / finite-difference tangents at each knot
  const tangents: number[] = knots.map((k, i) => {
    if (i <= 1) {
      return -headSlope;
    }
    if (i === knots.length - 1) {
      return 0;
    }
    const prev = knots[i - 1];
    const next = knots[i + 1];
    const dy = next.y - prev.y;
    return dy > 1e-6 ? (next.x - prev.x) / dy : 0;
  });

  return (ySor: number) => {
    if (ySor <= knots[0].y) {
      const angle = Math.atan(tangents[0]);
      return {
        xSor: knots[0].x,
        tangentAngleRad: angle,
        normalVector: { x: Math.cos(angle), y: -Math.sin(angle) },
      };
    }

    if (ySor >= knots[knots.length - 1].y) {
      return {
        xSor: 0,
        tangentAngleRad: 0,
        normalVector: { x: 1, y: 0 },
      };
    }

    // Locate segment
    let segIdx = 0;
    for (let i = 0; i < knots.length - 1; i++) {
      if (ySor >= knots[i].y && ySor <= knots[i + 1].y) {
        segIdx = i;
        break;
      }
    }

    const k0 = knots[segIdx];
    const k1 = knots[segIdx + 1];
    const dy = k1.y - k0.y;
    const t = dy > 1e-6 ? (ySor - k0.y) / dy : 0;

    const { x, dxdy } = evalHermite(t, k0.x, k1.x, tangents[segIdx], tangents[segIdx + 1], dy);
    const angle = Math.atan(dxdy);

    return {
      xSor: x,
      tangentAngleRad: angle,
      normalVector: { x: Math.cos(angle), y: -Math.sin(angle) },
    };
  };
}

/**
 * Projects a local lateral offset (offsetSor) perpendicular to an anchor's spine point,
 * plus an optional local vertical offset along the spine tangent.
 */
function projectFromSpine(
  spinePoint: Point2D,
  normalVector: Point2D,
  lateralSor: number,
  verticalSor: number = 0,
  pixelsPerSor: number = DEFAULT_PIXELS_PER_SOR
): Point2D {
  // Tangent vector pointing downward (+y) along the spine
  const tangentVector: Point2D = { x: -normalVector.y, y: normalVector.x };
  return {
    x:
      spinePoint.x +
      (normalVector.x * lateralSor + tangentVector.x * verticalSor) * pixelsPerSor,
    y:
      spinePoint.y +
      (normalVector.y * lateralSor + tangentVector.y * verticalSor) * pixelsPerSor,
  };
}

/**
 * Core Mathematical Solver for ThangkaGrid.
 *
 * Converts declarative Sor-mo & Yuka ratios into a complete, layered 2D coordinate
 * dependency graph and parametric vector primitives (SVG / CAD DXF ready).
 */
export function solveDeityGrid(
  definition: DeityDefinition,
  overrides: SolverOverrides = {}
): SolvedGrid {
  const pixelsPerSor = overrides.pixelsPerSor ?? DEFAULT_PIXELS_PER_SOR;
  const tribhanga: TribhangaConfig = {
    ...definition.tribhanga,
    ...(overrides.tribhanga ?? {}),
  };

  // 1. Solve vertical anchor positions (in Sor-mo from crown_top = 0 downward)
  const anchorYMap: Record<string, number> = {};
  const anchorZoneMap: Record<string, AnatomicalZone> = {};

  let currentYSor = 0;
  definition.verticalSegments.forEach((seg, idx) => {
    if (idx === 0) {
      anchorYMap[seg.topAnchor] = 0;
      anchorZoneMap[seg.topAnchor] = seg.zone;
    }
    const deltaSor = sorAndYukaToSor(seg.sor, seg.yuka);
    currentYSor += deltaSor;
    anchorYMap[seg.bottomAnchor] = currentYSor;
    anchorZoneMap[seg.bottomAnchor] = seg.zone;
  });

  const totalHeightSor = currentYSor;
  const totalHeightYuka = sorToYuka(totalHeightSor);
  const totalHeightTala = sorToTala(totalHeightSor);

  // 2. Build continuous Tribhanga spine evaluator
  const evaluateSpine = createTribhangaEvaluator(anchorYMap, tribhanga);

  // 3. Populate SolvedAnchors
  const anchors: Record<string, SolvedAnchor> = {};
  for (const [id, ySor] of Object.entries(anchorYMap)) {
    const { xSor, tangentAngleRad, normalVector } = evaluateSpine(ySor);
    anchors[id] = {
      id,
      ySor,
      spinePoint: { x: xSor * pixelsPerSor, y: ySor * pixelsPerSor },
      tangentAngleRad,
      normalVector,
      zone: anchorZoneMap[id] ?? 'torso',
    };
  }

  const primitives: GeometricPrimitive[] = [];
  const measurements: SolvedMeasurementLabel[] = [];

  // 4. Sample the central Brahmasutra axis (vertical plumb line + deflected Tribhanga curve)
  const spineSamples: Point2D[] = [];
  const sampleCount = 70;
  for (let i = 0; i <= sampleCount; i++) {
    const ySor = (totalHeightSor * i) / sampleCount;
    const { xSor } = evaluateSpine(ySor);
    spineSamples.push({ x: xSor * pixelsPerSor, y: ySor * pixelsPerSor });
  }

  // Vertical reference plumb line (Tshangs-thig)
  primitives.push({
    kind: 'line',
    id: 'brahmasutra_plumb_axis',
    layer: 'brahmasutra',
    label: 'Brahmasūtra Plumb Axis (Tshangs-thig)',
    from: { x: 0, y: -4 * pixelsPerSor },
    to: { x: 0, y: (totalHeightSor + 4) * pixelsPerSor },
    dashed: tribhanga.enabled,
  });

  if (tribhanga.enabled) {
    primitives.push({
      kind: 'polyline',
      id: 'brahmasutra_tribhanga_spline',
      layer: 'brahmasutra',
      label: 'Deflected Tribhaṅga Spine Axis',
      points: spineSamples,
    });
  }

  // 5. Solve bilateral Horizontal Widths & Horizontal Anatomy Grid lines
  const widths: SolvedWidthLandmark[] = [];
  const widthById: Record<string, SolvedWidthLandmark> = {};

  for (const hw of definition.horizontalWidths) {
    const anchor = anchors[hw.anchor];
    if (!anchor) continue;

    const halfSor = sorAndYukaToSor(hw.halfWidthSor, hw.yuka);
    const rightExtraSor = hw.asymmetricRightOffsetSor ?? 0;

    const leftPoint = projectFromSpine(
      anchor.spinePoint,
      anchor.normalVector,
      -halfSor,
      0,
      pixelsPerSor
    );
    const rightPoint = projectFromSpine(
      anchor.spinePoint,
      anchor.normalVector,
      halfSor + rightExtraSor,
      0,
      pixelsPerSor
    );

    const solvedWidth: SolvedWidthLandmark = {
      id: hw.id,
      anchorId: hw.anchor,
      label: hw.label,
      halfWidthSor: halfSor,
      leftPoint,
      centerPoint: anchor.spinePoint,
      rightPoint,
      category: hw.category,
    };

    widths.push(solvedWidth);
    widthById[hw.id] = solvedWidth;

    primitives.push({
      kind: 'line',
      id: `hgrid_${hw.id}`,
      layer: 'horizontal_grid',
      label: `${hw.label} (${formatSorYuka(halfSor * 2 + rightExtraSor)})`,
      from: leftPoint,
      to: rightPoint,
    });

    // Vertical tick marks at the bilateral ends
    const tickHalf = 0.6;
    primitives.push({
      kind: 'line',
      id: `htick_left_${hw.id}`,
      layer: 'horizontal_grid',
      from: projectFromSpine(anchor.spinePoint, anchor.normalVector, -halfSor, -tickHalf, pixelsPerSor),
      to: projectFromSpine(anchor.spinePoint, anchor.normalVector, -halfSor, tickHalf, pixelsPerSor),
    });
    primitives.push({
      kind: 'line',
      id: `htick_right_${hw.id}`,
      layer: 'horizontal_grid',
      from: projectFromSpine(
        anchor.spinePoint,
        anchor.normalVector,
        halfSor + rightExtraSor,
        -tickHalf,
        pixelsPerSor
      ),
      to: projectFromSpine(
        anchor.spinePoint,
        anchor.normalVector,
        halfSor + rightExtraSor,
        tickHalf,
        pixelsPerSor
      ),
    });
  }

  // Add vertical segment measurement callouts
  for (const seg of definition.verticalSegments) {
    const topA = anchors[seg.topAnchor];
    const botA = anchors[seg.bottomAnchor];
    if (!topA || !botA) continue;
    const segSor = sorAndYukaToSor(seg.sor, seg.yuka);
    const midYSor = (topA.ySor + botA.ySor) / 2;
    const { xSor, normalVector } = evaluateSpine(midYSor);
    const midPoint = { x: xSor * pixelsPerSor, y: midYSor * pixelsPerSor };

    measurements.push({
      id: `measure_${seg.id}`,
      text: `${formatSorYuka(segSor)}`,
      subText: seg.label,
      position: projectFromSpine(midPoint, normalVector, -31, 0, pixelsPerSor),
      sorValue: segSor,
    });
  }

  // 6. Solve Canonical Facial Grid (Ushnisha, Hairline, Urna, Eyes, Nose, Mouth, Chin, Ears)
  const fg = definition.facialGrid;
  const crownTopA = anchors['crown_top'];
  const ushnishaTopA = anchors['ushnisha_top'];
  const hairlineA = anchors[fg.hairlineAnchor];
  const urnaA = anchors[fg.urnaAnchor];
  const noseBaseA = anchors[fg.noseBaseAnchor];
  const chinA = anchors[fg.chinAnchor];

  if (hairlineA && urnaA && noseBaseA && chinA) {
    const faceHalfW = fg.faceHalfWidthSor;
    const earW = fg.earWidthSor;
    const outerEarHalfW = faceHalfW + earW;

    // Facial frame box (12-sor Tala box + 2-sor ear columns on each side)
    const hlLeft = projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, -faceHalfW, 0, pixelsPerSor);
    const hlRight = projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, faceHalfW, 0, pixelsPerSor);
    const chLeft = projectFromSpine(chinA.spinePoint, chinA.normalVector, -faceHalfW, 0, pixelsPerSor);
    const chRight = projectFromSpine(chinA.spinePoint, chinA.normalVector, faceHalfW, 0, pixelsPerSor);

    primitives.push(
      {
        kind: 'line',
        id: 'face_box_left',
        layer: 'facial_grid',
        label: 'Left Facial Boundary (6 Sor)',
        from: hlLeft,
        to: chLeft,
        dashed: true,
      },
      {
        kind: 'line',
        id: 'face_box_right',
        layer: 'facial_grid',
        label: 'Right Facial Boundary (6 Sor)',
        from: hlRight,
        to: chRight,
        dashed: true,
      }
    );

    // Ushnisha dome & Cudamani flame jewel
    if (crownTopA && ushnishaTopA) {
      const ushHalfW = 3.2;
      const ushBaseHalfW = 4.2;
      const uTopL = projectFromSpine(ushnishaTopA.spinePoint, ushnishaTopA.normalVector, -ushHalfW, 0, pixelsPerSor);
      const uTopR = projectFromSpine(ushnishaTopA.spinePoint, ushnishaTopA.normalVector, ushHalfW, 0, pixelsPerSor);
      const uBotL = projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, -ushBaseHalfW, 0, pixelsPerSor);
      const uBotR = projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, ushBaseHalfW, 0, pixelsPerSor);

      primitives.push(
        {
          kind: 'bezier',
          id: 'ushnisha_dome_left',
          layer: 'facial_grid',
          label: 'Uṣṇīṣa Cranial Dome (Left)',
          p0: uBotL,
          p1: projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, -ushBaseHalfW - 0.5, -2.5, pixelsPerSor),
          p2: projectFromSpine(ushnishaTopA.spinePoint, ushnishaTopA.normalVector, -ushHalfW, 0.5, pixelsPerSor),
          p3: ushnishaTopA.spinePoint,
        },
        {
          kind: 'bezier',
          id: 'ushnisha_dome_right',
          layer: 'facial_grid',
          label: 'Uṣṇīṣa Cranial Dome (Right)',
          p0: uBotR,
          p1: projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, ushBaseHalfW + 0.5, -2.5, pixelsPerSor),
          p2: projectFromSpine(ushnishaTopA.spinePoint, ushnishaTopA.normalVector, ushHalfW, 0.5, pixelsPerSor),
          p3: ushnishaTopA.spinePoint,
        },
        // Cudamani jewel flame
        {
          kind: 'bezier',
          id: 'cudamani_jewel_left',
          layer: 'facial_grid',
          label: 'Cūḍāmaṇi Jewel Left Contour',
          p0: uTopL,
          p1: projectFromSpine(ushnishaTopA.spinePoint, ushnishaTopA.normalVector, -1.6, -0.8, pixelsPerSor),
          p2: projectFromSpine(crownTopA.spinePoint, crownTopA.normalVector, -0.8, 0.6, pixelsPerSor),
          p3: crownTopA.spinePoint,
        },
        {
          kind: 'bezier',
          id: 'cudamani_jewel_right',
          layer: 'facial_grid',
          label: 'Cūḍāmaṇi Jewel Right Contour',
          p0: uTopR,
          p1: projectFromSpine(ushnishaTopA.spinePoint, ushnishaTopA.normalVector, 1.6, -0.8, pixelsPerSor),
          p2: projectFromSpine(crownTopA.spinePoint, crownTopA.normalVector, 0.8, 0.6, pixelsPerSor),
          p3: crownTopA.spinePoint,
        }
      );
    }

    // Cranial vault & Facial contour (Sesame/Lotus-Egg contour from hairline -> temples -> jaw -> chin)
    const browL = projectFromSpine(urnaA.spinePoint, urnaA.normalVector, -faceHalfW, 0, pixelsPerSor);
    const browR = projectFromSpine(urnaA.spinePoint, urnaA.normalVector, faceHalfW, 0, pixelsPerSor);
    const jawHalfW = faceHalfW * 0.86;
    const jawL = projectFromSpine(noseBaseA.spinePoint, noseBaseA.normalVector, -jawHalfW, 0, pixelsPerSor);
    const jawR = projectFromSpine(noseBaseA.spinePoint, noseBaseA.normalVector, jawHalfW, 0, pixelsPerSor);
    const chinHalfW = faceHalfW * 0.42;

    primitives.push(
      {
        kind: 'bezier',
        id: 'cranium_upper_left',
        layer: 'facial_grid',
        p0: hairlineA.spinePoint,
        p1: projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, -faceHalfW * 0.6, -0.8, pixelsPerSor),
        p2: projectFromSpine(urnaA.spinePoint, urnaA.normalVector, -faceHalfW, -2.5, pixelsPerSor),
        p3: browL,
      },
      {
        kind: 'bezier',
        id: 'cranium_upper_right',
        layer: 'facial_grid',
        p0: hairlineA.spinePoint,
        p1: projectFromSpine(hairlineA.spinePoint, hairlineA.normalVector, faceHalfW * 0.6, -0.8, pixelsPerSor),
        p2: projectFromSpine(urnaA.spinePoint, urnaA.normalVector, faceHalfW, -2.5, pixelsPerSor),
        p3: browR,
      },
      {
        kind: 'bezier',
        id: 'face_contour_left',
        layer: 'facial_grid',
        label: 'Left Facial Cheek & Chin Contour',
        p0: browL,
        p1: jawL,
        p2: projectFromSpine(chinA.spinePoint, chinA.normalVector, -chinHalfW, -0.4, pixelsPerSor),
        p3: chinA.spinePoint,
      },
      {
        kind: 'bezier',
        id: 'face_contour_right',
        layer: 'facial_grid',
        label: 'Right Facial Cheek & Chin Contour',
        p0: browR,
        p1: jawR,
        p2: projectFromSpine(chinA.spinePoint, chinA.normalVector, chinHalfW, -0.4, pixelsPerSor),
        p3: chinA.spinePoint,
      }
    );

    // Urna (Third Eye / mdzod-spu)
    const urnaRadiusSor = yukaToSor(fg.urnaRadiusYuka);
    primitives.push({
      kind: 'circle',
      id: 'urna_third_eye',
      layer: 'facial_grid',
      label: 'Ūrṇā (mdzod-spu) Curl',
      center: urnaA.spinePoint,
      radius: urnaRadiusSor * pixelsPerSor,
    });

    // Eye Horizontal Axis (typically 2 Sor below Urna)
    const eyeYSor = urnaA.ySor + fg.eyeLineBelowUrnaSor;
    const eyeSpine = evaluateSpine(eyeYSor);
    const eyeCenterPt: Point2D = {
      x: eyeSpine.xSor * pixelsPerSor,
      y: eyeYSor * pixelsPerSor,
    };

    primitives.push({
      kind: 'line',
      id: 'eye_horizontal_axis',
      layer: 'facial_grid',
      label: 'Pupil & Canthus Axis (Mig-thig)',
      from: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, -outerEarHalfW, 0, pixelsPerSor),
      to: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, outerEarHalfW, 0, pixelsPerSor),
      dashed: true,
    });

    // Bilateral Lotus-Petal / Bow-Shaped Eyes & Eyebrows
    const eyeHalfHeightSor = yukaToSor(fg.eyeHeightYuka) / 2;
    for (const side of [-1, 1] as const) {
      const sideName = side === -1 ? 'left' : 'right';
      const innerX = side * fg.eyeInnerHalfSpanSor;
      const outerX = side * (fg.eyeInnerHalfSpanSor + fg.eyeLengthSor);
      const midX = (innerX + outerX) / 2;

      const innerCanthus = projectFromSpine(eyeCenterPt, eyeSpine.normalVector, innerX, 0.1, pixelsPerSor);
      const outerCanthus = projectFromSpine(eyeCenterPt, eyeSpine.normalVector, outerX, -0.15, pixelsPerSor);

      // Upper eyelid
      primitives.push({
        kind: 'bezier',
        id: `eye_upper_lid_${sideName}`,
        layer: 'facial_grid',
        label: `${sideName} Upper Eyelid`,
        p0: innerCanthus,
        p1: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, innerX + side * 1.0, -eyeHalfHeightSor * 1.4, pixelsPerSor),
        p2: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, outerX - side * 1.0, -eyeHalfHeightSor * 1.2, pixelsPerSor),
        p3: outerCanthus,
      });

      // Lower eyelid
      primitives.push({
        kind: 'bezier',
        id: `eye_lower_lid_${sideName}`,
        layer: 'facial_grid',
        label: `${sideName} Lower Eyelid`,
        p0: innerCanthus,
        p1: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, innerX + side * 1.0, eyeHalfHeightSor * 1.2, pixelsPerSor),
        p2: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, outerX - side * 1.0, eyeHalfHeightSor * 1.1, pixelsPerSor),
        p3: outerCanthus,
      });

      // Pupil / Iris circle
      primitives.push({
        kind: 'circle',
        id: `eye_pupil_${sideName}`,
        layer: 'facial_grid',
        center: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, midX, -eyeHalfHeightSor * 0.1, pixelsPerSor),
        radius: Math.max(0.28, eyeHalfHeightSor * 0.85) * pixelsPerSor,
      });

      // Arching Eyebrow (sMin-ma)
      primitives.push({
        kind: 'bezier',
        id: `eyebrow_${sideName}`,
        layer: 'facial_grid',
        label: `${sideName} Eyebrow Arch`,
        p0: projectFromSpine(urnaA.spinePoint, urnaA.normalVector, side * (urnaRadiusSor + 0.35), 0.25, pixelsPerSor),
        p1: projectFromSpine(urnaA.spinePoint, urnaA.normalVector, midX, -0.95, pixelsPerSor),
        p2: projectFromSpine(urnaA.spinePoint, urnaA.normalVector, outerX, -0.35, pixelsPerSor),
        p3: projectFromSpine(eyeCenterPt, eyeSpine.normalVector, outerX + side * 0.35, -0.6, pixelsPerSor),
      });
    }

    // Nose Bridge & Nostril Wings at nose_base
    const noseLeft = projectFromSpine(
      noseBaseA.spinePoint,
      noseBaseA.normalVector,
      -fg.noseHalfWidthSor,
      0,
      pixelsPerSor
    );
    const noseRight = projectFromSpine(
      noseBaseA.spinePoint,
      noseBaseA.normalVector,
      fg.noseHalfWidthSor,
      0,
      pixelsPerSor
    );

    primitives.push(
      {
        kind: 'line',
        id: 'nose_bridge_left',
        layer: 'facial_grid',
        from: projectFromSpine(urnaA.spinePoint, urnaA.normalVector, -0.45, 0.5, pixelsPerSor),
        to: noseLeft,
      },
      {
        kind: 'line',
        id: 'nose_bridge_right',
        layer: 'facial_grid',
        from: projectFromSpine(urnaA.spinePoint, urnaA.normalVector, 0.45, 0.5, pixelsPerSor),
        to: noseRight,
      },
      {
        kind: 'circle',
        id: 'nostril_left',
        layer: 'facial_grid',
        center: projectFromSpine(
          noseBaseA.spinePoint,
          noseBaseA.normalVector,
          -fg.noseHalfWidthSor * 0.65,
          -0.25,
          pixelsPerSor
        ),
        radius: 0.42 * pixelsPerSor,
      },
      {
        kind: 'circle',
        id: 'nostril_right',
        layer: 'facial_grid',
        center: projectFromSpine(
          noseBaseA.spinePoint,
          noseBaseA.normalVector,
          fg.noseHalfWidthSor * 0.65,
          -0.25,
          pixelsPerSor
        ),
        radius: 0.42 * pixelsPerSor,
      }
    );

    // Mouth & Lips (below nose_base)
    const mouthYSor = noseBaseA.ySor + fg.mouthBelowNoseBaseSor;
    const mouthSpine = evaluateSpine(mouthYSor);
    const mouthCenterPt: Point2D = {
      x: mouthSpine.xSor * pixelsPerSor,
      y: mouthYSor * pixelsPerSor,
    };
    const mouthLeft = projectFromSpine(
      mouthCenterPt,
      mouthSpine.normalVector,
      -fg.mouthHalfWidthSor,
      -0.1,
      pixelsPerSor
    );
    const mouthRight = projectFromSpine(
      mouthCenterPt,
      mouthSpine.normalVector,
      fg.mouthHalfWidthSor,
      -0.1,
      pixelsPerSor
    );

    primitives.push(
      {
        kind: 'bezier',
        id: 'mouth_upper_lip',
        layer: 'facial_grid',
        label: 'Upper Lip Bow (mChu-steng)',
        p0: mouthLeft,
        p1: projectFromSpine(mouthCenterPt, mouthSpine.normalVector, -fg.mouthHalfWidthSor * 0.4, -0.65, pixelsPerSor),
        p2: projectFromSpine(mouthCenterPt, mouthSpine.normalVector, fg.mouthHalfWidthSor * 0.4, -0.65, pixelsPerSor),
        p3: mouthRight,
      },
      {
        kind: 'bezier',
        id: 'mouth_lower_lip',
        layer: 'facial_grid',
        label: 'Lower Lip Curve (mChu-og)',
        p0: mouthLeft,
        p1: projectFromSpine(mouthCenterPt, mouthSpine.normalVector, -fg.mouthHalfWidthSor * 0.45, 0.85, pixelsPerSor),
        p2: projectFromSpine(mouthCenterPt, mouthSpine.normalVector, fg.mouthHalfWidthSor * 0.45, 0.85, pixelsPerSor),
        p3: mouthRight,
      }
    );

    // Pendulous Wisdom Ears (rNa-ba) from Urna level down below Chin
    for (const side of [-1, 1] as const) {
      const sideName = side === -1 ? 'left' : 'right';
      const innerEarX = side * faceHalfW;
      const outerEarX = side * outerEarHalfW;

      const earTopInner = projectFromSpine(urnaA.spinePoint, urnaA.normalVector, innerEarX, 0.2, pixelsPerSor);
      const earTopOuter = projectFromSpine(urnaA.spinePoint, urnaA.normalVector, outerEarX, -0.3, pixelsPerSor);
      const earMidOuter = projectFromSpine(noseBaseA.spinePoint, noseBaseA.normalVector, outerEarX, 0, pixelsPerSor);
      const earlobeTip = projectFromSpine(
        chinA.spinePoint,
        chinA.normalVector,
        innerEarX + side * (earW * 0.45),
        fg.earlobeBelowChinSor,
        pixelsPerSor
      );
      const earBotInner = projectFromSpine(
        chinA.spinePoint,
        chinA.normalVector,
        innerEarX * 0.82,
        -0.4,
        pixelsPerSor
      );

      primitives.push(
        {
          kind: 'bezier',
          id: `ear_outer_helix_${sideName}`,
          layer: 'facial_grid',
          label: `${sideName} Ear Helix`,
          p0: earTopInner,
          p1: earTopOuter,
          p2: earMidOuter,
          p3: earlobeTip,
        },
        {
          kind: 'bezier',
          id: `ear_inner_lobe_${sideName}`,
          layer: 'facial_grid',
          label: `${sideName} Pendulous Earlobe`,
          p0: earlobeTip,
          p1: projectFromSpine(
            chinA.spinePoint,
            chinA.normalVector,
            innerEarX * 0.9,
            fg.earlobeBelowChinSor * 0.7,
            pixelsPerSor
          ),
          p2: earBotInner,
          p3: projectFromSpine(noseBaseA.spinePoint, noseBaseA.normalVector, innerEarX * 0.9, 0.5, pixelsPerSor),
        }
      );
    }
  }

  // 7. Solve Karnasutra (Zur-thig) Bilateral Diagonal Construction Lines
  for (const ks of definition.karnasutra) {
    const fromA = anchors[ks.fromAnchor];
    const toA = anchors[ks.toAnchor];
    if (!fromA || !toA) continue;

    // Primary diagonal (+fromOffset -> +toOffset)
    const p1From = projectFromSpine(
      fromA.spinePoint,
      fromA.normalVector,
      ks.fromOffsetSor,
      0,
      pixelsPerSor
    );
    const p1To = projectFromSpine(
      toA.spinePoint,
      toA.normalVector,
      ks.toOffsetSor,
      0,
      pixelsPerSor
    );

    primitives.push({
      kind: 'line',
      id: `karnasutra_${ks.id}_a`,
      layer: 'karnasutra',
      label: ks.label,
      from: p1From,
      to: p1To,
      dashed: true,
    });

    // Symmetric mirrored diagonal (-fromOffset -> -toOffset)
    const p2From = projectFromSpine(
      fromA.spinePoint,
      fromA.normalVector,
      -ks.fromOffsetSor,
      0,
      pixelsPerSor
    );
    const p2To = projectFromSpine(
      toA.spinePoint,
      toA.normalVector,
      -ks.toOffsetSor,
      0,
      pixelsPerSor
    );

    primitives.push({
      kind: 'line',
      id: `karnasutra_${ks.id}_b`,
      layer: 'karnasutra',
      label: `${ks.label} (Mirrored)`,
      from: p2From,
      to: p2To,
      dashed: true,
    });
  }

  // 8. Solve Halos: Sirascakra (Head Nimbus) & Prabhamandala (Body Aureole)
  const sira = definition.halos.sirascakra;
  const siraAnchor = anchors[sira.centerAnchor];
  if (siraAnchor) {
    const siraRadiusSor = overrides.sirascakraRadiusSor ?? sira.radiusSor;
    const siraCenter = projectFromSpine(
      siraAnchor.spinePoint,
      siraAnchor.normalVector,
      0,
      sira.verticalOffsetSor,
      pixelsPerSor
    );
    const outerR = siraRadiusSor * pixelsPerSor;
    const innerR = outerR * sira.innerRingRatio;

    primitives.push(
      {
        kind: 'circle',
        id: 'sirascakra_outer',
        layer: 'halo_arcs',
        label: `Śiraścakra Head Halo (${formatSorYuka(siraRadiusSor)} radius)`,
        center: siraCenter,
        radius: outerR,
      },
      {
        kind: 'circle',
        id: 'sirascakra_inner',
        layer: 'halo_arcs',
        center: siraCenter,
        radius: innerR,
        dashed: true,
      }
    );

    for (let i = 0; i < sira.rayCount; i++) {
      const angle = (2 * Math.PI * i) / sira.rayCount;
      primitives.push({
        kind: 'line',
        id: `sirascakra_ray_${i}`,
        layer: 'halo_arcs',
        from: {
          x: siraCenter.x + Math.cos(angle) * innerR,
          y: siraCenter.y + Math.sin(angle) * innerR,
        },
        to: {
          x: siraCenter.x + Math.cos(angle) * outerR,
          y: siraCenter.y + Math.sin(angle) * outerR,
        },
      });
    }
  }

  const prabha = definition.halos.prabhamandala;
  const prabhaAnchor = anchors[prabha.centerAnchor];
  if (prabhaAnchor) {
    const rxSor = overrides.prabhamandalaRadiusXSor ?? prabha.radiusXSor;
    const rySor = overrides.prabhamandalaRadiusYSor ?? prabha.radiusYSor;
    const prabhaCenter = projectFromSpine(
      prabhaAnchor.spinePoint,
      prabhaAnchor.normalVector,
      0,
      prabha.verticalOffsetSor,
      pixelsPerSor
    );
    const outerRx = rxSor * pixelsPerSor;
    const outerRy = rySor * pixelsPerSor;
    const innerRx = outerRx * prabha.innerRingRatio;
    const innerRy = outerRy * prabha.innerRingRatio;

    primitives.push(
      {
        kind: 'ellipse',
        id: 'prabhamandala_outer',
        layer: 'halo_arcs',
        label: `Prabhāmaṇḍala Body Aureole (${formatSorYuka(rxSor)} × ${formatSorYuka(rySor)})`,
        center: prabhaCenter,
        rx: outerRx,
        ry: outerRy,
      },
      {
        kind: 'ellipse',
        id: 'prabhamandala_inner',
        layer: 'halo_arcs',
        center: prabhaCenter,
        rx: innerRx,
        ry: innerRy,
        dashed: true,
      }
    );

    for (let i = 0; i < prabha.rayCount; i++) {
      const angle = (2 * Math.PI * i) / prabha.rayCount;
      primitives.push({
        kind: 'line',
        id: `prabhamandala_ray_${i}`,
        layer: 'halo_arcs',
        from: {
          x: prabhaCenter.x + Math.cos(angle) * innerRx,
          y: prabhaCenter.y + Math.sin(angle) * innerRy,
        },
        to: {
          x: prabhaCenter.x + Math.cos(angle) * outerRx,
          y: prabhaCenter.y + Math.sin(angle) * outerRy,
        },
      });
    }
  }

  // 9. Solve Anatomical Hull Contours (Shoulders, Torso, Waist, Seated Legs)
  const neckW = widths.find((w) => w.anchorId === 'neck_base' && w.id.includes('neck'));
  const shoulderW = widths.find((w) => w.anchorId === 'neck_base' && w.id.includes('shoulder'));
  const chestW = widths.find((w) => w.anchorId === 'heart' && w.category === 'torso');
  const armW = widths.find((w) => w.anchorId === 'heart' && w.category === 'limbs');
  const waistW = widths.find((w) => w.anchorId === 'navel' && w.category === 'torso');
  const kneeW = widths.find((w) => w.anchorId === 'throne_top' && w.category === 'limbs');

  if (neckW && shoulderW && chestW && waistW && kneeW) {
    // Left and Right Shoulder slopes
    primitives.push(
      {
        kind: 'bezier',
        id: 'hull_shoulder_left',
        layer: 'hull_contours',
        label: 'Left Shoulder Deltoid Curve',
        p0: neckW.leftPoint,
        p1: {
          x: (neckW.leftPoint.x + shoulderW.leftPoint.x) / 2,
          y: neckW.leftPoint.y - 1.2 * pixelsPerSor,
        },
        p2: {
          x: shoulderW.leftPoint.x,
          y: shoulderW.leftPoint.y - 0.8 * pixelsPerSor,
        },
        p3: shoulderW.leftPoint,
      },
      {
        kind: 'bezier',
        id: 'hull_shoulder_right',
        layer: 'hull_contours',
        label: 'Right Shoulder Deltoid Curve',
        p0: neckW.rightPoint,
        p1: {
          x: (neckW.rightPoint.x + shoulderW.rightPoint.x) / 2,
          y: neckW.rightPoint.y - 1.2 * pixelsPerSor,
        },
        p2: {
          x: shoulderW.rightPoint.x,
          y: shoulderW.rightPoint.y - 0.8 * pixelsPerSor,
        },
        p3: shoulderW.rightPoint,
      },
      // Torso ribcage to slender waist
      {
        kind: 'bezier',
        id: 'hull_torso_left',
        layer: 'hull_contours',
        label: 'Left Torso Taper (Heart to Navel)',
        p0: chestW.leftPoint,
        p1: {
          x: chestW.leftPoint.x,
          y: (chestW.leftPoint.y + waistW.leftPoint.y) / 2,
        },
        p2: {
          x: waistW.leftPoint.x,
          y: (chestW.leftPoint.y + waistW.leftPoint.y) / 2,
        },
        p3: waistW.leftPoint,
      },
      {
        kind: 'bezier',
        id: 'hull_torso_right',
        layer: 'hull_contours',
        label: 'Right Torso Taper (Heart to Navel)',
        p0: chestW.rightPoint,
        p1: {
          x: chestW.rightPoint.x,
          y: (chestW.rightPoint.y + waistW.rightPoint.y) / 2,
        },
        p2: {
          x: waistW.rightPoint.x,
          y: (chestW.rightPoint.y + waistW.rightPoint.y) / 2,
        },
        p3: waistW.rightPoint,
      }
    );

    // Outer arm envelope (Shoulder -> Elbow -> Knee/Lap)
    if (armW) {
      primitives.push(
        {
          kind: 'bezier',
          id: 'hull_arm_left',
          layer: 'hull_contours',
          p0: shoulderW.leftPoint,
          p1: {
            x: armW.leftPoint.x + 1.5 * pixelsPerSor,
            y: (shoulderW.leftPoint.y + armW.leftPoint.y) / 2,
          },
          p2: armW.leftPoint,
          p3: {
            x: (armW.leftPoint.x + waistW.leftPoint.x) / 2,
            y: waistW.leftPoint.y,
          },
        },
        {
          kind: 'bezier',
          id: 'hull_arm_right',
          layer: 'hull_contours',
          p0: shoulderW.rightPoint,
          p1: {
            x: armW.rightPoint.x - 1.5 * pixelsPerSor,
            y: (shoulderW.rightPoint.y + armW.rightPoint.y) / 2,
          },
          p2: armW.rightPoint,
          p3: {
            x: (armW.rightPoint.x + waistW.rightPoint.x) / 2,
            y: waistW.rightPoint.y,
          },
        }
      );
    }

    // Hip to Knee Lotus Posture Envelope
    primitives.push(
      {
        kind: 'bezier',
        id: 'hull_leg_left',
        layer: 'hull_contours',
        label: 'Left Knee & Thigh Envelope',
        p0: waistW.leftPoint,
        p1: {
          x: kneeW.leftPoint.x,
          y: waistW.leftPoint.y + 2 * pixelsPerSor,
        },
        p2: {
          x: kneeW.leftPoint.x - 1.5 * pixelsPerSor,
          y: kneeW.leftPoint.y - 1.5 * pixelsPerSor,
        },
        p3: kneeW.leftPoint,
      },
      {
        kind: 'bezier',
        id: 'hull_leg_right',
        layer: 'hull_contours',
        label: 'Right Knee & Thigh Envelope',
        p0: waistW.rightPoint,
        p1: {
          x: kneeW.rightPoint.x,
          y: waistW.rightPoint.y + 2 * pixelsPerSor,
        },
        p2: {
          x: kneeW.rightPoint.x + 1.5 * pixelsPerSor,
          y: kneeW.rightPoint.y - 1.5 * pixelsPerSor,
        },
        p3: kneeW.rightPoint,
      }
    );
  }

  // 10. Solve Padmasana Lotus Throne (Moon Disc & Upper/Lower Lotus Petals)
  const lt = definition.lotusThrone;
  const throneTopA = anchors[lt.topAnchor];
  const throneBaseA = anchors[lt.baseAnchor];

  if (throneTopA && throneBaseA) {
    const topY = throneTopA.spinePoint.y;
    const baseY = throneBaseA.spinePoint.y;
    const midY = topY + (baseY - topY) * 0.52;
    const moonH = lt.moonDiscHeightSor * pixelsPerSor;
    const topHalfPx = lt.topHalfWidthSor * pixelsPerSor;
    const baseHalfPx = lt.baseHalfWidthSor * pixelsPerSor;

    // Moon Disc cushion (Zla-gdan)
    primitives.push({
      kind: 'bezier',
      id: 'throne_moon_disc',
      layer: 'lotus_throne',
      label: 'Lunar Cushion Disc (Zla-gdan)',
      p0: { x: -topHalfPx, y: topY },
      p1: { x: -topHalfPx * 0.6, y: topY - moonH },
      p2: { x: topHalfPx * 0.6, y: topY - moonH },
      p3: { x: topHalfPx, y: topY },
    });

    // Mid-line dividing upper and lower petal tiers
    primitives.push({
      kind: 'line',
      id: 'throne_petal_equator',
      layer: 'lotus_throne',
      from: { x: -topHalfPx * 0.92, y: midY },
      to: { x: topHalfPx * 0.92, y: midY },
      dashed: true,
    });

    // Upper Lotus Petals
    const totalTopWidth = topHalfPx * 2;
    const upperPetalW = totalTopWidth / lt.upperPetalCount;
    for (let i = 0; i < lt.upperPetalCount; i++) {
      const xStart = -topHalfPx + i * upperPetalW;
      const xEnd = xStart + upperPetalW;
      const xMid = (xStart + xEnd) / 2;

      primitives.push(
        {
          kind: 'bezier',
          id: `throne_upper_petal_l_${i}`,
          layer: 'lotus_throne',
          p0: { x: xStart, y: midY },
          p1: { x: xStart + upperPetalW * 0.1, y: topY + (midY - topY) * 0.25 },
          p2: { x: xMid - upperPetalW * 0.15, y: topY + (midY - topY) * 0.1 },
          p3: { x: xMid, y: topY },
        },
        {
          kind: 'bezier',
          id: `throne_upper_petal_r_${i}`,
          layer: 'lotus_throne',
          p0: { x: xMid, y: topY },
          p1: { x: xMid + upperPetalW * 0.15, y: topY + (midY - topY) * 0.1 },
          p2: { x: xEnd - upperPetalW * 0.1, y: topY + (midY - topY) * 0.25 },
          p3: { x: xEnd, y: midY },
        }
      );
    }

    // Lower Lotus Petals
    const totalBaseWidth = baseHalfPx * 2;
    const lowerPetalW = totalBaseWidth / lt.lowerPetalCount;
    for (let i = 0; i < lt.lowerPetalCount; i++) {
      const xStart = -baseHalfPx + i * lowerPetalW;
      const xEnd = xStart + lowerPetalW;
      const xMid = (xStart + xEnd) / 2;

      primitives.push(
        {
          kind: 'bezier',
          id: `throne_lower_petal_l_${i}`,
          layer: 'lotus_throne',
          p0: { x: xStart, y: midY },
          p1: { x: xStart + lowerPetalW * 0.1, y: midY + (baseY - midY) * 0.75 },
          p2: { x: xMid - lowerPetalW * 0.15, y: baseY - (baseY - midY) * 0.08 },
          p3: { x: xMid, y: baseY },
        },
        {
          kind: 'bezier',
          id: `throne_lower_petal_r_${i}`,
          layer: 'lotus_throne',
          p0: { x: xMid, y: baseY },
          p1: { x: xMid + lowerPetalW * 0.15, y: baseY - (baseY - midY) * 0.08 },
          p2: { x: xEnd - lowerPetalW * 0.1, y: midY + (baseY - midY) * 0.75 },
          p3: { x: xEnd, y: midY },
        }
      );
    }
  }

  // 11. Compute overall bounding box
  const bounds: BoundingBox = {
    minX: -40 * pixelsPerSor,
    minY: -16 * pixelsPerSor,
    maxX: 40 * pixelsPerSor,
    maxY: (totalHeightSor + 8) * pixelsPerSor,
    width: 80 * pixelsPerSor,
    height: (totalHeightSor + 24) * pixelsPerSor,
  };

  return {
    deity: {
      ...definition,
      tribhanga,
    },
    pixelsPerSor,
    totalHeightSor,
    totalHeightYuka,
    totalHeightTala,
    anchors,
    widths,
    spineSamples,
    primitives,
    measurements,
    bounds,
  };
}
