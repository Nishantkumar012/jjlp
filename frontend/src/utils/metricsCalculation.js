/**
 * Forecast accuracy metrics calculation utilities
 * Calculates MAE, RMSE, MAPE from forecast and actual data
 */

/**
 * Calculate Mean Absolute Error (MAE)
 * @param {Array} forecasts - Array of forecast values
 * @param {Array} actuals - Array of actual values
 * @returns {number} MAE in MW
 */
export const calculateMAE = (forecasts, actuals) => {
  if (!forecasts || !actuals || forecasts.length === 0 || forecasts.length !== actuals.length) {
    return 0
  }

  const errors = forecasts.map((f, i) => Math.abs(f - actuals[i]))
  return errors.reduce((sum, err) => sum + err, 0) / errors.length
}

/**
 * Calculate Root Mean Square Error (RMSE)
 * @param {Array} forecasts - Array of forecast values
 * @param {Array} actuals - Array of actual values
 * @returns {number} RMSE in MW
 */
export const calculateRMSE = (forecasts, actuals) => {
  if (!forecasts || !actuals || forecasts.length === 0 || forecasts.length !== actuals.length) {
    return 0
  }

  const squaredErrors = forecasts.map((f, i) => Math.pow(f - actuals[i], 2))
  const meanSquaredError = squaredErrors.reduce((sum, err) => sum + err, 0) / squaredErrors.length
  return Math.sqrt(meanSquaredError)
}

/**
 * Calculate Mean Absolute Percentage Error (MAPE)
 * @param {Array} forecasts - Array of forecast values
 * @param {Array} actuals - Array of actual values
 * @returns {number} MAPE as percentage
 */
export const calculateMAPE = (forecasts, actuals) => {
  if (!forecasts || !actuals || forecasts.length === 0 || forecasts.length !== actuals.length) {
    return 0
  }

  // Filter out zero actuals to avoid division by zero
  const validPairs = forecasts
    .map((f, i) => ({ forecast: f, actual: actuals[i] }))
    .filter(pair => pair.actual !== 0)

  if (validPairs.length === 0) {
    return 0
  }

  const percentageErrors = validPairs.map(pair =>
    Math.abs((pair.forecast - pair.actual) / pair.actual)
  )

  const meanError = percentageErrors.reduce((sum, err) => sum + err, 0) / percentageErrors.length
  return meanError * 100
}

/**
 * Match forecast and actual data by delivery interval (startTime)
 * @param {Array} forecasts - Forecast records with startTime and generation
 * @param {Array} actuals - Actual records with startTime and generation
 * @returns {Object} { forecastValues, actualValues, matchedCount }
 */
export const matchForecastsAndActuals = (forecasts, actuals) => {
  if (!forecasts || !actuals) {
    return { forecastValues: [], actualValues: [], matchedCount: 0 }
  }

  // Create maps keyed by startTime
  const forecastMap = {}
  const actualMap = {}

  forecasts.forEach(f => {
    if (f.startTime) {
      forecastMap[f.startTime] = f.generation
    }
  })

  actuals.forEach(a => {
    if (a.startTime) {
      actualMap[a.startTime] = a.generation
    }
  })

  // Find common timestamps
  const forecastTimes = Object.keys(forecastMap)
  const actualTimes = Object.keys(actualMap)
  const commonTimes = forecastTimes.filter(t => actualTimes.includes(t))

  if (commonTimes.length === 0) {
    return { forecastValues: [], actualValues: [], matchedCount: 0 }
  }

  // Extract matched values
  const forecastValues = commonTimes.map(t => forecastMap[t])
  const actualValues = commonTimes.map(t => actualMap[t])

  return {
    forecastValues,
    actualValues,
    matchedCount: commonTimes.length
  }
}

/**
 * Calculate all metrics from forecast and actual data
 * @param {Array} forecasts - Forecast records (filtered by date range)
 * @param {Array} actuals - Actual records (filtered by date range)
 * @returns {Object} { mae, rmse, mape, data_points }
 */
export const calculateAllMetrics = (forecasts, actuals) => {
  const { forecastValues, actualValues, matchedCount } = matchForecastsAndActuals(
    forecasts,
    actuals
  )

  return {
    mae: calculateMAE(forecastValues, actualValues),
    rmse: calculateRMSE(forecastValues, actualValues),
    mape: calculateMAPE(forecastValues, actualValues),
    data_points: matchedCount
  }
}

/**
 * Format metrics for display
 * @param {Object} metrics - Metrics object with mae, rmse, mape, data_points
 * @returns {Object} Formatted metrics with display values
 */
export const formatMetrics = (metrics) => {
  return {
    mae: metrics.mae > 0 ? metrics.mae.toFixed(2) : 'N/A',
    rmse: metrics.rmse > 0 ? metrics.rmse.toFixed(2) : 'N/A',
    mape: metrics.mape > 0 ? metrics.mape.toFixed(2) : 'N/A',
    data_points: metrics.data_points || 0
  }
}
