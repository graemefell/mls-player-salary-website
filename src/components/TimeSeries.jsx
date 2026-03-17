import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import CheckboxDropdown from './CheckboxDropdown'
import { clubColors } from '../data/clubColors'

const POSITIONS = [
  'Goalkeeper', 'Defender', 'Center-back', 'Right-back', 'Left-back',
  'Defensive Midfield', 'Central Midfield', 'Midfielder', 'Right Midfield', 'Left Midfield',
  'Attacking Midfield', 'Right Wing', 'Left Wing',
  'Forward', 'Center Forward', 'Substitute', 'Unknown',
]

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

export default function TimeSeries({ data }) {
  // Derive unique clubs & years from data
  const clubs = useMemo(() => [...new Set(data.map(d => d.Club))].sort(), [data])
  const years = useMemo(() => [...new Set(data.map(d => d.Year))].sort((a, b) => a - b), [data])

  // Filter state
  const [selectedClubs, setSelectedClubs] = useState(clubs)
  const [selectedPositions, setSelectedPositions] = useState([...POSITIONS])
  const [yearMin, setYearMin] = useState(years[0])
  const [yearMax, setYearMax] = useState(years[years.length - 1])
  const [hoveredClub, setHoveredClub] = useState(null)

  const clubOptions = useMemo(() => clubs.map(c => ({ value: c, label: c })), [clubs])
  const positionOptions = useMemo(() => POSITIONS.map(p => ({ value: p, label: p })), [])

  // ── Compute chart data (filter → group → pivot) ──────────
  const chartData = useMemo(() => {
    const filtered = data.filter(row =>
      selectedClubs.includes(row.Club) &&
      selectedPositions.includes(row.Position) &&
      row.Year >= yearMin && row.Year <= yearMax
    )

    // Group by Club + Year, sum Guaranteed Comp
    const grouped = {}
    filtered.forEach(row => {
      const key = `${row.Club}|${row.Year}`
      if (!grouped[key]) grouped[key] = { Club: row.Club, Year: row.Year, total: 0 }
      grouped[key].total += (row['Guaranteed Comp'] || 0)
    })

    const activeClubs = [...new Set(Object.values(grouped).map(g => g.Club))].sort()
    const activeYears = [...new Set(Object.values(grouped).map(g => g.Year))].sort((a, b) => a - b)

    // Pivot: each row = { Year, ClubA: val, ClubB: val, ... }
    const pivoted = activeYears.map(year => {
      const row = { Year: year }
      activeClubs.forEach(club => {
        const match = grouped[`${club}|${year}`]
        row[club] = match ? match.total : null
      })
      return row
    })

    return { pivoted, activeClubs }
  }, [data, selectedClubs, selectedPositions, yearMin, yearMax])

  // Dynamic title (matches Shiny app logic)
  const allClubsSelected = selectedClubs.length === clubs.length
  const allPositionsSelected = selectedPositions.length === POSITIONS.length
  const title = (allClubsSelected && allPositionsSelected)
    ? `Guaranteed Compensation by Club, ${yearMin}\u2013${yearMax}`
    : `Guaranteed Compensation by Club, with selected filters, ${yearMin}\u2013${yearMax}`

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <h4>Select Filters</h4>

        <label>Club</label>
        <CheckboxDropdown
          options={clubOptions}
          selected={selectedClubs}
          onChange={setSelectedClubs}
        />

        <label>Position</label>
        <CheckboxDropdown
          options={positionOptions}
          selected={selectedPositions}
          onChange={setSelectedPositions}
        />

        <label>Year Range</label>
        <div className="year-range">
          <select value={yearMin} onChange={e => setYearMin(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span>to</span>
          <select value={yearMax} onChange={e => setYearMax(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </aside>

      <section className="main-panel">
        <h3>{title}</h3>
        <ResponsiveContainer width="100%" height={560}>
          <LineChart
            data={chartData.pivoted}
            margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            onMouseLeave={() => setHoveredClub(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="Year"
              type="number"
              domain={[yearMin, yearMax]}
              ticks={years.filter(y => y >= yearMin && y <= yearMax)}
              allowDecimals={false}
            />
            <YAxis
              domain={[0, 'auto']}
              tickFormatter={v => `$${Math.round(v / 1e6)}M`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const visible = payload.filter(p => p.value != null)
                const items = hoveredClub
                  ? visible.filter(p => p.dataKey === hoveredClub)
                  : visible.sort((a, b) => b.value - a.value).slice(0, 5)
                if (!items.length) return null
                return (
                  <div className="chart-tooltip">
                    <strong>{label}</strong>
                    {items.map(item => (
                      <div key={item.dataKey} style={{ color: item.color }}>
                        {item.dataKey}: {formatCurrency(item.value)}
                      </div>
                    ))}
                    {!hoveredClub && visible.length > 5 && (
                      <div className="tooltip-more">+{visible.length - 5} more</div>
                    )}
                  </div>
                )
              }}
            />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '11px', paddingTop: '12px', maxHeight: '110px', overflowY: 'auto' }}
              iconSize={10}
            />
            {chartData.activeClubs.map(club => (
              <Line
                key={club}
                type="monotone"
                dataKey={club}
                name={club}
                stroke={clubColors[club] || '#888888'}
                strokeWidth={hoveredClub === club ? 3 : hoveredClub ? 0.6 : 1.2}
                strokeOpacity={hoveredClub && hoveredClub !== club ? 0.25 : 1}
                dot={false}
                activeDot={{ r: 5 }}
                connectNulls={false}
                onMouseEnter={() => setHoveredClub(club)}
                onMouseLeave={() => setHoveredClub(null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </section>
    </div>
  )
}
