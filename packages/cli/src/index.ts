#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DeityDefinition,
  exportGridToDxf,
  formatSorYuka,
  getCanonicalPreset,
  listCanonicalPresets,
  renderGridToSvg,
  solveDeityGrid,
  SvgColorTheme,
  validateDeityDefinition,
} from '@thangkagrid/core';

function printHelp(): void {
  console.log(`
ThangkaGrid CLI v0.1.0 — Parametric Himalayan Iconometry Engine (Thigse & Paubha)

Usage:
  thangkagrid render <preset-file-or-id> [--format svg|dxf] [--theme traditional|blueprint|monochrome|dark] [--out <file>]
  thangkagrid validate <preset-file-or-id>
  thangkagrid inspect <preset-file-or-id>
  thangkagrid presets

Examples:
  npx thangkagrid render presets/shakyamuni_seated.json --format svg --out shakyamuni.svg
  npx thangkagrid render presets/green_tara.json --format dxf --out green_tara.dxf
  npx thangkagrid validate presets/shakyamuni_seated.json
  npx thangkagrid inspect green_tara
`);
}

function loadPresetInput(target: string): DeityDefinition {
  const builtin = getCanonicalPreset(target);
  if (builtin) {
    return builtin;
  }

  const resolvedPath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `Preset not found: "${target}" (checked built-in IDs and file path ${resolvedPath})`
    );
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  return JSON.parse(raw) as DeityDefinition;
}

function parseFlag(args: string[], flag: string, defaultVal?: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultVal;
}

export function runCli(argv: string[]): number {
  const args = argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp();
    return 0;
  }

  try {
    if (command === 'presets') {
      const presets = listCanonicalPresets();
      console.log('Built-in Canonical Himalayan Deity Presets:\n');
      for (const p of presets) {
        console.log(
          `  • ${p.id.padEnd(20)} | ${p.name.english.padEnd(38)} | ${p.unitSystem.canonicalStandingSpanSor} Sor-mo (${p.classification}) | Sway: ${p.tribhanga.enabled ? 'Tribhaṅga' : 'Plumb'}`
        );
      }
      return 0;
    }

    if (command === 'validate') {
      const target = args[1];
      if (!target) {
        console.error('Error: Please provide a preset JSON path or preset ID to validate.');
        return 1;
      }
      const def = loadPresetInput(target);
      const res = validateDeityDefinition(def);
      if (res.valid) {
        console.log(
          `✓ Valid ThangkaGrid definition: ${def.name.english} (${def.id}) — ${def.unitSystem.canonicalStandingSpanSor} Sor-mo class, ${def.unitSystem.seatedGridHeightSor} Sor-mo seated grid.`
        );
        return 0;
      } else {
        console.error(`✗ Validation failed for "${target}":`);
        for (const issue of res.issues) {
          console.error(`  [${issue.severity.toUpperCase()}] ${issue.path}: ${issue.message}`);
        }
        return 1;
      }
    }

    if (command === 'inspect') {
      const target = args[1];
      if (!target) {
        console.error('Error: Please provide a preset JSON path or preset ID to inspect.');
        return 1;
      }
      const def = loadPresetInput(target);
      const grid = solveDeityGrid(def);

      console.log(`====================================================================`);
      console.log(`${def.name.tibetan}  •  ${def.name.english}`);
      console.log(`Sanskrit: ${def.name.sanskrit} | Lineage: ${def.tradition.lineage}`);
      console.log(`Class:    ${def.classification} (${def.unitSystem.canonicalStandingSpanSor} Sor-mo) | Posture: ${def.posture}`);
      console.log(`Grid:     ${grid.totalHeightSor} Sor-mo (${grid.totalHeightYuka} Yuka / ${grid.totalHeightTala.toFixed(2)} Tāla)`);
      console.log(`====================================================================\n`);
      console.log(`Vertical Segments (Brahmasūtra Intervals):`);
      for (const seg of def.verticalSegments) {
        const anchorBottom = grid.anchors[seg.bottomAnchor];
        console.log(
          `  [${seg.topAnchor} -> ${seg.bottomAnchor.padEnd(12)}] ${formatSorYuka(seg.sor + seg.yuka / 8).padEnd(14)} | Y=${anchorBottom.ySor.toString().padStart(2)}s | ${seg.label} (${seg.tibetanTerm})`
        );
      }
      console.log(`\nSolved Primitives: ${grid.primitives.length} vector entities across ${Object.keys(grid.anchors).length} anatomical anchors.`);
      return 0;
    }

    if (command === 'render') {
      const target = args[1];
      if (!target) {
        console.error('Error: Please provide a preset JSON path or preset ID to render.');
        return 1;
      }
      const format = (parseFlag(args, '--format', 'svg') ?? 'svg').toLowerCase();
      const theme = (parseFlag(args, '--theme', 'traditional') ?? 'traditional') as SvgColorTheme;
      const outPath = parseFlag(args, '--out');

      const def = loadPresetInput(target);
      const val = validateDeityDefinition(def);
      if (!val.valid) {
        console.error(`Error: Cannot render invalid preset "${target}".`);
        for (const issue of val.issues) {
          console.error(`  [${issue.severity}] ${issue.path}: ${issue.message}`);
        }
        return 1;
      }

      const grid = solveDeityGrid(def);
      let outputContent = '';

      if (format === 'svg') {
        outputContent = renderGridToSvg(grid, {
          theme,
          showSubGridYuka: args.includes('--subgrid'),
        });
      } else if (format === 'dxf') {
        outputContent = exportGridToDxf(grid);
      } else {
        console.error(`Error: Unsupported --format "${format}". Expected "svg" or "dxf".`);
        return 1;
      }

      if (outPath) {
        const absOut = path.resolve(process.cwd(), outPath);
        fs.mkdirSync(path.dirname(absOut), { recursive: true });
        fs.writeFileSync(absOut, outputContent, 'utf-8');
        console.log(
          `✓ Rendered ${def.name.english} (${format.toUpperCase()}) -> ${absOut} (${grid.primitives.length} vector entities)`
        );
      } else {
        process.stdout.write(outputContent);
      }
      return 0;
    }

    console.error(`Unknown command: "${command}"`);
    printHelp();
    return 1;
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runCli(process.argv);
}
