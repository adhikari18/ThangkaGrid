import React, { useMemo, useRef, useState } from 'react';
import {
  ALL_GRID_LAYERS,
  CANONICAL_PRESETS,
  decomposeSor,
  exportGridToDxf,
  formatSorYuka,
  GridLayerId,
  renderGridToSvg,
  solveDeityGrid,
  SVG_THEMES,
  SvgColorTheme,
  TribhangaConfig,
} from '@thangkagrid/core';

const LAYER_META: Array<{ id: GridLayerId; label: string; tibetan: string }> = [
  { id: 'brahmasutra', label: 'Brahmasūtra Central Axis', tibetan: 'tshangs-thig' },
  { id: 'facial_grid', label: 'Canonical Facial Tāla Grid', tibetan: 'zhal-gyi thig' },
  { id: 'horizontal_grid', label: 'Horizontal Anatomy Lines', tibetan: 'rgyar-thig' },
  { id: 'karnasutra', label: 'Karṇasūtra Diagonals', tibetan: 'zur-thig' },
  { id: 'halo_arcs', label: 'Halo & Aureole Arcs', tibetan: "dbu-kor & 'od-kor" },
  { id: 'hull_contours', label: 'Anatomical Hull Contours', tibetan: 'sku-gzugs' },
  { id: 'lotus_throne', label: 'Padmāsana Lotus Throne', tibetan: 'padma-gdan' },
  { id: 'measurements', label: 'Sor-mo Dimension Callouts', tibetan: 'sor-tshad' },
  { id: 'landmarks', label: 'Spine Anchor Nodes', tibetan: 'gnas-thig' },
];

export function App() {
  const [presetId, setPresetId] = useState<string>('shakyamuni_seated');
  const [theme, setTheme] = useState<SvgColorTheme>('traditional');
  const [visibleLayers, setVisibleLayers] = useState<GridLayerId[]>(ALL_GRID_LAYERS);
  const [showSubGrid, setShowSubGrid] = useState<boolean>(true);

  const activePreset = CANONICAL_PRESETS[presetId] ?? CANONICAL_PRESETS.shakyamuni_seated;

  // Dynamic Tribhanga & Halo state initialized from preset
  const [tribhanga, setTribhanga] = useState<TribhangaConfig>(activePreset.tribhanga);
  const [siraRadius, setSiraRadius] = useState<number>(activePreset.halos.sirascakra.radiusSor);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cursor Sor-mo coordinates
  const [cursorSor, setCursorSor] = useState<{ xSor: number; ySor: number }>({
    xSor: 0,
    ySor: 0,
  });

  // Historical Thangka Image Overlay Calibration state
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.45);
  const [overlayScale, setOverlayScale] = useState<number>(1.0);
  const [overlayOffsetX, setOverlayOffsetX] = useState<number>(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState<number>(0);
  const [overlayRotation, setOverlayRotation] = useState<number>(0);

  const handleSelectPreset = (id: string) => {
    const next = CANONICAL_PRESETS[id];
    if (!next) return;
    setPresetId(id);
    setTribhanga({ ...next.tribhanga });
    setSiraRadius(next.halos.sirascakra.radiusSor);
  };

  const solvedGrid = useMemo(() => {
    return solveDeityGrid(activePreset, {
      tribhanga,
      sirascakraRadiusSor: siraRadius,
      pixelsPerSor: 12,
    });
  }, [activePreset, tribhanga, siraRadius]);

  const svgMarkup = useMemo(() => {
    return renderGridToSvg(solvedGrid, {
      theme,
      visibleLayers,
      showSubGridYuka: showSubGrid,
      showTitleCartouche: true,
    });
  }, [solvedGrid, theme, visibleLayers, showSubGrid]);

  const toggleLayer = (id: GridLayerId) => {
    setVisibleLayers((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSvg = () => {
    handleDownload(svgMarkup, `${activePreset.id}_thigse_grid.svg`, 'image/svg+xml');
  };

  const handleExportDxf = () => {
    const dxf = exportGridToDxf(solvedGrid, { visibleLayers });
    handleDownload(dxf, `${activePreset.id}_axidraw.dxf`, 'application/dxf');
  };

  const handleExportJson = () => {
    const updatedPreset = {
      ...activePreset,
      tribhanga,
      halos: {
        ...activePreset.halos,
        sirascakra: {
          ...activePreset.halos.sirascakra,
          radiusSor: siraRadius,
        },
      },
    };
    handleDownload(
      JSON.stringify(updatedPreset, null, 2),
      `${activePreset.id}_custom.json`,
      'application/json'
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOverlayUrl(url);
  };

  const palette = SVG_THEMES[theme];
  const cursorDecomposed = decomposeSor(cursorSor.ySor);

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-badge">THANGKAGRID CAD</span>
          <div>
            <div className="brand-title">
              Sacred Himalayan Iconometry Engine (Thigse / Paubha)
            </div>
            <div className="brand-subtitle">
              1 Sor-mo = 8 Yuka (barley grains) • 12 Sor-mo = 1 Tāla (facial span)
            </div>
          </div>
        </div>

        <div className="toolbar-group">
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Deity Preset:</label>
          <select
            className="select-input"
            value={presetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
          >
            <option value="shakyamuni_seated">
              Shakyamuni Buddha (125 Sor-mo • Seated Vajrāsana)
            </option>
            <option value="green_tara">
              Ārya Green Tārā (120 Sor-mo • Tribhaṅga Sway)
            </option>
            <option value="vajrapani_wrathful">
              Wrathful Vajrapāṇi (96 Sor-mo • Pratyālīḍha)
            </option>
          </select>

          <label style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>Theme:</label>
          <select
            className="select-input"
            value={theme}
            onChange={(e) => setTheme(e.target.value as SvgColorTheme)}
          >
            <option value="traditional">Traditional Parchment & Vermilion</option>
            <option value="blueprint">CAD Blueprint (Indigo/Cyan)</option>
            <option value="dark">Obsidian Studio Dark</option>
            <option value="monochrome">Archival Ink Monochrome</option>
          </select>
        </div>

        <div className="toolbar-group">
          <button className="btn btn-primary" onClick={handleExportSvg}>
            Export SVG Wireframe
          </button>
          <button className="btn btn-gold" onClick={handleExportDxf}>
            Export AxiDraw DXF
          </button>
          <button className="btn" onClick={handleExportJson}>
            Export JSON
          </button>
        </div>
      </header>

      {/* Main 3-Column Workspace */}
      <div className="workspace">
        {/* Left Sidebar: Layers & Tribhanga Sway Controls */}
        <aside className="sidebar">
          <div className="panel-card">
            <div className="panel-title">
              <span>Iconometric Grid Layers</span>
              <button
                className="btn"
                style={{ padding: '2px 7px', fontSize: 11 }}
                onClick={() =>
                  setVisibleLayers(
                    visibleLayers.length === ALL_GRID_LAYERS.length ? ['brahmasutra', 'facial_grid'] : ALL_GRID_LAYERS
                  )
                }
              >
                {visibleLayers.length === ALL_GRID_LAYERS.length ? 'Minimal' : 'Show All'}
              </button>
            </div>

            <div className="layer-list">
              {LAYER_META.map((layer) => {
                const checked = visibleLayers.includes(layer.id);
                const color = palette[layer.id];
                return (
                  <label key={layer.id} className="layer-row">
                    <span className="layer-left">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLayer(layer.id)}
                      />
                      <span className="swatch" style={{ backgroundColor: color }} />
                      <span>{layer.label}</span>
                    </span>
                    <span className="mono" style={{ fontSize: 10.5, color: '#94a3b8' }}>
                      {layer.tibetan}
                    </span>
                  </label>
                );
              })}

              <label className="layer-row" style={{ borderTop: '1px solid #2e364f', marginTop: 4, paddingTop: 8 }}>
                <span className="layer-left">
                  <input
                    type="checkbox"
                    checked={showSubGrid}
                    onChange={(e) => setShowSubGrid(e.target.checked)}
                  />
                  <span>2-Sor Background Lattice</span>
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: '#94a3b8' }}>
                  dra-mig
                </span>
              </label>
            </div>
          </div>

          {/* Tribhanga Sway Controls */}
          <div className="panel-card">
            <div className="panel-title">
              <span>Tribhaṅga Sway & Halo Solver</span>
              <button
                className="btn"
                style={{ padding: '2px 7px', fontSize: 11 }}
                onClick={() => {
                  setTribhanga({ ...activePreset.tribhanga });
                  setSiraRadius(activePreset.halos.sirascakra.radiusSor);
                }}
              >
                Reset
              </button>
            </div>

            <label className="layer-row" style={{ marginBottom: 8 }}>
              <span className="layer-left">
                <input
                  type="checkbox"
                  checked={tribhanga.enabled}
                  onChange={(e) =>
                    setTribhanga((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                />
                <span>Enable Tribhaṅga Spine Deflection</span>
              </span>
            </label>

            <div className="slider-group">
              <div className="slider-row">
                <div className="slider-header">
                  <span>Head Tilt Angle (dbu-yo)</span>
                  <span className="slider-val">{tribhanga.headTiltDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  step={0.5}
                  disabled={!tribhanga.enabled}
                  value={tribhanga.headTiltDeg}
                  onChange={(e) =>
                    setTribhanga((prev) => ({
                      ...prev,
                      headTiltDeg: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-header">
                  <span>Neck Sway (mgrin-pa)</span>
                  <span className="slider-val">{tribhanga.neckDeflectionSor.toFixed(2)} sor</span>
                </div>
                <input
                  type="range"
                  min={-8}
                  max={8}
                  step={0.25}
                  disabled={!tribhanga.enabled}
                  value={tribhanga.neckDeflectionSor}
                  onChange={(e) =>
                    setTribhanga((prev) => ({
                      ...prev,
                      neckDeflectionSor: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-header">
                  <span>Heart Cakra Sway (thugs-ka)</span>
                  <span className="slider-val">{tribhanga.heartDeflectionSor.toFixed(2)} sor</span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.25}
                  disabled={!tribhanga.enabled}
                  value={tribhanga.heartDeflectionSor}
                  onChange={(e) =>
                    setTribhanga((prev) => ({
                      ...prev,
                      heartDeflectionSor: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-header">
                  <span>Waist / Navel Sway (lte-ba)</span>
                  <span className="slider-val">{tribhanga.waistDeflectionSor.toFixed(2)} sor</span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={0.25}
                  disabled={!tribhanga.enabled}
                  value={tribhanga.waistDeflectionSor}
                  onChange={(e) =>
                    setTribhanga((prev) => ({
                      ...prev,
                      waistDeflectionSor: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="slider-row">
                <div className="slider-header">
                  <span>Pelvic Counter-Sway (dkpyi)</span>
                  <span className="slider-val">{tribhanga.hipDeflectionSor.toFixed(2)} sor</span>
                </div>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.25}
                  disabled={!tribhanga.enabled}
                  value={tribhanga.hipDeflectionSor}
                  onChange={(e) =>
                    setTribhanga((prev) => ({
                      ...prev,
                      hipDeflectionSor: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="slider-row" style={{ marginTop: 6 }}>
                <div className="slider-header">
                  <span>Śiraścakra Head Halo Radius</span>
                  <span className="slider-val">{siraRadius.toFixed(1)} sor</span>
                </div>
                <input
                  type="range"
                  min={9}
                  max={24}
                  step={0.5}
                  value={siraRadius}
                  onChange={(e) => setSiraRadius(parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Historical Thangka Image Overlay Calibration */}
          <div className="panel-card">
            <div className="panel-title">
              <span>Historical Thangka Overlay</span>
              {overlayUrl && (
                <button
                  className="btn"
                  style={{ padding: '2px 7px', fontSize: 11 }}
                  onClick={() => setOverlayUrl(null)}
                >
                  Clear
                </button>
              )}
            </div>
            <p style={{ fontSize: 11.5, color: '#94a3b8', marginBottom: 8 }}>
              Calibrate a scanned museum Thangka or Paubha painting against the canonical Sor-mo grid:
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ fontSize: 11.5, width: '100%', marginBottom: 8 }}
            />

            {overlayUrl && (
              <div className="slider-group">
                <div className="slider-row">
                  <div className="slider-header">
                    <span>Overlay Opacity</span>
                    <span className="slider-val">{Math.round(overlayOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.95}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  />
                </div>
                <div className="slider-row">
                  <div className="slider-header">
                    <span>Scale Factor</span>
                    <span className="slider-val">{overlayScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.25}
                    max={2.5}
                    step={0.02}
                    value={overlayScale}
                    onChange={(e) => setOverlayScale(parseFloat(e.target.value))}
                  />
                </div>
                <div className="slider-row">
                  <div className="slider-header">
                    <span>X / Y Offset (px)</span>
                    <span className="slider-val">
                      {overlayOffsetX}, {overlayOffsetY}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="range"
                      min={-300}
                      max={300}
                      value={overlayOffsetX}
                      onChange={(e) => setOverlayOffsetX(parseInt(e.target.value, 10))}
                    />
                    <input
                      type="range"
                      min={-300}
                      max={300}
                      value={overlayOffsetY}
                      onChange={(e) => setOverlayOffsetY(parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>
                <div className="slider-row">
                  <div className="slider-header">
                    <span>Rotation Calibration</span>
                    <span className="slider-val">{overlayRotation.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={-20}
                    max={20}
                    step={0.5}
                    value={overlayRotation}
                    onChange={(e) => setOverlayRotation(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center Interactive Infinite CAD Viewport */}
        <main
          className="canvas-viewport"
          style={{ backgroundColor: palette.background }}
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.08 : 0.92;
            setZoom((z) => Math.min(4.5, Math.max(0.25, z * factor)));
          }}
          onMouseDown={(e) => {
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.width / 2 + pan.x;
            const topOriginY = 120 + pan.y;
            const xSor = (e.clientX - rect.left - centerX) / (solvedGrid.pixelsPerSor * zoom);
            const ySor = (e.clientY - rect.top - topOriginY) / (solvedGrid.pixelsPerSor * zoom);
            setCursorSor({ xSor, ySor });

            if (isDragging) {
              setPan({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y,
              });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {overlayUrl && (
              <img
                src={overlayUrl}
                alt="Historical Thangka Reference Overlay"
                style={{
                  position: 'absolute',
                  opacity: overlayOpacity,
                  transform: `translate(${overlayOffsetX}px, ${overlayOffsetY}px) scale(${overlayScale}) rotate(${overlayRotation}deg)`,
                  pointerEvents: 'none',
                  maxHeight: '90%',
                }}
              />
            )}
            <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
          </div>

          {/* Bottom Viewport HUD */}
          <div className="hud-bar">
            <div className="hud-pill">
              <span>
                Cursor X: <strong>{cursorSor.xSor.toFixed(1)} sor</strong>
              </span>
              <span>
                Cursor Y: <strong>{cursorSor.ySor.toFixed(1)} sor</strong> (
                {cursorDecomposed.tala} tāla, {cursorDecomposed.sor} sor,{' '}
                {Math.round(cursorDecomposed.yuka)} yuka)
              </span>
              <span>
                Entities: <strong>{solvedGrid.primitives.length}</strong>
              </span>
            </div>

            <div className="hud-pill">
              <button
                className="btn"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => {
                  setZoom(0.85);
                  setPan({ x: 0, y: 0 });
                }}
              >
                Fit Whole Grid
              </button>
              <button
                className="btn"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={() => {
                  setZoom(2.35);
                  setPan({ x: 0, y: 520 });
                }}
              >
                Focus 12-Sor Face Tāla
              </button>
              <span>Zoom: {Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Lineage Metadata & Vertical Segment Breakdown */}
        <aside className="sidebar sidebar-right">
          <div className="panel-card">
            <div className="panel-title">Canonical Lineage & Treatise</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
              {activePreset.name.tibetan}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f8fafc', marginBottom: 6 }}>
              {activePreset.name.english}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
              <div>
                <strong>Sanskrit:</strong> {activePreset.name.sanskrit}
              </div>
              {activePreset.name.newari && (
                <div>
                  <strong>Newari (Paubha):</strong> {activePreset.name.newari}
                </div>
              )}
              <div>
                <strong>Lineage:</strong> {activePreset.tradition.lineage}
              </div>
              <div>
                <strong>Source Text:</strong> {activePreset.tradition.sourceText}
              </div>
              <p style={{ marginTop: 8, color: '#cbd5e1' }}>{activePreset.tradition.notes}</p>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-title">
              <span>Brahmasūtra Vertical Intervals</span>
              <span className="mono">
                {solvedGrid.totalHeightSor} Sor
                {tribhanga.enabled
                  ? ` (Y: ${solvedGrid.totalVerticalSpanSor.toFixed(1)}s)`
                  : ''}
              </span>
            </div>
            <table className="segment-table">
              <thead>
                <tr>
                  <th>Segment / Tibetan</th>
                  <th>Ratio</th>
                  <th>Arc / Y-Pos</th>
                </tr>
              </thead>
              <tbody>
                {activePreset.verticalSegments.map((seg) => {
                  const botAnchor = solvedGrid.anchors[seg.bottomAnchor];
                  return (
                    <tr key={seg.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{seg.label}</div>
                        <div className="mono" style={{ fontSize: 10.5, color: '#94a3b8' }}>
                          {seg.tibetanTerm}
                        </div>
                      </td>
                      <td className="mono">
                        {formatSorYuka(seg.sor + seg.yuka / 8)}
                      </td>
                      <td className="mono" style={{ color: '#f59e0b' }}>
                        {botAnchor
                          ? tribhanga.enabled
                            ? `${botAnchor.sSor}s (${botAnchor.ySor.toFixed(1)}y)`
                            : `${botAnchor.ySor}s`
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="panel-card">
            <div className="panel-title">Bilateral Widths (Half-Span)</div>
            <table className="segment-table">
              <thead>
                <tr>
                  <th>Anatomical Width</th>
                  <th>Anchor</th>
                  <th>Half-Span</th>
                </tr>
              </thead>
              <tbody>
                {activePreset.horizontalWidths.map((hw) => (
                  <tr key={hw.id}>
                    <td>{hw.label}</td>
                    <td className="mono" style={{ color: '#94a3b8' }}>
                      {hw.anchor}
                    </td>
                    <td className="mono">
                      ±{formatSorYuka(hw.halfWidthSor + hw.yuka / 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </div>
  );
}

