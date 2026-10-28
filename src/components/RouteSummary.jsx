import { formatDistance, formatDuration } from '../lib/format.js'

function SaveForm({ defaultName, onSave }) {
  function handleSubmit(event) {
    event.preventDefault()
    onSave(new FormData(event.currentTarget).get('name'))
  }

  return (
    <form className="save-form" onSubmit={handleSubmit}>
      <label htmlFor="route-name" className="visually-hidden">
        Namn på rutten
      </label>
      <input id="route-name" name="name" type="text" defaultValue={defaultName} />
      <button type="submit" className="button button--primary">
        Spara rutt
      </button>
    </form>
  )
}

export default function RouteSummary({ from, to, route, loading, error, isSaved, saveError, onSave }) {
  if (!from || !to) {
    return (
      <p className="hint">
        Sök efter platser ovan eller klicka på kartan. Första klicket blir start, andra blir mål. Dra i
        markörerna för att justera.
      </p>
    )
  }

  return (
    <section className="summary" aria-live="polite">
      {loading && <p className="hint">Beräknar rutt…</p>}
      {error && <p className="error">{error}</p>}
      {route && !error && (
        <>
          <dl className="summary__stats">
            <div>
              <dt>Sträcka</dt>
              <dd>{formatDistance(route.distance)}</dd>
            </div>
            <div>
              <dt>Restid med bil</dt>
              <dd>{formatDuration(route.duration)}</dd>
            </div>
          </dl>
          {isSaved ? (
            <p className="hint">Rutten är sparad.</p>
          ) : (
            !loading && (
              <SaveForm key={`${from.name}|${to.name}`} defaultName={`${from.name} → ${to.name}`} onSave={onSave} />
            )
          )}
          {saveError && <p className="error">{saveError}</p>}
        </>
      )}
    </section>
  )
}
