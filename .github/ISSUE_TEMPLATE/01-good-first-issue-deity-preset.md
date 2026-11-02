---
name: "[Good First Issue] Add Canonical 120-Sor Four-Armed Avalokiteśvara (Chenrezig) Preset"
about: "Author a validated JSON iconometry preset for Ṣaḍakṣarī Lokēśvara / Chenrezig in presets/"
title: "feat(presets): add canonical 120-Sor Four-Armed Avalokiteśvara (Chenrezig) JSON preset"
labels: ["good first issue", "heritage"]
---

## Context & Background

In the Tibetan *Menri* and *Newari Paubha* iconometric traditions (*Vaiḍūrya dKar-po*), **Four-Armed Avalokiteśvara** (*Spyan-ras-gzigs Phyag-bzhi-pa* / *Ṣaḍakṣarī Lokēśvara*) belongs to the **120 Sor-mo** (`10 Tāla`) peaceful Bodhisattva class (`peaceful_120`) seated in *Vajrāsana* without spinal sway (`tribhanga.enabled: false`).

## Task Description

Create a new canonical preset file at `presets/avalokiteshvara_four_armed.json` that conforms to `schemas/deity-definition.schema.json`:

1. **Vertical Segments (`verticalSegments`):**
   - `crown_jewel` (`crown_top` -> `ushnisha_top`): `2 sor` (Amitābha Buddha crown effigy / *rigs-bdag*)
   - `jatamukuta_chignon` (`ushnisha_top` -> `hairline`): `4 sor`
   - `hairline_to_urna`, `urna_to_nose_base`, `nose_base_to_chin`: `4 sor` each (`12 sor` = `1 Tāla` face)
   - `neck`: `4 sor`
   - `neck_to_heart`: `12 sor` (central *Añjali Mudrā* jewel-holding hands at `heart`)
   - `heart_to_navel`: `12 sor`
   - `navel_to_seat`: `12 sor`
   - `lotus_throne`: `12 sor`
2. **Horizontal Widths (`horizontalWidths`):**
   - Include bilateral widths for the inner *Añjali* elbows (`16 sor`) and outer raised *Mālā* / *Padma* elbows (`22 sor`) at the `heart` and `neck_base` anchors.
3. **Validation & Testing:**
   - Register the preset in `packages/core/src/presets.ts`.
   - Run `npm run cli -- validate presets/avalokiteshvara_four_armed.json` and add a unit test in `packages/core/test/solver.test.ts`.

## Acceptance Criteria

- [ ] `presets/avalokiteshvara_four_armed.json` passes `validateDeityDefinition` with zero errors or warnings.
- [ ] `npx thangkagrid render presets/avalokiteshvara_four_armed.json --format svg` outputs a clean wireframe.
