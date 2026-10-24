import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import ForecastChart from './components/ForecastChart'
import AccuracyMetrics from './components/AccuracyMetrics'
import DateRangePicker from './components/DateRangePicker'
import { fetchForecasts, fetchMetrics } from './services/api'
import './App.css'

function App() {
  const [forecasts, setForecasts] = useState([])
  const [actuals, setActuals] = useState([])
  const [metrics, setMetrics] = useState({
    mae: 0,
    rmse: 0,
    mape: 0,
    data_points: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentDateRange, setCurrentDateRange] = useState({
    from: format(new Date(2026, 0, 1), 'yyyy-MM-dd'),
    to: format(new Date(2026, 0, 31), 'yyyy-MM-dd')
  })

  const loadData = async (fromDate, toDate) => {
    setIsLoading(true)
    setError(null)

    try {
      const [forecastsData, metricsData] = await Promise.all([
        fetchForecasts(fromDate, toDate),
        fetchMetrics(fromDate, toDate)
      ])

      setForecasts(forecastsData.forecasts || [])
      setActuals(forecastsData.actuals || [])
      setMetrics({
        mae: metricsData.mae || 0,
        rmse: metricsData.rmse || 0,
        mape: metricsData.mape || 0,
        data_points: metricsData.data_points || 0
      })
      setCurrentDateRange({ from: fromDate, to: toDate })
    } catch (err) {
      setError(`Failed to load data: ${err.message}`)
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load default January 2026 data on mount
  useEffect(() => {
    const defaultFrom = format(new Date(2026, 0, 1), 'yyyy-MM-dd')
    const defaultTo = format(new Date(2026, 0, 31), 'yyyy-MM-dd')
    loadData(defaultFrom, defaultTo)
  }, [])

  const handleDateChange = (fromDate, toDate) => {
    loadData(fromDate, toDate)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>UK Wind Power Forecasting Portal</h1>
        <p className="subtitle">Day-Ahead Market Intelligence</p>
      </header>

      <main className="app-main">
        <div className="container">
          {error && (
            <div className="error-banner">
              <p>{error}</p>
            </div>
          )}

          <DateRangePicker
            onDateChange={handleDateChange}
            isLoading={isLoading}
          />

          <ForecastChart
            forecasts={forecasts}
            actuals={actuals}
            isLoading={isLoading}
          />

          <AccuracyMetrics
            mae={metrics.mae}
            rmse={metrics.rmse}
            mape={metrics.mape}
            dataPoints={metrics.data_points}
            isLoading={isLoading}
          />

          {currentDateRange && (
            <div className="info-section">
              <p className="data-range">
                <strong>Date Range:</strong> {currentDateRange.from} to {currentDateRange.to}
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Data sourced from Elexon BMRS API</p>
      </footer>
    </div>
  )
}

export default App
