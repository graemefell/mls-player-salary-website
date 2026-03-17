import { useState, useEffect } from 'react'
import Overview from './components/Overview'
import ClubProfile from './components/ClubProfile'
import TimeSeries from './components/TimeSeries'
import DataTable from './components/DataTable'
import About from './components/About'

const TABS = ['Overview', 'Club Profile', 'Time-Series', 'Data', 'About']

const CLUB_NAME_FIXES = {
  'New England Revolutio': 'New England Revolution',
  'Without a Club': 'Unattached',
}

function normalizeClub(name) {
  const trimmed = (name || '').trim()
  return CLUB_NAME_FIXES[trimmed] || trimmed
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/data/salaries.json')
      .then(res => res.json())
      .then(json => {
        const cleaned = json.map(row => ({
          ...row,
          Club: normalizeClub(row.Club),
        }))
        setData(cleaned)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load data:', err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="app">
      <nav className="navbar">
        <span className="navbar-brand">MLS Player Salaries</span>
        <div className="nav-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>
      <main className="main-content">
        {loading ? (
          <div className="loading">Loading data...</div>
        ) : !data ? (
          <div className="error">
            Failed to load data. Make sure you have run <code>Rscript code/convert_to_json.R</code> to
            generate <code>public/data/salaries.json</code>.
          </div>
        ) : (
          <>
            {activeTab === 'Overview' && <Overview data={data} />}
            {activeTab === 'Club Profile' && <ClubProfile data={data} />}
            {activeTab === 'Time-Series' && <TimeSeries data={data} />}
            {activeTab === 'Data' && <DataTable data={data} />}
            {activeTab === 'About' && <About />}
          </>
        )}
      </main>
    </div>
  )
}
