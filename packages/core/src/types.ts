export type DeityClassification = 'buddha_125' | 'peaceful_120' | 'wrathful_96' | 'custom';

export type DeityPosture =
  | 'vajrasana'
  | 'lalitasana'
  | 'pratyalidha'
  | 'samabhanga'
  | 'tribhanga_standing';

export type AnatomicalZone =
  | 'crown'
  | 'face'
  | 'neck'
  | 'torso'
  | 'pelvis'
  | 'legs'
  | 'throne';

export type WidthCategory = 'head' | 'torso' | 'limbs' | 'throne';

export type GridLayerId =
  | 'brahmasutra'
  | 'horizontal_grid'
  | 'facial_grid'
  | 'karnasutra'
  | 'halo_arcs'
  | 'hull_contours'
  | 'lotus_throne'
  | 'measurements'
  | 'landmarks';

export interface DeityName {
  english: string;
  tibetan: string;
  wylie: string;
  sanskrit: string;
  newari?: string;
}

export interface DeityTradition {
  lineage: string;
  sourceText: string;
  authorOrSchool: string;
  notes?: string;
}

export interface UnitSystemConfig {
  baseUnit: 'sor';
  yukaPerSor: 8;
  sorPerTala: 12;
  canonicalStandingSpanSor: number;
  seatedGridHeightSor: number;
}

export interface VerticalSegment {
  id: string;
  topAnchor: string;
  bottomAnchor: string;
  label: string;
  tibetanTerm: string;
  sor: number;
  yuka: number;
  zone: AnatomicalZone;
}

export interface HorizontalWidth {
  id: string;
  anchor: string;
  label: string;
  halfWidthSor: number;
  yuka: number;
  asymmetricRightOffsetSor?: number;
  category: WidthCategory;
}

export interface FacialGridConfig {
  hairlineAnchor: string;
  urnaAnchor: string;
  noseBaseAnchor: string;
  chinAnchor: string;
  faceHalfWidthSor: number;
  earWidthSor: number;
  earlobeBelowChinSor: number;
  eyeLineBelowUrnaSor: number;
  eyeInnerHalfSpanSor: number;
  eyeLengthSor: number;
  eyeHeightYuka: number;
  noseHalfWidthSor: number;
  mouthBelowNoseBaseSor: number;
  mouthHalfWidthSor: number;
  urnaRadiusYuka: number;
}

export interface TribhangaConfig {
  enabled: boolean;
  headTiltDeg: number;
  neckDeflectionSor: number;
  heartDeflectionSor: number;
  waistDeflectionSor: number;
  hipDeflectionSor: number;
}

export interface SirascakraConfig {
  centerAnchor: string;
  verticalOffsetSor: number;
  radiusSor: number;
  innerRingRatio: number;
  rayCount: number;
}

export interface PrabhamandalaConfig {
  centerAnchor: string;
  verticalOffsetSor: number;
  radiusXSor: number;
  radiusYSor: number;
  innerRingRatio: number;
  rayCount: number;
}

export interface HalosConfig {
  sirascakra: SirascakraConfig;
  prabhamandala: PrabhamandalaConfig;
}

export interface KarnasutraSpec {
  id: string;
  label: string;
  fromAnchor: string;
  fromOffsetSor: number;
  toAnchor: string;
  toOffsetSor: number;
}

export interface LotusThroneConfig {
  topAnchor: string;
  baseAnchor: string;
  topHalfWidthSor: number;
  baseHalfWidthSor: number;
  moonDiscHeightSor: number;
  upperPetalCount: number;
  lowerPetalCount: number;
}

export interface DeityDefinition {
  schemaVersion: string;
  id: string;
  name: DeityName;
  classification: DeityClassification;
  tradition: DeityTradition;
  posture: DeityPosture;
  unitSystem: UnitSystemConfig;
  verticalSegments: VerticalSegment[];
  horizontalWidths: HorizontalWidth[];
  facialGrid: FacialGridConfig;
  tribhanga: TribhangaConfig;
  halos: HalosConfig;
  karnasutra: KarnasutraSpec[];
  lotusThrone: LotusThroneConfig;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface SolvedAnchor {
  id: string;
  sSor: number;
  ySor: number;
  spinePoint: Point2D;
  tangentAngleRad: number;
  normalVector: Point2D;
  zone: AnatomicalZone;
}

export interface SolvedWidthLandmark {
  id: string;
  anchorId: string;
  label: string;
  halfWidthSor: number;
  leftPoint: Point2D;
  centerPoint: Point2D;
  rightPoint: Point2D;
  category: WidthCategory;
}

export interface LinePrimitive {
  kind: 'line';
  id: string;
  layer: GridLayerId;
  label?: string;
  from: Point2D;
  to: Point2D;
  dashed?: boolean;
}

export interface CirclePrimitive {
  kind: 'circle';
  id: string;
  layer: GridLayerId;
  label?: string;
  center: Point2D;
  radius: number;
  dashed?: boolean;
}

export interface EllipsePrimitive {
  kind: 'ellipse';
  id: string;
  layer: GridLayerId;
  label?: string;
  center: Point2D;
  rx: number;
  ry: number;
  rotationDeg?: number;
  dashed?: boolean;
}

export interface CubicBezierPrimitive {
  kind: 'bezier';
  id: string;
  layer: GridLayerId;
  label?: string;
  p0: Point2D;
  p1: Point2D;
  p2: Point2D;
  p3: Point2D;
  dashed?: boolean;
}

export interface PolylinePrimitive {
  kind: 'polyline';
  id: string;
  layer: GridLayerId;
  label?: string;
  points: Point2D[];
  closed?: boolean;
  dashed?: boolean;
}

export type GeometricPrimitive =
  | LinePrimitive
  | CirclePrimitive
  | EllipsePrimitive
  | CubicBezierPrimitive
  | PolylinePrimitive;

export interface SolvedMeasurementLabel {
  id: string;
  text: string;
  subText?: string;
  position: Point2D;
  sorValue: number;
}

export interface SolverOverrides {
  tribhanga?: Partial<TribhangaConfig>;
  sirascakraRadiusSor?: number;
  prabhamandalaRadiusXSor?: number;
  prabhamandalaRadiusYSor?: number;
  pixelsPerSor?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface SolvedGrid {
  deity: DeityDefinition;
  pixelsPerSor: number;
  totalHeightSor: number;
  totalVerticalSpanSor: number;
  totalHeightYuka: number;
  totalHeightTala: number;
  anchors: Record<string, SolvedAnchor>;
  widths: SolvedWidthLandmark[];
  spineSamples: Point2D[];
  primitives: GeometricPrimitive[];
  measurements: SolvedMeasurementLabel[];
  bounds: BoundingBox;
}

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export type SvgColorTheme = 'traditional' | 'blueprint' | 'monochrome' | 'dark';

export interface SvgRenderOptions {
  theme?: SvgColorTheme;
  visibleLayers?: GridLayerId[];
  showSubGridYuka?: boolean;
  showTitleCartouche?: boolean;
  strokeWidthScale?: number;
  paddingSor?: number;
}

export interface DxfExportOptions {
  visibleLayers?: GridLayerId[];
  bezierSegments?: number;
  circleSegments?: number;
  unitScale?: number;
}

