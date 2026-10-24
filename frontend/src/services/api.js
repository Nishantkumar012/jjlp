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
