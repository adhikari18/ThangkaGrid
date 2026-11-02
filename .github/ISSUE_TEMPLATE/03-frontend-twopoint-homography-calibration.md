---
name: "[Frontend / Visualizer] Two-Point Landmark Homography Calibration & Residual Error Heatmap"
about: "Allow users to click two anatomical landmarks on a scanned Thangka to auto-align and measure Sor-mo deviations"
title: "feat(visualizer): interactive 2-point landmark pin calibration & historical Thangka deviation overlay"
labels: ["frontend", "good first issue"]
---

## Feature Overview

In `packages/visualizer/src/App.tsx`, users can currently upload a historical Thangka or Newari Paubha painting and align it manually using scale, X/Y offset, and rotation sliders.

To make **ThangkaGrid** a rigorous research tool for art historians and conservators, we want a **Two-Point Pin Calibration mode** that automatically computes the similarity transform (translation, uniform scale, and rotation) from two clicked landmarks.

## Task Breakdown

1. **Interactive Calibration Pins:**
   - Add a `"2-Point Pin Calibrate"` button in the **Historical Thangka Overlay** panel.
   - Prompt the user to click **Pin 1** on the uploaded image's *Ūrṇā* (`urna` anchor, $y = 10\text{ sor}$) and **Pin 2** on the *Navel* (`navel` anchor, $y = 46\text{ sor}$) or *Chin* (`chin` anchor, $y = 18\text{ sor}$).
2. **Similarity Transform Solver:**
   - Given image pixel coordinates $\mathbf{p}_1, \mathbf{p}_2$ and solved grid coordinates $\mathbf{q}_1, \mathbf{q}_2$, compute:
     - Scale: $s = \|\mathbf{q}_2 - \mathbf{q}_1\| / \|\mathbf{p}_2 - \mathbf{p}_1\|$
     - Rotation: $\theta = \text{atan2}(\Delta q_y, \Delta q_x) - \text{atan2}(\Delta p_y, \Delta p_x)$
     - Translation: $\mathbf{t} = \mathbf{q}_1 - s\,\mathbf{R}(\theta)\mathbf{p}_1$
3. **Proportional Deviation Readout:**
   - Allow users to drop inspection pins on the painting's shoulders, knees, or halo rim and display the residual difference in `Sor-mo` and `Yuka` against the canonical preset.

## Acceptance Criteria

- [ ] Clicking two reference points on an uploaded image snaps the overlay to the solved `urna` and `chin`/`navel` anchors automatically.
- [ ] Computed scale, offset, and rotation values sync back to the calibration sliders.

