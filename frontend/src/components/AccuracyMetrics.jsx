import './AccuracyMetrics.css'

const AccuracyMetrics = ({ mae, rmse, mape, dataPoints, isLoading }) => {
  if (isLoading) {
    return <div className="metrics-container"><p>Loading metrics...</p></div>
  }

  return (
    <div className="metrics-container">
      <h2>Forecast Accuracy Metrics</h2>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">MAE</div>
          <div className="metric-value">{mae ? mae.toFixed(2) : 'N/A'}</div>
          <div className="metric-unit">MW</div>
          <div className="metric-description">Mean Absolute Error</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">RMSE</div>
          <div className="metric-value">{rmse ? rmse.toFixed(2) : 'N/A'}</div>
          <div className="metric-unit">MW</div>
          <div className="metric-description">Root Mean Square Error</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">MAPE</div>
          <div className="metric-value">{mape ? mape.toFixed(2) : 'N/A'}</div>
          <div className="metric-unit">%</div>
          <div className="metric-description">Mean Absolute % Error</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Data Points</div>
          <div className="metric-value">{dataPoints || 0}</div>
          <div className="metric-unit"></div>
          <div className="metric-description">Matched Records</div>
        </div>
      </div>
    </div>
  )
}

export default AccuracyMetrics
