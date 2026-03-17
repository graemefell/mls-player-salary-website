export default function Notes() {
  return (
    <div className="notes-page">
      <h4><strong>Data Sources</strong></h4>
      <p>
        This application uses data sourced from the latest available MLS player salary datasets
        at{' '}
        <a href="https://mlsplayers.org/resources/salary-guide" target="_blank" rel="noopener noreferrer">
          mlsplayers.org
        </a>.
      </p>

      <h4><strong>Latest Refresh</strong></h4>
      <p>
        The data was last refreshed on: <em>— October 1, 2025 —</em>
      </p>
    </div>
  )
}
