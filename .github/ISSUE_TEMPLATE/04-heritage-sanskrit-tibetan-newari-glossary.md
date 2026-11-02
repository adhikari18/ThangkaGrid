---
name: "[Heritage / Docs] Bilingual Sanskrit–Tibetan–Newari Iconometric Glossary & Treatise Citations"
about: "Document canonical anatomical and geometric terminology across Sanskrit, Tibetan (Uchen/Wylie), and Nepal Bhasa"
title: "docs(heritage): compile cross-tradition Sanskrit, Tibetan (Thigse), and Newari (Paubha) iconometric glossary"
labels: ["heritage", "documentation"]
---

## Background

Sacred Himalayan iconometry bridges three classical scholarly languages:
1. **Sanskrit** (*Śilpaśāstra*, *Citralakṣaṇa* of Nagnajit, *Kālacakra Tantra*, *Pratimāmānalakṣaṇa*)
2. **Classical Tibetan** (*Vaiḍūrya dKar-po* by Desi Sangye Gyatso, *Thig-tshad* manuals of the Menri, Karma Gadri, and Khyenri schools)
3. **Classical Nepal Bhasa / Newari** (Kathmandu Valley *Chitrakar* *Paubha* sketchbooks and *Degū* proportional canons)

Currently, every `VerticalSegment` and `HorizontalWidth` in `schemas/deity-definition.schema.json` carries a `tibetanTerm` field, but contributors need an authoritative reference table when authoring new deity presets.

## Deliverables

1. Create `docs/ICONOMETRY_GLOSSARY.md` containing a structured cross-reference table of 40+ anatomical and geometric terms:
   - Units: *Aṅgula* / *Sor-mo* (སོར་མོ་), *Yava* / *Nas* / *Yuka* (ནས་), *Tāla* / *Mtho* (མཐོ་)
   - Grid Lines: *Brahmasūtra* / *Tshangs-thig* (ཚངས་ཐིག་), *Pakṣasūtra* / *Rgyar-thig* (རྒྱར་ཐིག་), *Karṇasūtra* / *Zur-thig* (ཟུར་ཐིག་)
   - Facial & Body Landmarks: *Uṣṇīṣa* / *Gtsug-tor*, *Ūrṇā* / *Mdzod-spu*, *Hṛdaya* / *Thugs-ka*, *Nābhi* / *Lte-ba*, *Padmāsana* / *Padma-gdan*
2. Add optional `sanskritTerm` and `newariTerm` fields to `schemas/deity-definition.schema.json` and `packages/core/src/types.ts`.

## Acceptance Criteria

- [ ] `docs/ICONOMETRY_GLOSSARY.md` includes Unicode Tibetan script, Extended Wylie, IAST Sanskrit, and Newari terms with treatise citations.
- [ ] Schema and TypeScript types remain backward-compatible with existing `v1.0.0` presets.

