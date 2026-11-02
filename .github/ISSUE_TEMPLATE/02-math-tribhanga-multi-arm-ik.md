---
name: "[Math / Core] Arc-Length Parameterized Tribhaṅga Spline & Multi-Arm Radial IK Solver"
about: "Implement Gauss-Legendre arc-length parameterization for invariant Sor-mo spinal lengths under extreme Tribhaṅga sway"
title: "feat(core): arc-length parameterized Tribhaṅga spine & radial multi-arm solver (8-arm / 1000-arm)"
labels: ["math", "enhancement"]
---

## Mathematical Problem Statement

Currently, `packages/core/src/solver.ts` evaluates the **Tribhaṅga** (triple-bend) spine as a piecewise cubic Hermite function $x(y)$ parameterized by vertical coordinate $y \in [0, H]$.

When a deity has a pronounced lateral sway (such as dancing *Ḍākinīs* like *Vajrayoginī* or *Kurukullā* where $|\Delta x| > 6\text{ sor}$), parameterizing strictly by $y$ stretches the true Euclidean arc length along the spine:

$$s(y) = \int_0^y \sqrt{1 + \left(\frac{dx}{d\eta}\right)^2}\,d\eta > y$$

In traditional *Thigse* manuals, the `12 Sor-mo` thoracic and abdominal intervals are measured **along the curved spinal chord** rather than along the vertical plumb line, causing the total vertical height of a swaying figure to foreshorten slightly ($\Delta y < 12\text{ sor}$).

## Proposed Solution

1. **5-Point Gauss-Legendre Arc-Length Integrator (`packages/core/src/arcLength.ts`):**
   - Compute arc length $s(t)$ on each cubic Hermite segment and invert $t(s)$ via Newton-Raphson iteration so that an anatomical segment of $L\text{ sor}$ preserves exact arc length $s = L$ along the deflected `Brahmasūtra`.
2. **Radial Multi-Arm Fan Solver (`packages/core/src/limbs.ts`):**
   - Solve shoulder-to-elbow-to-wrist joint chains for multi-armed deities (e.g., 4-armed Chenrezig, 8-armed Uṣṇīṣavijayā, 16-armed Hevajra) constrained by a circular *Prabhāmaṇḍala* wrist locus.

## Acceptance Criteria

- [ ] Arc length between `neck_base` -> `heart` -> `navel` remains invariant at `12.000 ± 0.001 sor` regardless of `heartDeflectionSor` within $[-10, +10]\text{ sor}$.
- [ ] Unit tests verifying arc-length invariance and vertical foreshortening in `packages/core/test/solver.test.ts`.
