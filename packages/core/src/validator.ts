import { DeityDefinition, ValidationIssue, ValidationResult } from './types.js';
import { sorAndYukaToSor } from './units.js';

/**
 * Validates a DeityDefinition object against schema invariants,
 * anchor graph connectivity, and canonical Himalayan Thigse proportions.
 */
export function validateDeityDefinition(def: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!def || typeof def !== 'object') {
    return {
      valid: false,
      issues: [{ path: '$', message: 'Preset must be a non-null JSON object.', severity: 'error' }],
    };
  }

  const d = def as Partial<DeityDefinition>;

  if (d.schemaVersion !== '1.0.0') {
    issues.push({
      path: 'schemaVersion',
      message: `Expected schemaVersion "1.0.0", received "${String(d.schemaVersion)}".`,
      severity: 'error',
    });
  }

  if (!d.id || !/^[a-z0-9_]+$/.test(d.id)) {
    issues.push({
      path: 'id',
      message: 'Preset id must be a non-empty snake_case alphanumeric identifier.',
      severity: 'error',
    });
  }

  if (!d.name || !d.name.english || !d.name.tibetan || !d.name.wylie || !d.name.sanskrit) {
    issues.push({
      path: 'name',
      message: 'Deity name must include english, tibetan, wylie, and sanskrit fields.',
      severity: 'error',
    });
  }

  if (
    !d.unitSystem ||
    d.unitSystem.baseUnit !== 'sor' ||
    d.unitSystem.yukaPerSor !== 8 ||
    d.unitSystem.sorPerTala !== 12
  ) {
    issues.push({
      path: 'unitSystem',
      message: 'unitSystem must define baseUnit="sor", yukaPerSor=8, and sorPerTala=12.',
      severity: 'error',
    });
  }

  if (!Array.isArray(d.verticalSegments) || d.verticalSegments.length < 6) {
    issues.push({
      path: 'verticalSegments',
      message: 'verticalSegments must contain at least 6 ordered vertical intervals.',
      severity: 'error',
    });
    return { valid: false, issues };
  }

  // Check topological chain of verticalSegments and sum total height
  const knownAnchors = new Set<string>();
  let computedTotalSor = 0;

  d.verticalSegments.forEach((seg, idx) => {
    if (idx === 0) {
      knownAnchors.add(seg.topAnchor);
    } else {
      const prevBottom = d.verticalSegments![idx - 1].bottomAnchor;
      if (seg.topAnchor !== prevBottom) {
        issues.push({
          path: `verticalSegments[${idx}].topAnchor`,
          message: `Discontinuous vertical chain: segment "${seg.id}" topAnchor "${seg.topAnchor}" does not match previous bottomAnchor "${prevBottom}".`,
          severity: 'error',
        });
      }
    }
    knownAnchors.add(seg.bottomAnchor);

    if (seg.sor < 0 || seg.yuka < 0 || seg.yuka >= 8) {
      issues.push({
        path: `verticalSegments[${idx}]`,
        message: `Segment "${seg.id}" has invalid sor (${seg.sor}) or yuka (${seg.yuka}); yuka must be in [0, 8).`,
        severity: 'error',
      });
    }

    computedTotalSor += sorAndYukaToSor(seg.sor, seg.yuka);
  });

  if (
    d.unitSystem &&
    Math.abs(computedTotalSor - d.unitSystem.seatedGridHeightSor) > 0.01
  ) {
    issues.push({
      path: 'unitSystem.seatedGridHeightSor',
      message: `Sum of verticalSegments (${computedTotalSor} sor) does not match unitSystem.seatedGridHeightSor (${d.unitSystem.seatedGridHeightSor} sor).`,
      severity: 'warning',
    });
  }

  // Validate horizontalWidths anchor references
  if (!Array.isArray(d.horizontalWidths) || d.horizontalWidths.length < 6) {
    issues.push({
      path: 'horizontalWidths',
      message: 'horizontalWidths must contain at least 6 bilateral measurements.',
      severity: 'error',
    });
  } else {
    d.horizontalWidths.forEach((hw, idx) => {
      if (!knownAnchors.has(hw.anchor)) {
        issues.push({
          path: `horizontalWidths[${idx}].anchor`,
          message: `Horizontal width "${hw.id}" references unknown vertical anchor "${hw.anchor}".`,
          severity: 'error',
        });
      }
    });
  }

  // Validate facialGrid anchor references
  if (!d.facialGrid) {
    issues.push({
      path: 'facialGrid',
      message: 'facialGrid configuration is required.',
      severity: 'error',
    });
  } else {
    const fgAnchors = [
      d.facialGrid.hairlineAnchor,
      d.facialGrid.urnaAnchor,
      d.facialGrid.noseBaseAnchor,
      d.facialGrid.chinAnchor,
    ];
    fgAnchors.forEach((anc) => {
      if (!knownAnchors.has(anc)) {
        issues.push({
          path: 'facialGrid',
          message: `facialGrid references unknown anchor "${anc}".`,
          severity: 'error',
        });
      }
    });
  }

  // Validate halos
  if (d.halos) {
    if (!knownAnchors.has(d.halos.sirascakra.centerAnchor)) {
      issues.push({
        path: 'halos.sirascakra.centerAnchor',
        message: `Sirascakra references unknown anchor "${d.halos.sirascakra.centerAnchor}".`,
        severity: 'error',
      });
    }
    if (!knownAnchors.has(d.halos.prabhamandala.centerAnchor)) {
      issues.push({
        path: 'halos.prabhamandala.centerAnchor',
        message: `Prabhamandala references unknown anchor "${d.halos.prabhamandala.centerAnchor}".`,
        severity: 'error',
      });
    }
  } else {
    issues.push({
      path: 'halos',
      message: 'halos configuration is required.',
      severity: 'error',
    });
  }

  // Validate karnasutra
  if (Array.isArray(d.karnasutra)) {
    d.karnasutra.forEach((ks, idx) => {
      if (!knownAnchors.has(ks.fromAnchor) || !knownAnchors.has(ks.toAnchor)) {
        issues.push({
          path: `karnasutra[${idx}]`,
          message: `Karnasutra "${ks.id}" references unknown anchor(s): "${ks.fromAnchor}" -> "${ks.toAnchor}".`,
          severity: 'error',
        });
      }
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  return { valid: !hasErrors, issues };
}

