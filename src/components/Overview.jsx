import { useState, useMemo } from 'react'

function posColor(pos) {
  if (pos === 'Goalkeeper') return '#e84393'
  if (['Defender', 'Center-back', 'Right-back', 'Left-back'].includes(pos)) return '#00b4d8'
  if (['Defensive Midfield', 'Central Midfield', 'Midfielder', 'Right Midfield', 'Left Midfield', 'Attacking Midfield'].includes(pos)) return '#06d6a0'
  if (['Right Wing', 'Left Wing', 'Forward', 'Center Forward'].includes(pos)) return '#ffd166'
  return '#636e72'
}

const POSITION_ORDER = {
  Goalkeeper: 0,
  Defender: 1, 'Center-back': 1, 'Right-back': 1, 'Left-back': 1,
  'Defensive Midfield': 2, 'Central Midfield': 2, 'Midfielder': 2, 'Right Midfield': 2, 'Left Midfield': 2, 'Attacking Midfield': 2,
  'Right Wing': 3, 'Left Wing': 3, Forward: 3, 'Center Forward': 3,
}

const LEGEND = [
  { label: 'Goalkeepers', color: '#e84393' },
  { label: 'Defenders', color: '#00b4d8' },
  { label: 'Midfielders', color: '#06d6a0' },
  { label: 'Attackers', color: '#ffd166' },
]

// Layout constants
const ROW_H = 20, ROW_GAP = 6, STEP = ROW_H + ROW_GAP
const LABEL_W = 180, BAR_W = 400, TOTAL_W = 115, DOT_W = 320, NAME_W = 120
const TOP = 28
const SVG_W = LABEL_W + BAR_W + TOTAL_W + DOT_W + NAME_W

function fmtCurrency(v) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v)
}

export default function Overview({ data }) {
  const years = useMemo(
    () => [...new Set(data.map(d => d.Year))].sort((a, b) => b - a),
    [data],
  )
  const [selectedYear, setSelectedYear] = useState(years[0])
  const [tooltip, setTooltip] = useState(null)

  const { clubs, maxIndiv } = useMemo(() => {
    const yearData = data.filter(d => d.Year === selectedYear)
    const map = {}
    yearData.forEach(p => {
      if (!map[p.Club]) map[p.Club] = []
      map[p.Club].push({
        name: p.Name,
        pos: p.Position,
        sal: p['Guaranteed Comp'] || 0,
      })
    })

    const clubs = Object.entries(map)
      .map(([club, players]) => {
        players.sort((a, b) => {
          const posA = POSITION_ORDER[a.pos] ?? 9
          const posB = POSITION_ORDER[b.pos] ?? 9
          return posA !== posB ? posA - posB : b.sal - a.sal
        })
        const total = players.reduce((s, p) => s + p.sal, 0)
        return { club, players, total }
      })
      .sort((a, b) => b.total - a.total)

    const maxTotal = Math.max(...clubs.map(c => c.total), 1)
    const maxIndiv = Math.max(...clubs.flatMap(c => c.players.map(p => p.sal)), 1)

    // Precompute stacked-bar segment x-offsets
    const barScale = BAR_W / maxTotal
    clubs.forEach(c => {
      let x = 0
      c.segs = c.players.map(p => {
        const w = Math.max(p.sal * barScale, 0.5)
        const seg = { ...p, x, w }
        x += w
        return seg
      })
    })

    return { clubs, maxTotal, maxIndiv }
  }, [data, selectedYear])

  const SVG_H = TOP + clubs.length * STEP + 10
  const dotScale = DOT_W / maxIndiv

  const showTip = (e, text) =>
    setTooltip({ x: e.clientX, y: e.clientY, text })
  const hideTip = () => setTooltip(null)

  return (
    <div className="overview-page">
      <div className="overview-header">
        <div className="overview-year-select">
          <label>Year</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
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

      <div className="overview-chart-wrap">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width={SVG_W} height={SVG_H}>
          {/* Section headers */}
          <text
            x={LABEL_W + BAR_W * 0.5}
            y={16}
            textAnchor="middle"
            fill="#ccc"
            fontSize="13"
            fontWeight="700"
          >
            Total Salaries
            <tspan dx="8" fontWeight="400" fontStyle="italic" fontSize="11" fill="#888">
              Bars segmented by player
            </tspan>
          </text>
          <text
            x={LABEL_W + BAR_W + TOTAL_W + DOT_W * 0.5}
            y={16}
            textAnchor="middle"
            fill="#ccc"
            fontSize="13"
            fontWeight="700"
          >
            Individual Salaries
          </text>

          {/* Vertical separator between sections */}
          <line
            x1={LABEL_W + BAR_W + TOTAL_W - 8}
            y1={TOP - 4}
            x2={LABEL_W + BAR_W + TOTAL_W - 8}
            y2={SVG_H - 4}
            stroke="#445"
            strokeDasharray="4 3"
          />

          {clubs.map((c, i) => {
            const y = TOP + i * STEP
            const top = c.players.reduce((best, p) => (!best || p.sal > best.sal ? p : best), null)

            return (
              <g key={c.club}>
                {/* Dashed row separator */}
                <line
                  x1={LABEL_W}
                  y1={y + STEP - ROW_GAP / 2}
                  x2={SVG_W - NAME_W}
                  y2={y + STEP - ROW_GAP / 2}
                  stroke="#334"
                  strokeWidth={0.5}
                  strokeDasharray="2 3"
                />

                {/* Team name */}
                <text
                  x={LABEL_W - 10}
                  y={y + ROW_H / 2 + 4.5}
                  textAnchor="end"
                  fill="#ddd"
                  fontSize="12"
                >
                  {c.club}
                </text>

                {/* Stacked bar segments */}
                {c.segs.map((s, j) => (
                  <rect
                    key={j}
                    x={LABEL_W + s.x}
                    y={y}
                    width={s.w}
                    height={ROW_H}
                    fill={posColor(s.pos)}
                    stroke="#1a1a2e"
                    strokeWidth={0.4}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={e =>
                      showTip(e, `${s.name}\n${s.pos} · ${fmtCurrency(s.sal)}`)
                    }
                    onMouseLeave={hideTip}
                  />
                ))}

                {/* Total salary label */}
                <text
                  x={LABEL_W + BAR_W + 8}
                  y={y + ROW_H / 2 + 4.5}
                  fill="#aaa"
                  fontSize="11.5"
                >
                  {fmtCurrency(c.total)}
                </text>

                {/* Individual salary dots (render smallest first) */}
                {[...c.players].reverse().map((p, j) => (
                  <circle
                    key={j}
                    cx={LABEL_W + BAR_W + TOTAL_W + p.sal * dotScale}
                    cy={y + ROW_H / 2}
                    r={4.5}
                    fill={posColor(p.pos)}
                    fillOpacity={0.82}
                    stroke="#1a1a2e"
                    strokeWidth={0.5}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={e =>
                      showTip(e, `${p.name}\n${p.pos} · ${fmtCurrency(p.sal)}`)
                    }
                    onMouseLeave={hideTip}
                  />
                ))}

                {/* Highest-paid player name */}
                {top && top.sal > 0 && (
                  <text
                    x={LABEL_W + BAR_W + TOTAL_W + top.sal * dotScale + 9}
                    y={y + ROW_H / 2 + 4}
                    fill="#bbb"
                    fontSize="11"
                  >
                    {top.name}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {tooltip && (
        <div
          className="overview-tooltip"
          style={{ left: tooltip.x + 14, top: tooltip.y - 12 }}
        >
          {tooltip.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}
