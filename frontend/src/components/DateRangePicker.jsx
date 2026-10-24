import { useState } from 'react'
import { format, subDays } from 'date-fns'

const DateRangePicker = ({ onDateChange, isLoading }) => {
  // Default to January 2026 (our historical forecast data range)
  const defaultTo = new Date(2026, 0, 31)
  const defaultFrom = new Date(2026, 0, 1)

  // Date constraints - January 2026 only
  const minDate = format(defaultFrom, 'yyyy-MM-dd')
  const maxDate = format(defaultTo, 'yyyy-MM-dd')

  const [fromDate, setFromDate] = useState(format(defaultFrom, 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(defaultTo, 'yyyy-MM-dd'))

  const handleApply = () => {
    // Validate dates are within range
    if (fromDate < minDate || fromDate > maxDate) {
      alert('Start date must be between 1 January 2026 and 31 January 2026')
      return
    }
    if (toDate < minDate || toDate > maxDate) {
      alert('End date must be between 1 January 2026 and 31 January 2026')
      return
    }
    if (fromDate > toDate) {
      alert('Start date cannot be after end date')
      return
    }
    onDateChange(fromDate, toDate)
  }

  const handleReset = () => {
    const newFrom = format(defaultFrom, 'yyyy-MM-dd')
    const newTo = format(defaultTo, 'yyyy-MM-dd')
    setFromDate(newFrom)
    setToDate(newTo)
    onDateChange(newFrom, newTo)
  }

  return (
    <div className="date-picker-container">
      <h2>Select Date Range</h2>
      <p className="date-range-info">📅 January 1–31, 2026</p>
      <div className="date-inputs">
        <div className="date-input-group">
          <label htmlFor="from-date">From Date</label>
          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            min={minDate}
            max={maxDate}
            disabled={isLoading}
          />
        </div>

        <div className="date-input-group">
          <label htmlFor="to-date">To Date</label>
          <input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={minDate}
            max={maxDate}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="date-buttons">
        <button
          onClick={handleApply}
          disabled={isLoading}
          className="btn btn-primary"
        >
          {isLoading ? 'Loading...' : 'Apply'}
        </button>
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          Reset to January 2026
        </button>
      </div>
    </div>
  )
}

export default DateRangePicker
