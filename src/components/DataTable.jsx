import { useState, useMemo } from 'react'
import CheckboxDropdown from './CheckboxDropdown'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

const POSITIONS = [
  'Goalkeeper', 'Defender', 'Center-back', 'Right-back', 'Left-back',
  'Defensive Midfield', 'Central Midfield', 'Midfielder', 'Right Midfield', 'Left Midfield',
  'Attacking Midfield', 'Right Wing', 'Left Wing',
  'Forward', 'Center Forward', 'Substitute', 'Unknown',
]
const PAGE_SIZE = 25

function formatCurrency(value) {
  if (value == null) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(value)
}

export default function DataTable({ data }) {
  const clubs = useMemo(() => [...new Set(data.map(d => d.Club))].sort(), [data])
  const years = useMemo(() => [...new Set(data.map(d => d.Year))].sort((a, b) => b - a), [data])

  const [selectedClubs, setSelectedClubs] = useState(clubs)
  const [selectedPositions, setSelectedPositions] = useState([...POSITIONS])
  const [selectedYears, setSelectedYears] = useState(years)
  const [sortConfig, setSortConfig] = useState({ key: 'Club', dir: 'asc' })
  const [page, setPage] = useState(0)

  const clubOptions = useMemo(() => clubs.map(c => ({ value: c, label: c })), [clubs])
  const positionOptions = useMemo(() => POSITIONS.map(p => ({ value: p, label: p })), [])
  const yearOptions = useMemo(() => years.map(y => ({ value: y, label: String(y) })), [years])

  // Filter + sort
  const filteredData = useMemo(() => {
    const result = data.filter(row =>
      selectedClubs.includes(row.Club) &&
      selectedPositions.includes(row.Position) &&
      selectedYears.includes(row.Year)
    )
    return [...result].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string') {
        return sortConfig.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortConfig.dir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [data, selectedClubs, selectedPositions, selectedYears, sortConfig])

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE)
  const pageData = filteredData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = key => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Export helpers
  const buildExportRows = () =>
    filteredData.map(row => ({
      Name: row.Name,
      Club: row.Club,
      Year: row.Year,
      Position: row.Position,
      'Base Salary': formatCurrency(row['Base Salary']),
      'Guaranteed Comp': formatCurrency(row['Guaranteed Comp']),
    }))

  const exportCSV = () => {
    const rows = buildExportRows()
    const headers = Object.keys(rows[0] || {})
    const csv = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'mls_salaries_export.csv')
  }

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Salaries')
    XLSX.writeFile(wb, 'mls_salaries_export.xlsx')
  }

  const sortIndicator = key => {
    if (sortConfig.key !== key) return ''
    return sortConfig.dir === 'asc' ? ' \u25B2' : ' \u25BC'
  }

  const columns = ['Name', 'Club', 'Year', 'Position', 'Base Salary', 'Guaranteed Comp']

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

        <label>Year</label>
        <CheckboxDropdown
          options={yearOptions}
          selected={selectedYears}
          onChange={setSelectedYears}
        />

        <div className="sidebar-actions">
          <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
          <button className="btn-secondary" onClick={exportXLSX}>Export XLSX</button>
        </div>
      </aside>

      <section className="main-panel">
        <div className="table-info">
          Showing {filteredData.length.toLocaleString()} records
          {totalPages > 1 && ` \u2022 Page ${page + 1} of ${totalPages}`}
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} className="sortable" onClick={() => handleSort(col)}>
                    {col}{sortIndicator(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>No records match the current filters.</td></tr>
              ) : (
                pageData.map((row, i) => (
                  <tr key={`${row.Name}-${row.Club}-${row.Year}-${i}`}>
                    <td>{row.Name}</td>
                    <td>{row.Club}</td>
                    <td>{row.Year}</td>
                    <td>{row.Position}</td>
                    <td className="numeric">{formatCurrency(row['Base Salary'])}</td>
                    <td className="numeric">{formatCurrency(row['Guaranteed Comp'])}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage(0)} disabled={page === 0}>&laquo;</button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}>&lsaquo;</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>&rsaquo;</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>&raquo;</button>
          </div>
        )}
      </section>
    </div>
  )
}
