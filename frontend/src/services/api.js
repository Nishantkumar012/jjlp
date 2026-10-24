import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
})

export const fetchForecasts = async (fromDate, toDate) => {
  try {
    const response = await api.get('/api/forecasts', {
      params: {
        from_date: fromDate,
        to_date: toDate
      }
    })
    return response.data
  } catch (error) {
    console.error('Error fetching forecasts:', error)
    throw error
  }
}

export const fetchForecastsHistorical = async (fromDate = '2026-01-01', toDate = '2026-01-31') => {
  try {
    console.log(`📊 Fetching historical forecasts from ${fromDate} to ${toDate}...`)
    const response = await api.get('/api/forecasts-historical', {
      params: {
        from_date: fromDate,
        to_date: toDate
      }
    })
    console.log('✅ Historical forecasts retrieved')
    return response.data
  } catch (error) {
    console.error('❌ Error fetching historical forecasts:', error)
    throw error
  }
}

export const fetchMetrics = async (fromDate, toDate) => {
  try {
    const response = await api.get('/api/metrics', {
      params: {
        from_date: fromDate,
        to_date: toDate
      }
    })
    return response.data
  } catch (error) {
    console.error('Error fetching metrics:', error)
    throw error
  }
}

export default api
