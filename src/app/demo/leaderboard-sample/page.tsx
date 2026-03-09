"use client"

/**
 * Static leaderboard mockup for format approval.
 * Pure HTML/CSS — no data dependencies.
 */
export default function LeaderboardSamplePage() {
  return (
    <div
      style={{ background: "#0a0e1a", minHeight: "100vh", padding: "16px" }}
      dangerouslySetInnerHTML={{ __html: SAMPLE_HTML }}
    />
  )
}

const SAMPLE_HTML = `
<style>
  .lb * { margin: 0; padding: 0; box-sizing: border-box; }
  .lb {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #e2e8f0;
    max-width: 1200px;
    margin: 0 auto;
  }
  .lb h2 { font-size: 18px; margin-bottom: 12px; color: #00A9E0; }

  /* ── Legends (two rows) ─────────────────────────────── */
  .lb-legends {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
    padding: 10px 14px;
    background: #111827;
    border-radius: 8px;
    border: 1px solid #1e293b;
  }
  .lb-legend-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .lb-legend-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: #64748b; min-width: 72px;
  }
  .lb-legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #94a3b8; }
  .lb-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  .lb-dot-g { background: #27AE60; }
  .lb-dot-y { background: #D4AC0D; }
  .lb-dot-x { background: #6b7280; }

  /* ── Table container ────────────────────────────────── */
  .lb-wrap {
    border: 1px solid #1e293b;
    border-radius: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .lb-t {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    min-width: 900px;
  }

  /* ── Headers ────────────────────────────────────────── */
  .lb-t thead .lb-sup th {
    background: #111827; color: #64748b;
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; padding: 8px 5px 2px;
    border-bottom: none; text-align: center;
  }
  .lb-t thead .lb-sup th.al { text-align: left; }
  .lb-t thead .lb-sub th {
    background: #111827; color: #475569;
    font-size: 9px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 2px 5px 8px;
    border-bottom: 2px solid #1e293b; text-align: center;
  }

  /* Desktop header labels */
  .lb-hd-full { display: table-cell; }
  .lb-hd-mob { display: none; }

  /* ── Rows ───────────────────────────────────────────── */
  .lb-t tbody tr { border-bottom: 1px solid #1e293b; }
  .lb-t tbody tr:hover { background: rgba(0,169,224,0.04); }
  .lb-t tbody tr.r-opt { background: rgba(0,169,224,0.06); }
  .lb-t tbody tr.r-fin { background: rgba(244,121,32,0.06); }
  .lb-t tbody tr.r-you { background: rgba(0,169,224,0.10); }
  .lb-t tbody tr.r-div td {
    padding: 0; height: 6px; background: transparent;
    border-bottom: 3px solid #00A9E0;
  }

  .lb-t td {
    padding: 8px 5px; vertical-align: middle;
    text-align: center; white-space: nowrap;
  }
  .lb-t td.al { text-align: left; }

  /* ── Cell styles ────────────────────────────────────── */
  .rk { font-weight: 600; color: #e2e8f0; font-size: 14px; }
  .rk-mx { color: #27AE60; font-weight: 600; }
  .rk-fl { color: #ef4444; font-weight: 600; }
  .pct { color: #94a3b8; font-size: 12px; }
  .na { color: #334155; font-size: 11px; }

  .pl { display: flex; align-items: center; gap: 5px; text-align: left; }
  .em { font-size: 14px; }
  .nm { font-weight: 500; color: #e2e8f0; font-size: 13px; }
  .nm-o { color: #00A9E0; font-weight: 700; font-size: 12px; }
  .nm-f { color: #F47920; font-weight: 700; font-size: 12px; }
  .you-b {
    font-size: 9px; font-weight: 700; color: #00A9E0;
    border: 1px solid rgba(0,169,224,0.4); border-radius: 4px; padding: 1px 5px;
  }
  .ch { font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 1px; }
  .ch-u { color: #27AE60; }
  .ch-d { color: #ef4444; }

  .sc { font-weight: 700; font-size: 15px; color: #e2e8f0; }
  .sc-m { color: #94a3b8; font-size: 13px; }
  .sc-e { color: #94a3b8; font-size: 12px; }

  .lv { font-weight: 600; font-size: 14px; }
  /* Teams left color tiers: 7-8 green, 5-6 gold, 3-4 orange, 1-2 red, 0 grey */
  .lv-8 { color: #27AE60; } .lv-7 { color: #27AE60; }
  .lv-6 { color: #D4AC0D; } .lv-5 { color: #D4AC0D; }
  .lv-4 { color: #E67E22; } .lv-3 { color: #E67E22; }
  .lv-2 { color: #ef4444; } .lv-1 { color: #ef4444; }
  .lv-0 { color: #6b7280; }

  /* ── Team logo boxes ────────────────────────────────── */
  .ts { display: flex; align-items: center; gap: 4px; }
  .td-r {
    width: 2px; height: 28px; background: #ef4444;
    border-radius: 1px; margin: 0 3px; flex-shrink: 0;
  }
  .tm {
    position: relative; width: 32px; height: 32px; border-radius: 5px;
    border: 2.5px solid; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; background: #1e293b; overflow: visible;
  }
  .tm img { width: 22px; height: 22px; object-fit: contain; }
  .tm.aw { border-color: #27AE60; }
  .tm.ap { border-color: #D4AC0D; }
  .tm.el { border-color: #4b5563; opacity: 0.40; filter: grayscale(100%); }
  .rb {
    position: absolute; top: -5px; left: -5px;
    width: 13px; height: 13px; border-radius: 50%;
    font-size: 6px; font-weight: 900; color: white;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #0a0e1a; z-index: 2;
  }
  .sb {
    position: absolute; bottom: -5px; right: -5px;
    width: 14px; height: 14px; border-radius: 50%;
    font-size: 7px; font-weight: 900; color: white;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid #0a0e1a; z-index: 2;
  }
  .rS { background: #c026d3; } .rW { background: #2563eb; }
  .rE { background: #0d9488; } .rMW { background: #7c3aed; }
  .s1 { background: #003087; } .s5 { background: #E67E22; }
  .s9 { background: #0891b2; } .s13 { background: #78350f; }

  /* ESPN logo base URL */

  /* ── Mobile responsive ──────────────────────────────── */
  @media (max-width: 768px) {
    .lb-t { min-width: 700px; font-size: 11px; }
    .lb-hd-full { display: none; }
    .lb-hd-mob { display: table-cell; }
    .tm { width: 26px; height: 26px; }
    .tm img { width: 18px; height: 18px; }
    .rb { width: 11px; height: 11px; font-size: 5px; top: -4px; left: -4px; }
    .sb { width: 12px; height: 12px; font-size: 6px; bottom: -4px; right: -4px; }
    .ts { gap: 3px; }
    .td-r { height: 22px; margin: 0 2px; }
    .rk { font-size: 12px; }
    .sc { font-size: 13px; }
    .nm { font-size: 11px; }
    .pct { font-size: 10px; }
    .lb-t td { padding: 6px 3px; }
    .lb-t thead .lb-sup th { padding: 6px 3px 1px; font-size: 9px; }
    .lb-t thead .lb-sub th { padding: 1px 3px 6px; font-size: 8px; }
    .lb-legend-item { font-size: 10px; }
    .lb-legend-title { font-size: 9px; min-width: 60px; }
  }

  @media (max-width: 480px) {
    .lb-t { min-width: 600px; font-size: 10px; }
    .tm { width: 22px; height: 22px; }
    .tm img { width: 15px; height: 15px; }
  }
</style>

<div class="lb">
<h2>Leaderboard — Sample Format</h2>

<!-- ── Legends (two rows) ──────────────────────────────── -->
<div class="lb-legends">
  <div class="lb-legend-row">
    <span class="lb-legend-title">Status</span>
    <span class="lb-legend-item"><span class="lb-dot lb-dot-g"></span> Won round</span>
    <span class="lb-legend-item"><span class="lb-dot lb-dot-y"></span> Yet to play</span>
    <span class="lb-legend-item"><span class="lb-dot lb-dot-x"></span> Eliminated</span>
  </div>
  <div class="lb-legend-row">
    <span class="lb-legend-title">Archetypes</span>
    <span class="lb-legend-item">🎯 Strategist</span>
    <span class="lb-legend-item">👠 Cinderella</span>
    <span class="lb-legend-item">✏️ Sweet Spotter</span>
    <span class="lb-legend-item">🌪️ Chaos Agent</span>
    <span class="lb-legend-item">🏠 Regional Purist</span>
    <span class="lb-legend-item">📐 Chalk Artist</span>
    <span class="lb-legend-item">🔮 Contrarian</span>
  </div>
</div>

<!-- ── Data Table ──────────────────────────────────────── -->
<div class="lb-wrap">
<table class="lb-t">
<thead>
  <tr class="lb-sup">
    <th colspan="3">Rank</th>
    <th class="lb-hd-full">Percentile</th>
    <th class="lb-hd-mob">%ile</th>
    <th class="al">Player</th>
    <th colspan="3">Score</th>
    <th class="al">Teams</th>
    <th>Left</th>
  </tr>
  <tr class="lb-sub">
    <th class="lb-hd-full">Actual</th><th class="lb-hd-mob">Act</th>
    <th>Max</th><th>Floor</th>
    <th></th><th></th>
    <th class="lb-hd-full">Actual</th><th class="lb-hd-mob">Act</th>
    <th>Max</th><th>Exp</th>
    <th></th><th></th>
  </tr>
</thead>
<tbody>

  <!-- ═══ Optimal 8 (Rolling) ═══ -->
  <tr class="r-opt">
    <td><span class="na">—</span></td>
    <td><span class="na">—</span></td>
    <td><span class="na">—</span></td>
    <td><span class="na">—</span></td>
    <td class="al"><div class="pl"><span class="em">✨</span><span class="nm nm-o">Optimal 8 (Rolling)</span></div></td>
    <td><span class="sc">87</span></td>
    <td><span class="sc-m">99</span></td>
    <td><span class="sc-e">93.2</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" alt="ARK"><span class="sb s9">12</span></div>
        <div class="tm aw"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/252.png" alt="BYU"><span class="sb s5">6</span></div>
        <div class="tm aw"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/145.png" alt="OLE"><span class="sb s5">7</span></div>
        <div class="tm aw"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/36.png" alt="CSU"><span class="sb s5">6</span></div>
        <div class="tm ap"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png" alt="MCN"><span class="sb s9">12</span></div>
        <div class="tm ap"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png" alt="DRK"><span class="sb s9">11</span></div>
        <div class="tm ap"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/130.png" alt="MICH"><span class="sb s5">5</span></div>
        <div class="tm ap"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/167.png" alt="NMX"><span class="sb s9">10</span></div>
      </div>
    </td>
    <td><span class="lv lv-8">8</span></td>
  </tr>

  <!-- ═══ Optimal 8 (Final) ═══ -->
  <tr class="r-fin">
    <td><span class="na">—</span></td>
    <td><span class="na">—</span></td>
    <td><span class="na">—</span></td>
    <td><span class="na">—</span></td>
    <td class="al"><div class="pl"><span class="em">🏆</span><span class="nm nm-f">Optimal 8 (Final)</span></div></td>
    <td><span class="sc">99</span></td>
    <td><span class="sc-m">99</span></td>
    <td><span class="sc-e">99.0</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" alt="ARK"><span class="sb s9">12</span></div>
        <div class="tm aw"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/252.png" alt="BYU"><span class="sb s5">6</span></div>
        <div class="tm aw"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/145.png" alt="OLE"><span class="sb s5">7</span></div>
        <div class="tm aw"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/36.png" alt="CSU"><span class="sb s5">6</span></div>
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png" alt="MCN"><span class="sb s9">12</span></div>
        <div class="tm aw"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png" alt="DRK"><span class="sb s9">11</span></div>
        <div class="tm aw"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/130.png" alt="MICH"><span class="sb s5">5</span></div>
        <div class="tm aw"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/167.png" alt="NMX"><span class="sb s9">10</span></div>
      </div>
    </td>
    <td><span class="lv lv-8">8</span></td>
  </tr>

  <!-- ═══ YOU ═══ -->
  <tr class="r-you">
    <td><span class="rk">47</span></td>
    <td><span class="rk-mx">12</span></td>
    <td><span class="rk-fl">89</span></td>
    <td><span class="pct">82.3%</span></td>
    <td class="al"><div class="pl"><span class="em">✏️</span><span class="nm">Sumeet Patel</span><span class="you-b">You</span><span class="ch ch-u">▲13</span></div></td>
    <td><span class="sc">52</span></td>
    <td><span class="sc-m">78</span></td>
    <td><span class="sc-e">61.4</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/57.png" alt="FLA"><span class="sb s1">1</span></div>
        <div class="tm aw"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/248.png" alt="HOU"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/150.png" alt="DUK"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png" alt="MCN"><span class="sb s9">12</span></div>
        <div class="td-r"></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/153.png" alt="UNC"><span class="sb s1">3</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2628.png" alt="TCU"><span class="sb s5">6</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/235.png" alt="MEM"><span class="sb s5">8</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/259.png" alt="VT"><span class="sb s9">10</span></div>
      </div>
    </td>
    <td><span class="lv lv-4">4</span></td>
  </tr>

  <!-- ═══ DIVIDER (bold blue line) ═══ -->
  <tr class="r-div"><td colspan="10"></td></tr>

  <!-- ═══ Rank 1 ═══ -->
  <tr>
    <td><span class="rk">1</span></td>
    <td><span class="rk-mx">1</span></td>
    <td><span class="rk-fl">3</span></td>
    <td><span class="pct">99.6%</span></td>
    <td class="al"><div class="pl"><span class="em">👠</span><span class="nm">Jig Samani (2)</span><span class="ch ch-u">▲2</span></div></td>
    <td><span class="sc">79</span></td>
    <td><span class="sc-m">79</span></td>
    <td><span class="sc-e">79.0</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" alt="ARK"><span class="sb s9">12</span></div>
        <div class="tm aw"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/252.png" alt="BYU"><span class="sb s5">6</span></div>
        <div class="tm aw"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/145.png" alt="OLE"><span class="sb s5">7</span></div>
        <div class="td-r"></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/36.png" alt="CSU"><span class="sb s5">6</span></div>
        <div class="tm el"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2377.png" alt="MCN"><span class="sb s9">12</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png" alt="DRK"><span class="sb s9">11</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/130.png" alt="MICH"><span class="sb s5">5</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/167.png" alt="NMX"><span class="sb s9">10</span></div>
      </div>
    </td>
    <td><span class="lv lv-3">3</span></td>
  </tr>

  <!-- ═══ Rank 2 ═══ -->
  <tr>
    <td><span class="rk">2</span></td>
    <td><span class="rk-mx">1</span></td>
    <td><span class="rk-fl">T8</span></td>
    <td><span class="pct">99.2%</span></td>
    <td class="al"><div class="pl"><span class="em">🎯</span><span class="nm">Niam Patel</span><span class="ch ch-d">▼1</span></div></td>
    <td><span class="sc">76</span></td>
    <td><span class="sc-m">92</span></td>
    <td><span class="sc-e">82.1</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/57.png" alt="FLA"><span class="sb s1">1</span></div>
        <div class="tm aw"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/248.png" alt="HOU"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/150.png" alt="DUK"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png" alt="STJ"><span class="sb s1">2</span></div>
        <div class="td-r"></div>
        <div class="tm el"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2226.png" alt="CLEM"><span class="sb s5">5</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/275.png" alt="WIS"><span class="sb s1">3</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/239.png" alt="BAY"><span class="sb s5">7</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/251.png" alt="TEX"><span class="sb s9">9</span></div>
      </div>
    </td>
    <td><span class="lv lv-4">4</span></td>
  </tr>

  <!-- ═══ T3 (tie example with T in max rank too) ═══ -->
  <tr>
    <td><span class="rk">T3</span></td>
    <td><span class="rk-mx">T1</span></td>
    <td><span class="rk-fl">15</span></td>
    <td><span class="pct">98.9%</span></td>
    <td class="al"><div class="pl"><span class="em">📐</span><span class="nm">Max Starks</span></div></td>
    <td><span class="sc">71</span></td>
    <td><span class="sc-m">85</span></td>
    <td><span class="sc-e">76.8</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/248.png" alt="HOU"><span class="sb s1">1</span></div>
        <div class="tm aw"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/150.png" alt="DUK"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2.png" alt="AUB"><span class="sb s1">4</span></div>
        <div class="td-r"></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2250.png" alt="GON"><span class="sb s1">3</span></div>
        <div class="tm el"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/269.png" alt="MRQ"><span class="sb s1">2</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/96.png" alt="UK"><span class="sb s1">3</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png" alt="PUR"><span class="sb s1">4</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/156.png" alt="CRE"><span class="sb s1">4</span></div>
      </div>
    </td>
    <td><span class="lv lv-3">3</span></td>
  </tr>

  <!-- ═══ T3 ═══ -->
  <tr>
    <td><span class="rk">T3</span></td>
    <td><span class="rk-mx">T1</span></td>
    <td><span class="rk-fl">T22</span></td>
    <td><span class="pct">98.9%</span></td>
    <td class="al"><div class="pl"><span class="em">🌪️</span><span class="nm">Jesse Casso</span><span class="ch ch-u">▲5</span></div></td>
    <td><span class="sc">71</span></td>
    <td><span class="sc-m">95</span></td>
    <td><span class="sc-e">78.2</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/57.png" alt="FLA"><span class="sb s1">1</span></div>
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" alt="ARK"><span class="sb s9">12</span></div>
        <div class="tm ap"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/150.png" alt="DUK"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2363.png" alt="MRK"><span class="sb s9">11</span></div>
        <div class="td-r"></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png" alt="ORE"><span class="sb s5">5</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/238.png" alt="VAN"><span class="sb s5">6</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2335.png" alt="LIB"><span class="sb s13">13</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2253.png" alt="GCU"><span class="sb s13">15</span></div>
      </div>
    </td>
    <td><span class="lv lv-4">4</span></td>
  </tr>

  <!-- ═══ Rank 5 ═══ -->
  <tr>
    <td><span class="rk">5</span></td>
    <td><span class="rk-mx">1</span></td>
    <td><span class="rk-fl">30</span></td>
    <td><span class="pct">98.1%</span></td>
    <td class="al"><div class="pl"><span class="em">🎯</span><span class="nm">Rohan Mehta</span><span class="ch ch-u">▲1</span></div></td>
    <td><span class="sc">68</span></td>
    <td><span class="sc-m">88</span></td>
    <td><span class="sc-e">74.3</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/57.png" alt="FLA"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/150.png" alt="DUK"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/248.png" alt="HOU"><span class="sb s1">1</span></div>
        <div class="td-r"></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png" alt="STJ"><span class="sb s1">2</span></div>
        <div class="tm el"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/142.png" alt="MSST"><span class="sb s5">5</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/145.png" alt="OLE"><span class="sb s5">7</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2306.png" alt="KSU"><span class="sb s5">6</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2132.png" alt="CIN"><span class="sb s5">8</span></div>
      </div>
    </td>
    <td><span class="lv lv-3">3</span></td>
  </tr>

  <!-- ═══ Rank 6 (all eliminated — locked) ═══ -->
  <tr>
    <td><span class="rk">6</span></td>
    <td><span class="rk-mx">6</span></td>
    <td><span class="rk-fl">6</span></td>
    <td><span class="pct">97.7%</span></td>
    <td class="al"><div class="pl"><span class="em">🔮</span><span class="nm">Priya Shah</span><span class="ch ch-d">▼3</span></div></td>
    <td><span class="sc">65</span></td>
    <td><span class="sc-m">65</span></td>
    <td><span class="sc-e">65.0</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm el"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" alt="ARK"><span class="sb s9">12</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/252.png" alt="BYU"><span class="sb s5">6</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/130.png" alt="MICH"><span class="sb s5">5</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/275.png" alt="WIS"><span class="sb s1">3</span></div>
        <div class="tm el"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2226.png" alt="CLEM"><span class="sb s5">5</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png" alt="ORE"><span class="sb s5">5</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/239.png" alt="BAY"><span class="sb s5">7</span></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2181.png" alt="DRK"><span class="sb s9">11</span></div>
      </div>
    </td>
    <td><span class="lv lv-0">0</span></td>
  </tr>

  <!-- ═══ Rank 7 ═══ -->
  <tr>
    <td><span class="rk">7</span></td>
    <td><span class="rk-mx">2</span></td>
    <td><span class="rk-fl">45</span></td>
    <td><span class="pct">97.4%</span></td>
    <td class="al"><div class="pl"><span class="em">🏠</span><span class="nm">Ankur Patel (2)</span><span class="ch ch-u">▲8</span></div></td>
    <td><span class="sc">63</span></td>
    <td><span class="sc-m">99</span></td>
    <td><span class="sc-e">75.1</span></td>
    <td class="al">
      <div class="ts">
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/57.png" alt="FLA"><span class="sb s1">1</span></div>
        <div class="tm aw"><span class="rb rS">S</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/8.png" alt="ARK"><span class="sb s9">12</span></div>
        <div class="tm aw"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/248.png" alt="HOU"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/150.png" alt="DUK"><span class="sb s1">1</span></div>
        <div class="tm ap"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2608.png" alt="STJ"><span class="sb s1">2</span></div>
        <div class="td-r"></div>
        <div class="tm el"><span class="rb rMW">MW</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/2509.png" alt="PUR"><span class="sb s1">4</span></div>
        <div class="tm el"><span class="rb rE">E</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/96.png" alt="UK"><span class="sb s1">3</span></div>
        <div class="tm el"><span class="rb rW">W</span><img src="https://a.espncdn.com/i/teamlogos/ncaa/500/156.png" alt="CRE"><span class="sb s1">4</span></div>
      </div>
    </td>
    <td><span class="lv lv-5">5</span></td>
  </tr>

</tbody>
</table>
</div>

<p style="margin-top:16px;font-size:11px;color:#475569;font-style:italic;">Static mockup for format approval. Hardcoded values — not wired to real data.</p>
</div>
`
