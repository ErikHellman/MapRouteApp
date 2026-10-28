// Set in .env.local for local development and from the MAPBOX_TOKEN secret in CI
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? ''
