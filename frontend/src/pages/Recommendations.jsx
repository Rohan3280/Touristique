export function Recommendations() {
  return (
    <section className="page recommendations">
      <h2>Your smart itinerary</h2>
      <div className="card-grid">
        {[1,2,3,4].map((i) => (
          <div key={i} className="rec-card">
            <div className="rec-img" />
            <div className="rec-body">
              <h3>Destination {i}</h3>
              <p>Best time today: Morning • Crowd: Moderate • Weather: Clear</p>
              <div className="row">
                <a href="#/map" className="btn btn-ghost">View on map</a>
                <a href="#/insights" className="btn btn-primary">Cultural tips</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}


