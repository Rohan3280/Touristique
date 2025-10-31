export function ProfileSetup() {
  return (
    <section className="page profile-setup">
      <h2>Tell us about your trip</h2>
      <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
        <label>
          Interests
          <div className="chip-row">
            <button className="chip" type="button">Heritage</button>
            <button className="chip" type="button">Adventure</button>
            <button className="chip" type="button">Food</button>
            <button className="chip" type="button">Nature</button>
          </div>
        </label>
        <label>
          Travel duration (days)
          <input className="input" type="number" min="1" placeholder="5" />
        </label>
        <label>
          Budget (₹)
          <input className="input" type="number" min="0" placeholder="30000" />
        </label>
        <div className="row">
          <a href="#/recommendations" className="btn btn-primary">Generate plan</a>
        </div>
      </form>
    </section>
  )
}


