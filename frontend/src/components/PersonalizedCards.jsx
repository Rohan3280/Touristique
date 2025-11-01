export function PersonalizedCards({ items }) {
  if (!items || !items.length) return null
  return (
    <section className="page recommendations" aria-label="Personalized recommendations">
      <h2>Your smart itinerary</h2>
      <div className="card-grid">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="rec-card">
            <div className="rec-img" style={{ background: item.image ? undefined : 'linear-gradient(135deg, #fff3ea, #eaf6ff)' }}>
              {item.image && (<img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)}
            </div>
            <div className="rec-body">
              <h3>{item.title || item.name || 'Destination'}</h3>
              <p>{item.subtitle || item.description || ''}</p>
              <div className="row">
                {item.mapUrl && <a href={item.mapUrl} className="btn btn-ghost">View on map</a>}
                {item.tipsUrl && <a href={item.tipsUrl} className="btn btn-primary">Cultural tips</a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}


