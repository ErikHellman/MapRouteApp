import { formatDistance, formatDuration } from '../lib/format.js'

const dateFormat = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium' })

export default function SavedRoutes({ routes, activeId, error, onShow, onDelete }) {
  return (
    <section className="saved">
      <h2>Sparade rutter</h2>
      {error && <p className="error">{error}</p>}
      {routes.length === 0 ? (
        <p className="hint">Inga sparade rutter ännu.</p>
      ) : (
        <ul className="saved__list">
          {routes.map((route) => (
            <li key={route.id} className={route.id === activeId ? 'saved-item saved-item--active' : 'saved-item'}>
              <button type="button" className="saved-item__show" onClick={() => onShow(route)}>
                <span className="saved-item__name">{route.name}</span>
                <span className="saved-item__meta">
                  {formatDistance(route.distance)} · {formatDuration(route.duration)} ·{' '}
                  {dateFormat.format(new Date(route.createdAt))}
                </span>
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => onDelete(route)}
                aria-label={`Ta bort ${route.name}`}
                title="Ta bort"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
