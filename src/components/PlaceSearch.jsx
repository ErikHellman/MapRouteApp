import { useEffect, useEffectEvent, useId, useState } from 'react'
import { searchPlaces } from '../services/geocoding.js'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export default function PlaceSearch({ label, color, placeholder, point, getProximity, onSelect, onClear }) {
  const id = useId()
  const listId = `${id}-list`
  const [query, setQuery] = useState(point?.name ?? '')
  // Only text the user typed is searched, not names set from the map or a saved route
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState(null)

  // Show the new name when the point changes from outside (map click, drag, saved route)
  const [shownPoint, setShownPoint] = useState(point)
  if (point !== shownPoint) {
    setShownPoint(point)
    setQuery(point?.name ?? '')
    setSearchTerm('')
    setSuggestions(null)
  }

  const readProximity = useEffectEvent(() => getProximity())

  useEffect(() => {
    const term = searchTerm.trim()
    if (term.length < MIN_QUERY_LENGTH) {
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(term, { proximity: readProximity(), signal: controller.signal })
        setSuggestions(results)
        setActiveIndex(-1)
        setError(null)
      } catch (searchError) {
        if (searchError.name !== 'AbortError') {
          setSuggestions(null)
          setError(searchError.message)
        }
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchTerm])

  function closeSuggestions() {
    setSearchTerm('')
    setSuggestions(null)
    setActiveIndex(-1)
  }

  function handleChange(event) {
    const value = event.target.value
    setQuery(value)
    setSearchTerm(value)
    setError(null)
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions(null)
    }
  }

  function select(suggestion) {
    closeSuggestions()
    onSelect({ name: suggestion.fullName, coordinates: suggestion.coordinates })
  }

  function handleKeyDown(event) {
    const count = suggestions?.length ?? 0
    if (event.key === 'ArrowDown' && count > 0) {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % count)
    } else if (event.key === 'ArrowUp' && count > 0) {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? count - 1 : index - 1))
    } else if (event.key === 'Enter' && count > 0) {
      event.preventDefault()
      select(suggestions[Math.max(activeIndex, 0)])
    } else if (event.key === 'Escape') {
      closeSuggestions()
    }
  }

  // Leaving the field without picking a suggestion restores the chosen place
  function handleBlur() {
    closeSuggestions()
    setQuery(point?.name ?? '')
  }

  function handleClear() {
    closeSuggestions()
    setQuery('')
    setError(null)
    if (point) {
      onClear()
    }
  }

  const isOpen = suggestions !== null

  return (
    <div className="place-search">
      <label htmlFor={id} className="place-search__label">
        <span className="dot" style={{ background: color }} aria-hidden="true" />
        {label}
      </label>
      <div className="place-search__field">
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {query && (
          <button type="button" className="icon-button" onClick={handleClear} aria-label={`Rensa ${label}`}>
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <ul id={listId} role="listbox" className="suggestions">
          {suggestions.length === 0 && <li className="suggestions__empty">Inga träffar</li>}
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'suggestion suggestion--active' : 'suggestion'}
              // mousedown keeps focus in the input so blur does not close the list first
              onMouseDown={(event) => {
                event.preventDefault()
                select(suggestion)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="suggestion__name">{suggestion.name}</span>
              {suggestion.place && <span className="suggestion__place">{suggestion.place}</span>}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
