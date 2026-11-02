# Contributing to `ThangkaGrid`

Thank you for helping preserve and mathematically formalize sacred Himalayan iconometry (*Tibetan Thangka Thigse* and *Newari Paubha*)! We welcome contributions from **traditional Thangka/Paubha artists**, **art historians**, **computational geometry engineers**, and **frontend CAD developers**.

---

## 1. Contributing a New Deity Preset (`presets/`)

Adding a new canonical deity preset requires only declarative JSON:

1. Copy one of the canonical presets in [`presets/`](./presets/) (e.g., `presets/shakyamuni_seated.json` for `125 Sor-mo` Buddhas, `presets/green_tara.json` for `120 Sor-mo` Bodhisattvas/Goddesses, or `presets/vajrapani_wrathful.json` for `96 Sor-mo` Wrathful protectors).
2. Ensure all vertical intervals (`verticalSegments`) form a continuous anchor chain from `crown_top` down to `throne_base` and use authentic `Sor-mo` and `Yuka` (`1 Sor = 8 Yuka`) ratios.
3. Validate your preset with the CLI:
   ```bash
   npm run cli -- validate presets/your_deity.json
   ```
4. Render a test SVG wireframe:
   ```bash
   npm run cli -- render presets/your_deity.json --format svg --out out/your_deity.svg
   ```
5. Open a Pull Request citing the textual or artistic lineage (e.g., *Menri*, *Karma Gadri*, *Vaiḍūrya dKar-po*, or *Newari Paubha*).

---

## 2. Local Monorepo Development

```bash
# 1. Install workspace dependencies
npm install

# 2. Build all packages (@thangkagrid/core, @thangkagrid/cli, @thangkagrid/visualizer)
npm run build

# 3. Run the Vitest unit test suite
npm test

# 4. Run TypeScript typechecking across all workspaces
npm run typecheck

# 5. Launch the interactive Web CAD Studio at http://localhost:5173
npm run dev
```

---

## 3. Good First Issues

Check out our seeded issue templates in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/) and the engineering milestones in [`ROADMAP.md`](./ROADMAP.md) labeled `good first issue`, `math`, `frontend`, and `heritage`.

---

## License

By contributing to `ThangkaGrid`, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
