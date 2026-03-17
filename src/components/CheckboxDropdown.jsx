import { useState, useRef, useEffect } from 'react'

export default function CheckboxDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allSelected = selected.length === options.length
  const noneSelected = selected.length === 0

  const toggleAll = () => onChange(allSelected ? [] : options.map(o => o.value))

  const toggleOne = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    )
  }

  const summary =
    noneSelected ? 'None selected'
    : allSelected ? 'All selected'
    : selected.length === 1 ? options.find(o => o.value === selected[0])?.label ?? '1 selected'
    : `${selected.length} selected`

  return (
    <div className="checkbox-dropdown" ref={ref}>
      <button
        type="button"
        className="checkbox-dropdown-toggle"
        onClick={() => setOpen(o => !o)}
      >
        <span className="checkbox-dropdown-summary">{summary}</span>
        <span className="checkbox-dropdown-arrow">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="checkbox-dropdown-menu">
          <label className="checkbox-dropdown-item checkbox-dropdown-selectall">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </label>
          <div className="checkbox-dropdown-divider" />
          {options.map(opt => (
            <label key={opt.value} className="checkbox-dropdown-item">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggleOne(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
