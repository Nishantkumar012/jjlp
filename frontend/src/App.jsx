import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import ForecastChart from './components/ForecastChart'
import AccuracyMetrics from './components/AccuracyMetrics'
import DateRangePicker from './components/DateRangePicker'
import { fetchForecasts, fetchForecastsHistorical, fetchMetrics } from './services/api'
import { filterRecordsByDateRange, getFilteringSummary } from './utils/dateFiltering'
import { calculateAllMetrics, formatMetrics } from './utils/metricsCalculation'
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
  const [allForecasts, setAllForecasts] = useState([])
  const [allActuals, setAllActuals] = useState([])

  const filterDataByDateRange = (forecastList, actualList, fromDate, toDate) => {
    // Filter forecast and actual data to only include delivery intervals
    // within the selected date range using utility functions.
    // Filtering logic:
    // - startTime >= selectedStartDate (inclusive)
    // - startTime < dayAfterSelectedEndDate (exclusive upper bound)

    const filteredForecasts = filterRecordsByDateRange(forecastList, fromDate, toDate)
    const filteredActuals = filterRecordsByDateRange(actualList, fromDate, toDate)

    const summary = getFilteringSummary(filteredForecasts, filteredActuals)
    console.log(`📊 Filtered to ${summary.forecastCount} forecasts and ${summary.actualCount} actuals for ${fromDate} to ${toDate}`)
    console.log(`   Total delivery intervals: ${summary.totalDeliveryIntervals}, Matched: ${summary.matchedIntervals}`)
    if (summary.missingForecasts > 0 || summary.missingActuals > 0) {
      console.log(`   Missing - Forecasts: ${summary.missingForecasts}, Actuals: ${summary.missingActuals}`)
    }

    return { filteredForecasts, filteredActuals }
  }

  const loadData = async (fromDate, toDate) => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if requested range is January 2026
      const isJanuary2026 = fromDate.startsWith('2026-01') && toDate.startsWith('2026-01')

      let forecastsData
      if (isJanuary2026) {
        // Use historical endpoint for January 2026 (supports past data with expanded window)
        console.log(`📊 Using historical forecasts for ${fromDate} to ${toDate}`)
        forecastsData = await fetchForecastsHistorical(fromDate, toDate)
      } else {
        // Use regular endpoint for other date ranges (current/recent data)
        console.log(`📊 Using regular forecasts for ${fromDate} to ${toDate}`)
        forecastsData = await fetchForecasts(fromDate, toDate)
      }

      // Store all unfiltered data for potential reuse
      const fullForecasts = forecastsData.forecasts || []
      const fullActuals = forecastsData.actuals || []

      setAllForecasts(fullForecasts)
      setAllActuals(fullActuals)

      // Filter data to selected date range for chart display
      const { filteredForecasts, filteredActuals } = filterDataByDateRange(
        fullForecasts,
        fullActuals,
        fromDate,
        toDate
      )

      setForecasts(filteredForecasts)
      setActuals(filteredActuals)

      // Calculate metrics from FILTERED data (not full dataset)
      const calculatedMetrics = calculateAllMetrics(filteredForecasts, filteredActuals)
      const formattedMetrics = formatMetrics(calculatedMetrics)

      console.log(`📊 Metrics calculated from ${calculatedMetrics.data_points} matched intervals`)
      console.log(`   MAE: ${formattedMetrics.mae} MW, RMSE: ${formattedMetrics.rmse} MW, MAPE: ${formattedMetrics.mape}%`)

      setMetrics({
        mae: calculatedMetrics.mae,
        rmse: calculatedMetrics.rmse,
        mape: calculatedMetrics.mape,
        data_points: calculatedMetrics.data_points
      })

      setCurrentDateRange({ from: fromDate, to: toDate })
    } catch (err) {
      setError(`Failed to load data: ${err.message}`)
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load historical January 2026 data on mount
  useEffect(() => {
    const loadHistoricalData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchForecastsHistorical('2026-01-01', '2026-01-31')
        const fullForecasts = data.forecasts || []
        const fullActuals = data.actuals || []

        // Store all unfiltered data
        setAllForecasts(fullForecasts)
        setAllActuals(fullActuals)

        // Filter to default date range (full January 2026)
        const { filteredForecasts, filteredActuals } = filterDataByDateRange(
          fullForecasts,
          fullActuals,
          '2026-01-01',
          '2026-01-31'
        )

        setForecasts(filteredForecasts)
        setActuals(filteredActuals)

        // Calculate metrics from FILTERED data
        const calculatedMetrics = calculateAllMetrics(filteredForecasts, filteredActuals)
        const formattedMetrics = formatMetrics(calculatedMetrics)

        console.log(`📊 Initial metrics calculated from ${calculatedMetrics.data_points} matched intervals`)
        console.log(`   MAE: ${formattedMetrics.mae} MW, RMSE: ${formattedMetrics.rmse} MW, MAPE: ${formattedMetrics.mape}%`)

        setMetrics({
          mae: calculatedMetrics.mae,
          rmse: calculatedMetrics.rmse,
          mape: calculatedMetrics.mape,
          data_points: calculatedMetrics.data_points
        })

        setCurrentDateRange({
          from: '2026-01-01',
          to: '2026-01-31'
        })
      } catch (err) {
        setError(`Failed to load historical forecast data: ${err.message}`)
        console.error('Error loading historical data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadHistoricalData()
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
