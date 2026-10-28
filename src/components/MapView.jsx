import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { MAPBOX_TOKEN } from '../config.js'
import { FROM_COLOR, INITIAL_CENTER, TO_COLOR } from '../constants.js'

const ROUTE_COLOR = '#2563eb'
const ROUTE_SOURCE = 'route'
const EMPTY_ROUTE = { type: 'FeatureCollection', features: [] }

function boundsOf(coordinates) {
  return coordinates.reduce(
    (bounds, position) => bounds.extend(position),
    new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]),
  )
}

function usePointMarker(mapRef, point, color, onDragEnd) {
  const handleDragEnd = useEffectEvent(onDragEnd)

  useEffect(() => {
    const map = mapRef.current
    if (!map || !point) {
      return
    }
    const marker = new mapboxgl.Marker({ color, draggable: true })
      .setLngLat(point.coordinates)
      .addTo(map)
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat()
      handleDragEnd([lng, lat])
    })

    // Pan to points picked by search that are outside the current view
    if (!map.getBounds()?.contains(point.coordinates)) {
      map.easeTo({ center: point.coordinates, zoom: Math.max(map.getZoom(), 10) })
    }
    return () => marker.remove()
  }, [mapRef, point, color])
}

export default function MapView({ from, to, routeGeometry, onMapClick, onMarkerDragEnd, onCenterChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const [styleLoaded, setStyleLoaded] = useState(false)

  const handleClick = useEffectEvent(onMapClick)
  const handleCenterChange = useEffectEvent(onCenterChange)

  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: INITIAL_CENTER,
      zoom: 4,
      language: 'sv',
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.getCanvas().style.cursor = 'crosshair'

    map.on('load', () => {
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: EMPTY_ROUTE })
      // Draw the route below the first label layer so place names stay readable
      const firstLabelLayer = map.getStyle().layers.find((layer) => layer.type === 'symbol')
      map.addLayer(
        {
          id: 'route-line',
          type: 'line',
          source: ROUTE_SOURCE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ROUTE_COLOR, 'line-width': 5, 'line-opacity': 0.85 },
        },
        firstLabelLayer?.id,
      )
      setStyleLoaded(true)
    })
    map.on('click', (event) => handleClick([event.lngLat.lng, event.lngLat.lat]))
    map.on('moveend', () => {
      const { lng, lat } = map.getCenter()
      handleCenterChange([lng, lat])
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      setStyleLoaded(false)
    }
  }, [])

  usePointMarker(mapRef, from, FROM_COLOR, (coordinates) => onMarkerDragEnd('from', coordinates))
  usePointMarker(mapRef, to, TO_COLOR, (coordinates) => onMarkerDragEnd('to', coordinates))

  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleLoaded) {
      return
    }
    const source = map.getSource(ROUTE_SOURCE)
    if (!routeGeometry) {
      source.setData(EMPTY_ROUTE)
      return
    }
    source.setData({ type: 'Feature', geometry: routeGeometry, properties: {} })
    map.fitBounds(boundsOf(routeGeometry.coordinates), { padding: 60, maxZoom: 15 })
  }, [routeGeometry, styleLoaded])

  return <div ref={containerRef} className="map-container" />
}
