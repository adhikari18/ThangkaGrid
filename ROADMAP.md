# `ThangkaGrid` Engineering Roadmap (130+ Hours Planned)

This document outlines the multi-milestone engineering roadmap for `ThangkaGrid` beyond the `v0.1.0` core release. Each milestone is decomposed into concrete, testable engineering tasks (3–6 hours each) across computational geometry, declarative schema design, CAD/plotter export, interactive visualization, and Himalayan art-historical preservation.

---

## Milestone 1: Arc-Length Parameterized Kinematics & Multi-Limb Solver (~22 hrs)

- [x] **1.1 Gauss-Legendre Arc-Length Parameterized Tribhaṅga Spline (~5 hrs):**
  - Replace vertical $y$-parameterization with 5-point Gauss-Legendre numerical arc-length integration and Newton-Raphson inversion $t(s)$ so that spinal segments (`12 Sor-mo` thorax, `12 Sor-mo` abdomen) preserve exact Euclidean curve length under extreme *Ḍākinī* / *Wrathful* sway.
- [ ] **1.2 2-Link & 3-Link Planar Inverse Kinematics (IK) for Multi-Armed Deities (~6 hrs):**
  - Implement analytical and FABRIK joint solvers for shoulder → elbow → wrist → mudrā tip chains, supporting 4-armed (*Chenrezig*), 8-armed (*Uṣṇīṣavijayā*, *Mārīcī*), and 1000-armed (*Sahasrabhuja Avalokiteśvara*) radial *Prabhāmaṇḍala* arrays.
- [ ] **1.3 Canonical Standing & Lunging Stance Solvers (`Samabhaṅga`, `Ālīḍha`, `Pratyālīḍha`, `Ardhaparyaṅka`) (~6 hrs):**
  - Extend `packages/core/src/solver.ts` to compute full-length standing leg proportions (`48 Sor-mo` thighs + knees + shins + ankles) and asymmetric warrior lunges (*Vaiḍūrya dKar-po* wrathful stance triangles).
- [ ] **1.4 Parametric *Mudrā* Hand & Foot Sub-Grid Generator (~5 hrs):**
  - Solve canonical `12-Sor` hand/foot sub-grids (*Dhyāna*, *Bhūmisparśa*, *Varada*, *Abhaya*, *Dharmacakra*, *Kataka*, and *Tarjanī* mudrās) with individual phalanx `Yuka` subdivisions.

---

## Milestone 2: Multi-Format CAD, CNC, & Publication Exporters (~18 hrs)

- [ ] **2.1 True Spline & Arc AutoCAD R2000+ DXF Exporter (`SPLINE`, `ARC`, `ELLIPSE`, `TEXT`) (~5 hrs):**
  - Upgrade `packages/core/src/dxf.ts` to emit native degree-3 NURBS `SPLINE` entities, `ARC` primitives, and `TEXT` dimension annotations alongside discretized `LWPOLYLINE` pen-plotter paths.
- [ ] **2.2 AxiDraw & HPGL / G-Code Pen-Plotter Path Optimizer (~5 hrs):**
  - Implement greedy / 2-opt Traveling Salesperson (TSP) stroke ordering and pen-up travel minimization for plotting large-scale pounce (*stong-tshags*) master templates on cotton canvas.
- [ ] **2.3 Multi-Page Tiled Printable PDF & Pounce Stencil Generator (~4 hrs):**
  - Generate registration-marked A4/Letter tiled PDF blueprints at exact physical `1 Sor-mo = N mm` scales so traditional painters can print and assemble life-size Thangka underdrawings.
- [ ] **2.4 Compass-and-Straightedge Geometric Construction Replay (`Step-by-Step Solver`) (~4 hrs):**
  - Emit an ordered sequence of classical *Chalk-Line* (*thig-skud*) and *Dividers* (*cha-tshad*) construction steps showing how each intersection is derived without Cartesian coordinates.

---

## Milestone 3: Interactive Web CAD Studio & Historical Calibration v2 (~24 hrs)

- [ ] **3.1 Two-Point & Multi-Point Homography Calibration for Museum Scans (~6 hrs):**
  - Allow users to drop reference pins (*Ūrṇā*, *Chin*, *Heart*, *Navel*, *Knees*) on a scanned historical Thangka or Newari Paubha to solve least-squares similarity or perspective homography transforms automatically.
- [ ] **3.2 Proportional Deviation Heatmap & Lineage Classifier (~6 hrs):**
  - Compute per-landmark residual errors ($\Delta\text{Sor}$, $\Delta\text{Yuka}$) between a calibrated historical painting and candidate canonical treaties (*Menri* vs. *Karma Gadri* vs. *Khyenri* vs. *Newari Paubha*) to assist art historians in dating and attributing anonymous works.
- [ ] **3.3 Interactive On-Canvas Bezier Knot & Width Handle Dragging (~6 hrs):**
  - Make spine anchors and bilateral width ticks directly draggable on the SVG canvas with live bi-directional updates to the JSON definition and `Sor-mo`/`Yuka` readouts.
- [ ] **3.4 Animated Compass-and-Chalk-Line Pedagogical Player (~6 hrs):**
  - Build a timeline scrubber in `@thangkagrid/visualizer` that animates the traditional sequence of snapping the central *Tshangs-thig*, drawing the *Zur-thig* diagonals, and subdividing the *Tāla* facial grid.

---

## Milestone 4: Three-Dimensional Maṇḍala & Architectural *Thigse* Engine (~20 hrs)

- [ ] **4.1 2D/3D Sacred Maṇḍala Palace (`Pho-brang`) Solver (~8 hrs):**
  - Extend the declarative schema and solver to support concentric square and circular *Maṇḍala* palace floorplans (inner *Bindu*, 8-petal lotus, four T-shaped *Torana* gates, *Vajnyāvalī* rings, and charnel grounds).
- [ ] **4.2 *Stūpa* / *Chörten* Eight-Great-Types (`mChod-rten Cha-brgyad`) Solver (~6 hrs):**
  - Implement canonical *Thigse* solvers for the Eight Great Stūpas of Tibet (*Padmasambhava*, *Bodhi*, *Dharmacakra*, *Kalacakra*, *Nirvāṇa*, etc.) with lion-throne steps, *Bumpa* dome, 13 *Chattrāvalī* wheels, and sun-moon finial.
- [ ] **4.3 Multi-Figure Retinue (`gtso-'khor`) Layout & Hierarchical Scale Composer (~6 hrs):**
  - Support composite Thangka layouts containing a central principal deity (*gtso-bo*) at `125` or `120 Sor-mo` surrounded by lineage gurus above and wrathful protectors below at proportional retinue scales (`1/2`, `1/3`, `1/4` scale).

---

## Milestone 5: Canonical Himalayan Deity Corpus (`presets/`) (~22 hrs)

- [ ] **5.1 Five Dhyāni Buddhas & Supreme Tathāgatas (`125 Sor-mo` Class) (~5 hrs):**
  - Author verified presets for *Vairocana*, *Akṣobhya*, *Ratnasambhava*, *Amitābha*, *Amoghasiddhi*, *Bhaisajyaguru* (Medicine Buddha), and *Vajradhara*.
- [ ] **5.2 Eight Great Bodhisattvas & Female Savioresses (`120 Sor-mo` Class) (~6 hrs):**
  - Author verified presets for *Four-Armed Avalokiteśvara*, *Mañjuśrī*, *Maitreya*, *White Tārā* (Seven-Eyed *Saptalocanā*), *Vajrasattva*, * Sarasvatī*, and *Uṣṇīṣavijayā*.
- [ ] **5.3 Wrathful Yidams, Herukas & Dharmapālas (`96 Sor-mo` & `72 Sor-mo` Classes) (~6 hrs):**
  - Author verified presets for *Six-Armed Mahākāla*, *Yamāntaka Vajrabhairava*, *Cakrasaṃvara*, *Hevajra*, *Vajrakīlaya*, *Palden Lhamo*, and *Ekajaṭī*.
- [ ] **5.4 Kathmandu Valley Newari *Paubha* Treatise Corpus (~5 hrs):**
  - Encode classical Nepal Bhasa *Chitrakar* sketchbook proportions for *Vasudharā*, *Nāmasangīti Mañjuśrī*, *Rato Machindranāth* (*Bungadyah*), and *Caṇḍamahāroṣaṇa*.

---

## Milestone 6: Developer Ecosystem, Schema Tooling & Documentation (~14 hrs)

- [ ] **6.1 Trilingual Sanskrit–Tibetan–Newari Iconometric Encyclopedia (`docs/`) (~5 hrs):**
  - Publish a searchable glossary cross-referencing *Citralakṣaṇa*, *Kālacakra Tantra*, *Vaiḍūrya dKar-po*, and Newari *Pratimāmānalakṣaṇa* terminology with mathematical diagrams.
- [ ] **6.2 Embeddable `<thangka-grid>` Web Component & URL Permalink Sharing (~5 hrs):**
  - Package a zero-dependency Custom Element for embedding interactive *Thigse* wireframes in digital humanities papers, museum catalogs, and documentation sites.
- [ ] **6.3 Visual Regression & Golden SVG/DXF Snapshot Test Suite (~4 hrs):**
  - Add automated geometric invariant and golden vector snapshot tests across all canonical deity presets.

