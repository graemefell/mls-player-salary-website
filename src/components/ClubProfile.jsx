import { useState, useMemo } from 'react'
import { clubColors } from '../data/clubColors'

function posColor(pos) {
  if (pos === 'Goalkeeper') return '#e84393'
  if (['Defender', 'Center-back', 'Right-back', 'Left-back'].includes(pos)) return '#00b4d8'
  if (['Defensive Midfield', 'Central Midfield', 'Right Midfield', 'Left Midfield', 'Attacking Midfield'].includes(pos)) return '#06d6a0'
  if (['Right Wing', 'Left Wing', 'Forward', 'Center Forward'].includes(pos)) return '#ffd166'
  return '#636e72'
}

const POSITION_ORDER = {
  Goalkeeper: 0,
  Defender: 1, 'Center-back': 1, 'Right-back': 1, 'Left-back': 1,
  'Defensive Midfield': 2, 'Central Midfield': 2, 'Right Midfield': 2, 'Left Midfield': 2, 'Attacking Midfield': 2,
  'Right Wing': 3, 'Left Wing': 3, Forward: 3, 'Center Forward': 3,
}

const POS_GROUPS = [
  { key: 'GK', label: 'Goalkeepers', positions: ['Goalkeeper'], color: '#e84393' },
  { key: 'DEF', label: 'Defenders', positions: ['Defender', 'Center-back', 'Right-back', 'Left-back'], color: '#00b4d8' },
  { key: 'MID', label: 'Midfielders', positions: ['Defensive Midfield', 'Central Midfield', 'Right Midfield', 'Left Midfield', 'Attacking Midfield'], color: '#06d6a0' },
  { key: 'ATK', label: 'Attackers', positions: ['Right Wing', 'Left Wing', 'Forward', 'Center Forward'], color: '#ffd166' },
]

const LEGEND = [
  { label: 'Goalkeepers', color: '#e84393' },
  { label: 'Defenders', color: '#00b4d8' },
  { label: 'Midfielders', color: '#06d6a0' },
  { label: 'Attackers', color: '#ffd166' },
]

// Bar/dot layout constants (match Overview)
const ROW_H = 20, ROW_GAP = 6, STEP = ROW_H + ROW_GAP
const LABEL_W = 180, BAR_W = 400, TOTAL_W = 115, DOT_W = 320, NAME_W = 120
const TOP = 28
const SVG_W = LABEL_W + BAR_W + TOTAL_W + DOT_W + NAME_W

function fmtCurrency(v) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v)
}

function fmtCompact(v) {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return fmtCurrency(v)
}

function median(arr) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function posGroup(pos) {
  for (const g of POS_GROUPS) {
    if (g.positions.includes(pos)) return g.key
  }
  return 'UNK'
}

export default function ClubProfile({ data }) {
  const years = useMemo(
    () => [...new Set(data.map(d => d.Year))].sort((a, b) => b - a),
    [data],
  )

  const [selectedYear, setSelectedYear] = useState(years[0])

  const clubs = useMemo(
    () => [...new Set(data.filter(d => d.Year === selectedYear).map(d => d.Club))].filter(c => c !== 'Unattached').sort(),
    [data, selectedYear],
  )

  const [selectedClub, setSelectedClub] = useState(clubs[0])
  const [tooltip, setTooltip] = useState(null)

  // Reset club selection when year changes and current club isn't available
  const clubValid = clubs.includes(selectedClub)
  const effectiveClub = clubValid ? selectedClub : clubs[0]
  if (!clubValid && selectedClub !== effectiveClub) {
    setSelectedClub(effectiveClub)
  }

  // Current year stats
  const currentPlayers = useMemo(
    () => data.filter(d => d.Club === effectiveClub && d.Year === selectedYear),
    [data, effectiveClub, selectedYear],
  )
  const prevPlayers = useMemo(
    () => data.filter(d => d.Club === effectiveClub && d.Year === selectedYear - 1),
    [data, effectiveClub, selectedYear],
  )

  const stats = useMemo(() => {
    const sals = currentPlayers.map(p => p['Guaranteed Comp'] || 0)
    const total = sals.reduce((a, b) => a + b, 0)
    const avg = sals.length ? total / sals.length : 0
    const med = median(sals)

    const prevSals = prevPlayers.map(p => p['Guaranteed Comp'] || 0)
    const prevTotal = prevSals.reduce((a, b) => a + b, 0)
    const prevAvg = prevSals.length ? prevTotal / prevSals.length : 0
    const prevMed = median(prevSals)

    const pctChange = (cur, prev) => prev ? ((cur - prev) / prev) * 100 : null

    return {
      total, avg, med,
      totalPct: pctChange(total, prevTotal),
      avgPct: pctChange(avg, prevAvg),
      medPct: pctChange(med, prevMed),
    }
  }, [currentPlayers, prevPlayers])

  // Top 5 earners
  const top5 = useMemo(
    () => [...currentPlayers]
      .sort((a, b) => (b['Guaranteed Comp'] || 0) - (a['Guaranteed Comp'] || 0))
      .slice(0, 5),
    [currentPlayers],
  )

  // Area chart data: club salaries over time grouped by position
  const areaData = useMemo(() => {
    const clubData = data.filter(d => d.Club === effectiveClub)
    const yearSet = [...new Set(clubData.map(d => d.Year))].sort((a, b) => a - b)
    return yearSet.map(yr => {
      const row = { year: yr }
      for (const g of POS_GROUPS) {
        row[g.key] = clubData
          .filter(d => d.Year === yr && g.positions.includes(d.Position))
          .reduce((s, d) => s + (d['Guaranteed Comp'] || 0), 0)
      }
      row._total = POS_GROUPS.reduce((s, g) => s + row[g.key], 0)
      return row
    })
  }, [data, effectiveClub])

  // Bar/dot chart for this club (single row but using same visual style)
  const clubBar = useMemo(() => {
    const players = currentPlayers.map(p => ({
      name: p.Name,
      pos: p.Position,
      sal: p['Guaranteed Comp'] || 0,
    }))
    players.sort((a, b) => {
      const posA = POSITION_ORDER[a.pos] ?? 9
      const posB = POSITION_ORDER[b.pos] ?? 9
      return posA !== posB ? posA - posB : b.sal - a.sal
    })
    const total = players.reduce((s, p) => s + p.sal, 0)
    const maxIndiv = Math.max(...players.map(p => p.sal), 1)
    const barScale = BAR_W / (total || 1)
    let x = 0
    const segs = players.map(p => {
      const w = Math.max(p.sal * barScale, 0.5)
      const seg = { ...p, x, w }
      x += w
      return seg
    })
    const topPlayer = [...players].sort((a, b) => b.sal - a.sal)[0]
    return { players, total, segs, maxIndiv, topPlayer }
  }, [currentPlayers])

  const showTip = (e, text) =>
    setTooltip({ x: e.clientX, y: e.clientY, text })
  const hideTip = () => setTooltip(null)

  // Area chart dimensions
  const AREA_W = 600, AREA_H = 220, AREA_PAD = { top: 20, right: 20, bottom: 30, left: 70 }
  const areaInnerW = AREA_W - AREA_PAD.left - AREA_PAD.right
  const areaInnerH = AREA_H - AREA_PAD.top - AREA_PAD.bottom

  const areaMax = Math.max(...areaData.map(d => d._total), 1)
  const areaXScale = areaData.length > 1 ? areaInnerW / (areaData.length - 1) : 0
  const areaYScale = areaInnerH / areaMax

  // Build stacked area paths (bottom to top: GK, DEF, MID, FWD)
  const stackedAreas = useMemo(() => {
    const groupKeys = POS_GROUPS.map(g => g.key)
    // For each data point, compute cumulative y
    const cumulative = areaData.map(d => {
      let cum = 0
      const vals = {}
      for (const k of groupKeys) {
        vals[k + '_y0'] = cum
        cum += d[k]
        vals[k + '_y1'] = cum
      }
      return vals
    })

    return POS_GROUPS.map(g => {
      if (areaData.length === 0) return { ...g, path: '' }
      const points = areaData.map((d, i) => ({
        x: AREA_PAD.left + i * areaXScale,
        y0: AREA_PAD.top + areaInnerH - cumulative[i][g.key + '_y0'] * areaYScale,
        y1: AREA_PAD.top + areaInnerH - cumulative[i][g.key + '_y1'] * areaYScale,
      }))
      const topLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y1}`).join(' ')
      const bottomLine = [...points].reverse().map((p, i) => `${i === 0 ? 'L' : 'L'}${p.x},${p.y0}`).join(' ')
      return { ...g, path: `${topLine} ${bottomLine} Z` }
    })
  }, [areaData, areaXScale, areaYScale, areaInnerH])

  // Distribution bar chart data (200K bins)
  const distData = useMemo(() => {
    const sals = currentPlayers.map(p => p['Guaranteed Comp'] || 0)
    if (!sals.length) return []
    const binSize = 200000
    const maxSal = Math.max(...sals)
    const numBins = Math.max(Math.ceil((maxSal + 1) / binSize), 1)
    const bins = Array.from({ length: numBins }, (_, i) => ({
      lo: i * binSize,
      hi: (i + 1) * binSize,
      count: 0,
    }))
    sals.forEach(s => {
      const idx = Math.min(Math.floor(s / binSize), numBins - 1)
      bins[idx].count++
    })
    return bins
  }, [currentPlayers])

  // Bar/dot SVG
  const barSvgH = TOP + STEP + 10
  const dotScale = DOT_W / (clubBar.maxIndiv || 1)

  const clubTrimColor = clubColors[effectiveClub] || '#2c3e50'

  return (
    <div className="club-profile-page" style={{ borderTop: `4px solid ${clubTrimColor}` }}>
      {/* Filters */}
      <div className="cp-header">
        <div className="cp-filter">
          <label>Club</label>
          <select value={effectiveClub} onChange={e => setSelectedClub(e.target.value)}>
            {clubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="cp-filter">
          <label>Year</label>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="overview-legend">
          {LEGEND.map(g => (
            <span key={g.label} className="ov-legend-item">
              <span className="ov-legend-dot" style={{ background: g.color }} />
              {g.label}
            </span>
          ))}
        </div>
      </div>

      {/* Callout Cards */}
      <div className="cp-cards">
        <CalloutCard label="Total Compensation" value={fmtCompact(stats.total)} pct={stats.totalPct} />
        <CalloutCard label="Average Player Compensation" value={fmtCompact(stats.avg)} pct={stats.avgPct} />
        <CalloutCard label="Median Player Compensation" value={fmtCompact(stats.med)} pct={stats.medPct} />
      </div>

      {/* Middle row: top 5 earners + distribution + area chart */}
      <div className="cp-middle-row">
        <div className="cp-top5">
          <h4>Top 5 Earners</h4>
          <ol className="cp-top5-list">
            {top5.map((p, i) => (
              <li key={i} className="cp-top5-item">
                <span className="cp-top5-rank">{i + 1}</span>
                <span className="cp-top5-dot" style={{ background: posColor(p.Position) }} />
                <span className="cp-top5-name">{p.Name}</span>
                <span className="cp-top5-pos" title={p.Position}>{p.Position}</span>
                <span className="cp-top5-sal">{fmtCurrency(p['Guaranteed Comp'] || 0)}</span>
              </li>
            ))}
            {top5.length === 0 && <li className="cp-top5-empty">No players found</li>}
          </ol>
        </div>

        {/* Distribution bar chart */}
        <div className="cp-distribution">
          <h4>Salary Distribution</h4>
          {distData.length > 0 ? (() => {
            const DIST_W = 260, DIST_H = 220
            const DIST_PAD = { top: 10, right: 10, bottom: 50, left: 40 }
            const innerW = DIST_W - DIST_PAD.left - DIST_PAD.right
            const innerH = DIST_H - DIST_PAD.top - DIST_PAD.bottom
            const maxCount = Math.max(...distData.map(b => b.count), 1)
            const barW = innerW / distData.length
            const yScale = innerH / maxCount
            return (
              <svg viewBox={`0 0 ${DIST_W} ${DIST_H}`} width={DIST_W} height={DIST_H}>
                {/* Y axis grid */}
                {Array.from({ length: 5 }, (_, i) => {
                  const frac = i / 4
                  const y = DIST_PAD.top + innerH * (1 - frac)
                  return (
                    <g key={i}>
                      <line x1={DIST_PAD.left} y1={y} x2={DIST_W - DIST_PAD.right} y2={y} stroke="#eee" strokeWidth={0.5} />
                      <text x={DIST_PAD.left - 4} y={y + 3.5} textAnchor="end" fill="#999" fontSize="9">
                        {Math.round(maxCount * frac)}
                      </text>
                    </g>
                  )
                })}
                {/* Bars */}
                {distData.map((bin, i) => {
                  const barH = bin.count * yScale
                  const x = DIST_PAD.left + i * barW
                  const y = DIST_PAD.top + innerH - barH
                  return (
                    <g key={i}>
                      <rect
                        x={x + 1}
                        y={y}
                        width={Math.max(barW - 2, 1)}
                        height={barH}
                        fill={clubTrimColor}
                        fillOpacity={0.7}
                        stroke={clubTrimColor}
                        strokeWidth={0.5}
                        rx={1}
                        style={{ cursor: 'pointer' }}
                        onMouseMove={e => showTip(e, `${fmtCompact(bin.lo)} – ${fmtCompact(bin.hi)}\n${bin.count} player${bin.count !== 1 ? 's' : ''}`)}
                        onMouseLeave={hideTip}
                      />
                      {bin.count > 0 && (
                        <text x={x + barW / 2} y={y - 3} textAnchor="middle" fill="#666" fontSize="8.5">
                          {bin.count}
                        </text>
                      )}
                    </g>
                  )
                })}
                {/* X axis ticks and labels */}
                {(() => {
                  const maxSal = Math.max(...distData.map(b => b.hi))
                  const labelStep = maxSal > 6000000 ? 2000000 : 1000000
                  return distData.map((bin, i) => {
                    const x = DIST_PAD.left + i * barW + barW / 2
                    const tickY = DIST_H - DIST_PAD.bottom
                    const isLabeled = bin.lo % labelStep === 0
                    return (
                      <g key={i}>
                        <line x1={x} y1={tickY} x2={x} y2={tickY + (isLabeled ? 6 : 3)} stroke="#999" strokeWidth={0.5} />
                        {isLabeled && (
                          <text x={x} y={tickY + 16} textAnchor="middle" fill="#999" fontSize="8.5">
                            {fmtCompact(bin.lo)}
                          </text>
                        )}
                      </g>
                    )
                  })
                })()}
              </svg>
            )
          })() : (
            <div className="cp-top5-empty">No data</div>
          )}
        </div>

        <div className="cp-area-chart">
          <h4>Club Salaries Over Time</h4>
          <svg viewBox={`0 0 ${AREA_W} ${AREA_H}`} style={{ width: '100%', height: 'auto' }}>
            {/* Y axis grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(frac => {
              const y = AREA_PAD.top + areaInnerH * (1 - frac)
              return (
                <g key={frac}>
                  <line x1={AREA_PAD.left} y1={y} x2={AREA_W - AREA_PAD.right} y2={y} stroke="#ddd" strokeWidth={0.5} />
                  <text x={AREA_PAD.left - 6} y={y + 4} textAnchor="end" fill="#999" fontSize="10">
                    {fmtCompact(areaMax * frac)}
                  </text>
                </g>
              )
            })}
            {/* Stacked area */}
            {stackedAreas.map(a => (
              <path key={a.key} d={a.path} fill={a.color} fillOpacity={0.65} stroke={a.color} strokeWidth={1} />
            ))}
            {/* Invisible hover columns for tooltip */}
            {areaData.map((d, i) => {
              const x = AREA_PAD.left + i * areaXScale
              const colW = areaData.length > 1
                ? (i === 0 ? areaXScale / 2 : i === areaData.length - 1 ? areaXScale / 2 : areaXScale)
                : areaInnerW
              const colX = areaData.length > 1
                ? (i === 0 ? AREA_PAD.left : x - areaXScale / 2)
                : AREA_PAD.left
              const lines = [
                `${d.year}`,
                ...POS_GROUPS.map(g => `${g.label}: ${fmtCompact(d[g.key])}`),
                `Total: ${fmtCompact(d._total)}`,
              ]
              return (
                <rect
                  key={i}
                  x={colX}
                  y={AREA_PAD.top}
                  width={colW}
                  height={areaInnerH}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseMove={e => showTip(e, lines.join('\n'))}
                  onMouseLeave={hideTip}
                />
              )
            })}
            {/* X axis labels */}
            {areaData.map((d, i) => {
              const x = AREA_PAD.left + i * areaXScale
              const showLabel = areaData.length <= 10 || i % Math.ceil(areaData.length / 8) === 0 || i === areaData.length - 1
              return showLabel ? (
                <text key={i} x={x} y={AREA_H - 6} textAnchor="middle" fill="#999" fontSize="10">{d.year}</text>
              ) : null
            })}
          </svg>
        </div>
      </div>

      {/* Bottom: bar + dot chart for this club */}
      <div className="cp-bar-section">
        <h4>Player Salary Breakdown</h4>
        <div className="overview-chart-wrap">
          <svg viewBox={`0 0 ${SVG_W} ${barSvgH}`} width={SVG_W} height={barSvgH}>
            <text x={LABEL_W + BAR_W * 0.5} y={16} textAnchor="middle" fill="#ccc" fontSize="13" fontWeight="700">
              Total Salaries
              <tspan dx="8" fontWeight="400" fontStyle="italic" fontSize="11" fill="#888">Bars segmented by player</tspan>
            </text>
            <text x={LABEL_W + BAR_W + TOTAL_W + DOT_W * 0.5} y={16} textAnchor="middle" fill="#ccc" fontSize="13" fontWeight="700">
              Individual Salaries
            </text>
            <line x1={LABEL_W + BAR_W + TOTAL_W - 8} y1={TOP - 4} x2={LABEL_W + BAR_W + TOTAL_W - 8} y2={barSvgH - 4} stroke="#445" strokeDasharray="4 3" />

            <g>
              <text x={LABEL_W - 10} y={TOP + ROW_H / 2 + 4.5} textAnchor="end" fill="#ddd" fontSize="12">{effectiveClub}</text>

              {clubBar.segs.map((s, j) => (
                <rect
                  key={j}
                  x={LABEL_W + s.x}
                  y={TOP}
                  width={s.w}
                  height={ROW_H}
                  fill={posColor(s.pos)}
                  stroke="#1a1a2e"
                  strokeWidth={0.4}
                  style={{ cursor: 'pointer' }}
                  onMouseMove={e => showTip(e, `${s.name}\n${s.pos} · ${fmtCurrency(s.sal)}`)}
                  onMouseLeave={hideTip}
                />
              ))}

              <text x={LABEL_W + BAR_W + 8} y={TOP + ROW_H / 2 + 4.5} fill="#aaa" fontSize="11.5">
                {fmtCurrency(clubBar.total)}
              </text>

              {[...clubBar.players].reverse().map((p, j) => (
                <circle
                  key={j}
                  cx={LABEL_W + BAR_W + TOTAL_W + p.sal * dotScale}
                  cy={TOP + ROW_H / 2}
                  r={4.5}
                  fill={posColor(p.pos)}
                  fillOpacity={0.82}
                  stroke="#1a1a2e"
                  strokeWidth={0.5}
                  style={{ cursor: 'pointer' }}
                  onMouseMove={e => showTip(e, `${p.name}\n${p.pos} · ${fmtCurrency(p.sal)}`)}
                  onMouseLeave={hideTip}
                />
              ))}

              {clubBar.topPlayer && clubBar.topPlayer.sal > 0 && (
                <text
                  x={LABEL_W + BAR_W + TOTAL_W + clubBar.topPlayer.sal * dotScale + 9}
                  y={TOP + ROW_H / 2 + 4}
                  fill="#bbb"
                  fontSize="11"
                >
                  {clubBar.topPlayer.name}
                </text>
              )}
            </g>
          </svg>
        </div>
      </div>

      {tooltip && (
        <div className="overview-tooltip" style={{ left: tooltip.x - 14, top: tooltip.y - 12, transform: 'translateX(-100%)' }}>
          {tooltip.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function CalloutCard({ label, value, pct }) {
  const hasChange = pct !== null && pct !== undefined && isFinite(pct)
  const isUp = pct > 0
  const arrow = isUp ? '▲' : '▼'
  const color = isUp ? '#18bc9c' : '#e74c3c'

  return (
    <div className="cp-card">
      <div className="cp-card-label">{label}</div>
      <div className="cp-card-value">{value}</div>
      {hasChange && (
        <div className="cp-card-change" style={{ color }}>
          <span className="cp-card-arrow">{arrow}</span> {Math.abs(pct).toFixed(1)}%
        </div>
      )}
      {!hasChange && <div className="cp-card-change cp-card-na">N/A</div>}
    </div>
  )
}


