import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

const ForecastChart = ({ forecasts, actuals, isLoading }) => {
  if (isLoading) {
    return <div className="chart-container"><p>Loading chart...</p></div>
  }

  if (!forecasts || !actuals || forecasts.length === 0) {
    return <div className="chart-container"><p>No data available</p></div>
  }

  // Combine and align data for chart
  const chartData = {}

  forecasts.forEach(f => {
    const time = new Date(f.startTime).getTime()
    if (!chartData[time]) {
      chartData[time] = { time, startTime: f.startTime }
    }
    chartData[time].forecast = f.generation
  })

  actuals.forEach(a => {
    const time = new Date(a.startTime).getTime()
    if (!chartData[time]) {
      chartData[time] = { time, startTime: a.startTime }
    }
    chartData[time].actual = a.generation
  })

  const data = Object.values(chartData)
    .sort((a, b) => a.time - b.time)
    .map(d => ({
      ...d,
      time: format(new Date(d.startTime), 'MMM dd HH:mm')
    }))

  return (
    <div className="chart-container">
      <h2>Wind Power Forecast vs Actual</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis label={{ value: 'Generation (MW)', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value) => value ? value.toFixed(2) : 'N/A'}
            labelFormatter={(label) => label}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#8884d8"
            dot={false}
            name="Forecast"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#82ca9d"
            dot={false}
            name="Actual"
            strokeDasharray="5 5"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ForecastChart
