import { useRef, useState } from 'react'
import './App.css'
import MapView from './components/MapView.jsx'
import PlaceSearch from './components/PlaceSearch.jsx'
import RouteSummary from './components/RouteSummary.jsx'
import SavedRoutes from './components/SavedRoutes.jsx'
import { MAPBOX_TOKEN } from './config.js'
import { FROM_COLOR, INITIAL_CENTER, TO_COLOR } from './constants.js'
import { formatCoordinates } from './lib/format.js'
import { createSavedRoute, loadRoutes, storeRoutes } from './lib/savedRoutes.js'
import { fetchRoute } from './services/directions.js'
import { reverseGeocode } from './services/geocoding.js'

function MissingToken() {
  return (
    <main className="missing-token">
      <h1>MapRouteApp</h1>
      <p>
        Mapbox-token saknas. Lägg till <code>VITE_MAPBOX_TOKEN</code> i <code>.env.local</code> när du kör lokalt,
        eller som GitHub-secret <code>MAPBOX_TOKEN</code> för GitHub Pages.
      </p>
    </main>
  )
}

export default function App() {
  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState(null)
  const [savedRoutes, setSavedRoutes] = useState(() => loadRoutes())
  const [activeSavedId, setActiveSavedId] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [storageError, setStorageError] = useState(null)
  const mapCenterRef = useRef(INITIAL_CENTER)
  const routeRequestRef = useRef(null)

  if (!MAPBOX_TOKEN) {
    return <MissingToken />
  }

  function changePoints(nextFrom, nextTo) {
    setFrom(nextFrom)
    setTo(nextTo)
    setActiveSavedId(null)
    setRouteError(null)
    setSaveError(null)
    routeRequestRef.current?.abort()

    if (!nextFrom || !nextTo) {
      setRoute(null)
      setRouteLoading(false)
      return
    }

    // The previous line stays on the map until the new route arrives
    const controller = new AbortController()
    routeRequestRef.current = controller
    setRouteLoading(true)
    fetchRoute(nextFrom, nextTo, { signal: controller.signal })
      .then(setRoute)
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setRoute(null)
          setRouteError(error.message)
        }
      })
      .finally(() => {
        if (routeRequestRef.current === controller) {
          setRouteLoading(false)
        }
      })
  }

  function setPoint(which, point) {
    changePoints(which === 'from' ? point : from, which === 'to' ? point : to)
  }

  // Sets the point right away with its coordinates as name, so the route and a quick
  // second click do not wait for the address lookup
  function placePointAt(which, coordinates) {
    setPoint(which, { name: formatCoordinates(coordinates), coordinates })
    const setNamed = which === 'from' ? setFrom : setTo
    reverseGeocode(coordinates).then((named) => {
      setNamed((current) => (current?.coordinates === coordinates ? named : current))
    })
  }

  function handleMapClick(coordinates) {
    // First click is the start, then the destination; later clicks move the destination
    placePointAt(from ? 'to' : 'from', coordinates)
  }

  function showSavedRoute(saved) {
    routeRequestRef.current?.abort()
    setFrom(saved.from)
    setTo(saved.to)
    setRoute({ distance: saved.distance, duration: saved.duration, geometry: saved.geometry })
    setRouteLoading(false)
    setRouteError(null)
    setSaveError(null)
    setActiveSavedId(saved.id)
  }

  function persist(nextRoutes) {
    storeRoutes(nextRoutes)
    setSavedRoutes(nextRoutes)
  }

  function handleSave(name) {
    const saved = createSavedRoute({ name, from, to, route })
    try {
      persist([saved, ...savedRoutes])
      setActiveSavedId(saved.id)
      setSaveError(null)
    } catch (error) {
      setSaveError(error.message)
    }
  }

  function handleDelete(saved) {
    if (!window.confirm(`Ta bort "${saved.name}"?`)) {
      return
    }
    try {
      persist(savedRoutes.filter((route) => route.id !== saved.id))
      setStorageError(null)
      if (activeSavedId === saved.id) {
        setActiveSavedId(null)
      }
    } catch (error) {
      setStorageError(error.message)
    }
  }

  return (
    <div className="app">
      <aside className="panel">
        <header className="panel__header">
          <h1>MapRouteApp</h1>
          <p>Planera en bilresa mellan två platser.</p>
        </header>

        <div className="search-fields">
          <PlaceSearch
            label="Från"
            color={FROM_COLOR}
            placeholder="Sök startplats"
            point={from}
            getProximity={() => mapCenterRef.current}
            onSelect={(point) => setPoint('from', point)}
            onClear={() => setPoint('from', null)}
          />
          <PlaceSearch
            label="Till"
            color={TO_COLOR}
            placeholder="Sök destination"
            point={to}
            getProximity={() => mapCenterRef.current}
            onSelect={(point) => setPoint('to', point)}
            onClear={() => setPoint('to', null)}
          />
        </div>

        <RouteSummary
          from={from}
          to={to}
          route={route}
          loading={routeLoading}
          error={routeError}
          isSaved={activeSavedId !== null}
          saveError={saveError}
          onSave={handleSave}
        />

        <SavedRoutes
          routes={savedRoutes}
          activeId={activeSavedId}
          error={storageError}
          onShow={showSavedRoute}
          onDelete={handleDelete}
        />
      </aside>

      <main className="map">
        <MapView
          from={from}
          to={to}
          routeGeometry={route?.geometry ?? null}
          onMapClick={handleMapClick}
          onMarkerDragEnd={placePointAt}
          onCenterChange={(center) => {
            mapCenterRef.current = center
          }}
        />
      </main>
    </div>
  )
}
