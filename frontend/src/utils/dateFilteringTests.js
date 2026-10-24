/**
 * Test utilities for date range filtering logic
 * Tests inclusive start date, exclusive end date, matching intervals, and missing records
 */

/**
 * Filter data by delivery date range (inclusive start, exclusive end)
 * @param {Array} data - Array of records with startTime field
 * @param {string} fromDate - Start date (YYYY-MM-DD), inclusive
 * @param {string} toDate - End date (YYYY-MM-DD), inclusive (converted to exclusive internally)
 * @returns {Array} Filtered records
 */
export const filterByDeliveryDateRange = (data, fromDate, toDate) => {
  const fromDateTime = new Date(fromDate).getTime()
  const toDateTime = new Date(toDate).getTime()
  const dayAfterToDateTime = toDateTime + (24 * 60 * 60 * 1000)

  return data.filter(record => {
    const startTime = new Date(record.startTime).getTime()
    return startTime >= fromDateTime && startTime < dayAfterToDateTime
  })
}

/**
 * Test: Date range filtering with inclusive start and exclusive end
 */
export const testDateRangeFiltering = () => {
  const testData = [
    { startTime: '2026-01-01T00:00:00Z', generation: 100 },
    { startTime: '2026-01-15T12:00:00Z', generation: 150 },
    { startTime: '2026-01-17T23:59:59Z', generation: 200 },
    { startTime: '2026-01-18T00:00:00Z', generation: 250 }, // Should be excluded
    { startTime: '2026-01-31T23:59:59Z', generation: 300 },
    { startTime: '2026-02-01T00:00:00Z', generation: 350 }, // Should be excluded
  ]

  const result = filterByDeliveryDateRange(testData, '2026-01-15', '2026-01-17')

  const expected = [
    { startTime: '2026-01-15T12:00:00Z', generation: 150 },
    { startTime: '2026-01-17T23:59:59Z', generation: 200 },
  ]

  console.assert(result.length === 2, `Expected 2 records, got ${result.length}`)
  console.assert(
    result[0].startTime === expected[0].startTime,
    `Expected first record to be ${expected[0].startTime}, got ${result[0].startTime}`
  )
  console.assert(
    result[1].startTime === expected[1].startTime,
    `Expected last record to be ${expected[1].startTime}, got ${result[1].startTime}`
  )

  console.log('✅ Date range filtering test passed')
  return result
}

/**
 * Test: Inclusive end date (should include entire end day)
 */
export const testInclusiveEndDate = () => {
  const testData = [
    { startTime: '2026-01-17T00:00:00Z', generation: 100 },
    { startTime: '2026-01-17T12:00:00Z', generation: 150 },
    { startTime: '2026-01-17T23:59:59Z', generation: 200 },
    { startTime: '2026-01-18T00:00:00Z', generation: 250 }, // Should be excluded
  ]

  const result = filterByDeliveryDateRange(testData, '2026-01-17', '2026-01-17')

  console.assert(result.length === 3, `Expected 3 records on 2026-01-17, got ${result.length}`)
  console.assert(
    result.every(r => r.startTime.startsWith('2026-01-17')),
    'All results should be from 2026-01-17'
  )

  console.log('✅ Inclusive end date test passed')
  return result
}

/**
 * Test: Matching delivery intervals between forecasts and actuals
 */
export const testMatchingDeliveryIntervals = () => {
  const forecasts = [
    { startTime: '2026-01-15T00:00:00Z', generation: 100 },
    { startTime: '2026-01-15T01:00:00Z', generation: 110 },
    { startTime: '2026-01-16T00:00:00Z', generation: 120 },
  ]

  const actuals = [
    { startTime: '2026-01-15T00:00:00Z', generation: 105 },
    { startTime: '2026-01-15T01:00:00Z', generation: 115 },
    { startTime: '2026-01-17T00:00:00Z', generation: 140 }, // Unmatched
  ]

  const filteredForecasts = filterByDeliveryDateRange(forecasts, '2026-01-15', '2026-01-16')
  const filteredActuals = filterByDeliveryDateRange(actuals, '2026-01-15', '2026-01-16')

  // Combine to check matching intervals
  const intervalMap = {}
  filteredForecasts.forEach(f => {
    if (!intervalMap[f.startTime]) intervalMap[f.startTime] = {}
    intervalMap[f.startTime].forecast = f.generation
  })
  filteredActuals.forEach(a => {
    if (!intervalMap[a.startTime]) intervalMap[a.startTime] = {}
    intervalMap[a.startTime].actual = a.generation
  })

  const matchedIntervals = Object.entries(intervalMap)
    .filter(([_, data]) => data.forecast !== undefined && data.actual !== undefined)

  console.assert(
    matchedIntervals.length === 2,
    `Expected 2 matched intervals, got ${matchedIntervals.length}`
  )

  console.log('✅ Matching delivery intervals test passed')
  return { matchedIntervals, totalIntervals: Object.keys(intervalMap).length }
}

/**
 * Test: Graceful handling of missing records
 */
export const testMissingRecordHandling = () => {
  const forecasts = [
    { startTime: '2026-01-15T00:00:00Z', generation: 100 },
    { startTime: '2026-01-15T02:00:00Z', generation: 120 }, // Missing 01:00
    { startTime: '2026-01-15T03:00:00Z', generation: 130 },
  ]

  const actuals = [
    { startTime: '2026-01-15T00:00:00Z', generation: 105 },
    { startTime: '2026-01-15T01:00:00Z', generation: 115 },
    // Missing 02:00
    { startTime: '2026-01-15T03:00:00Z', generation: 135 },
  ]

  const filteredForecasts = filterByDeliveryDateRange(forecasts, '2026-01-15', '2026-01-15')
  const filteredActuals = filterByDeliveryDateRange(actuals, '2026-01-15', '2026-01-15')

  // Combine into chart data structure
  const chartData = {}
  filteredForecasts.forEach(f => {
    const time = new Date(f.startTime).getTime()
    if (!chartData[time]) chartData[time] = { startTime: f.startTime }
    chartData[time].forecast = f.generation
  })
  filteredActuals.forEach(a => {
    const time = new Date(a.startTime).getTime()
    if (!chartData[time]) chartData[time] = { startTime: a.startTime }
    chartData[time].actual = a.generation
  })

  const data = Object.values(chartData).sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  // Should have 4 total intervals even with missing records
  console.assert(data.length === 4, `Expected 4 total intervals, got ${data.length}`)

  // Should have records with undefined values (not crash)
  const withMissingForecast = data.filter(d => d.forecast === undefined).length
  const withMissingActual = data.filter(d => d.actual === undefined).length

  console.assert(withMissingForecast === 1, `Expected 1 missing forecast, got ${withMissingForecast}`)
  console.assert(withMissingActual === 1, `Expected 1 missing actual, got ${withMissingActual}`)

  console.log('✅ Missing record handling test passed')
  return { data, missingForecasts: withMissingForecast, missingActuals: withMissingActual }
}

/**
 * Test: Multi-day date range filtering
 */
export const testMultiDayDateRange = () => {
  const testData = [
    { startTime: '2026-01-14T23:00:00Z', generation: 100 }, // Should be excluded
    { startTime: '2026-01-15T00:00:00Z', generation: 110 },
    { startTime: '2026-01-15T12:00:00Z', generation: 120 },
    { startTime: '2026-01-16T00:00:00Z', generation: 130 },
    { startTime: '2026-01-16T23:59:59Z', generation: 140 },
    { startTime: '2026-01-17T00:00:00Z', generation: 150 },
    { startTime: '2026-01-17T23:59:59Z', generation: 160 },
    { startTime: '2026-01-18T00:00:00Z', generation: 170 }, // Should be excluded
  ]

  const result = filterByDeliveryDateRange(testData, '2026-01-15', '2026-01-17')

  console.assert(result.length === 6, `Expected 6 records, got ${result.length}`)
  console.assert(result[0].startTime === '2026-01-15T00:00:00Z', 'First record should be 2026-01-15T00:00:00Z')
  console.assert(result[5].startTime === '2026-01-17T23:59:59Z', 'Last record should be 2026-01-17T23:59:59Z')

  console.log('✅ Multi-day date range test passed')
  return result
}

/**
 * Run all tests
 */
export const runAllDateFilteringTests = () => {
  console.log('\n🧪 Running date filtering tests...\n')

  try {
    testDateRangeFiltering()
    testInclusiveEndDate()
    testMatchingDeliveryIntervals()
    testMissingRecordHandling()
    testMultiDayDateRange()

    console.log('\n✅ All tests passed!\n')
    return { success: true, testsRun: 5 }
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    return { success: false, error }
  }
}
