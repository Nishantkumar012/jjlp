/**
 * Date range filtering utilities for forecast and actual generation data
 * Implements inclusive start date, exclusive end date filtering
 */

/**
 * Filter records by delivery date range
 *
 * @param {Array} records - Array of records with startTime field (ISO 8601 format)
 * @param {string} fromDate - Start date (YYYY-MM-DD), inclusive
 * @param {string} toDate - End date (YYYY-MM-DD), inclusive (converted to exclusive internally)
 * @returns {Array} Filtered records where startTime falls within [fromDate, dayAfter(toDate))
 */
export const filterRecordsByDateRange = (records, fromDate, toDate) => {
  if (!records || records.length === 0) {
    return []
  }

  const fromDateTime = new Date(fromDate).getTime()
  const toDateTime = new Date(toDate).getTime()
  // Add 24 hours to toDate to make upper bound exclusive (entire end day is included)
  const dayAfterToDateTime = toDateTime + (24 * 60 * 60 * 1000)

  return records.filter(record => {
    try {
      const startTime = new Date(record.startTime).getTime()
      return startTime >= fromDateTime && startTime < dayAfterToDateTime
    } catch (e) {
      console.warn(`Invalid startTime in record: ${record.startTime}`)
      return false
    }
  })
}

/**
 * Combine forecast and actual records into a single chart dataset
 * Matches delivery intervals and preserves publishTime for each record
 *
 * @param {Array} forecasts - Filtered forecast records
 * @param {Array} actuals - Filtered actual generation records
 * @returns {Array} Combined records with matching delivery intervals
 */
export const combineForecatsAndActuals = (forecasts, actuals) => {
  const chartData = {}

  // Add forecast data
  if (forecasts && forecasts.length > 0) {
    forecasts.forEach(f => {
      const time = new Date(f.startTime).getTime()
      if (!chartData[time]) {
        chartData[time] = {
          time,
          startTime: f.startTime,
          forecast: f.generation,
          forecastPublishTime: f.publishTime
        }
      } else {
        // Use latest forecast for this delivery interval
        chartData[time].forecast = f.generation
        chartData[time].forecastPublishTime = f.publishTime
      }
    })
  }

  // Add actual data to matching delivery intervals
  if (actuals && actuals.length > 0) {
    actuals.forEach(a => {
      const time = new Date(a.startTime).getTime()
      if (!chartData[time]) {
        chartData[time] = {
          time,
          startTime: a.startTime,
          actual: a.generation,
          actualPublishTime: a.publishTime
        }
      } else {
        chartData[time].actual = a.generation
        chartData[time].actualPublishTime = a.publishTime
      }
    })
  }

  // Convert to array and sort by time
  return Object.values(chartData).sort((a, b) => a.time - b.time)
}

/**
 * Get filtering summary statistics
 *
 * @param {Array} filteredForecasts - Forecast records after filtering
 * @param {Array} filteredActuals - Actual records after filtering
 * @returns {Object} Summary statistics
 */
export const getFilteringSummary = (filteredForecasts, filteredActuals) => {
  const chartData = combineForecatsAndActuals(filteredForecasts, filteredActuals)

  const forecastCount = filteredForecasts ? filteredForecasts.length : 0
  const actualCount = filteredActuals ? filteredActuals.length : 0
  const totalDeliveryIntervals = chartData.length
  const matchedIntervals = chartData.filter(
    d => d.forecast !== undefined && d.actual !== undefined
  ).length
  const missingForecasts = chartData.filter(d => d.forecast === undefined).length
  const missingActuals = chartData.filter(d => d.actual === undefined).length

  return {
    forecastCount,
    actualCount,
    totalDeliveryIntervals,
    matchedIntervals,
    missingForecasts,
    missingActuals
  }
}

/**
 * Validate date range
 *
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @returns {Object} Validation result with isValid flag and error message if invalid
 */
export const validateDateRange = (fromDate, toDate) => {
  try {
    const from = new Date(fromDate)
    const to = new Date(toDate)

    if (isNaN(from.getTime())) {
      return { isValid: false, error: `Invalid from date: ${fromDate}` }
    }

    if (isNaN(to.getTime())) {
      return { isValid: false, error: `Invalid to date: ${toDate}` }
    }

    if (from > to) {
      return { isValid: false, error: 'Start date cannot be after end date' }
    }

    return { isValid: true }
  } catch (error) {
    return { isValid: false, error: error.message }
  }
}

/**
 * Format date for display (e.g., "Jan 15 - Jan 17, 2026")
 *
 * @param {string} fromDate - Start date (YYYY-MM-DD)
 * @param {string} toDate - End date (YYYY-MM-DD)
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (fromDate, toDate) => {
  try {
    const from = new Date(fromDate)
    const to = new Date(toDate)

    const fromStr = from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const toStr = to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    return `${fromStr} - ${toStr}`
  } catch (error) {
    return `${fromDate} to ${toDate}`
  }
}
