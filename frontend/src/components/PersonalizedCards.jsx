export function PersonalizedCards({ items }) {
  if (!items || !items.length) return null
  return (
    <section className="page recommendations" aria-label="Personalized recommendations">
      <div className="card-grid">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="rec-card">
            <div className="rec-body">
              <h3>Day {item.day}</h3>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{item.place || '—'}</span>
                <span>₹{Number(item.cost || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}


