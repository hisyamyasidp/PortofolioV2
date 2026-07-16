import { Navigate } from 'react-router-dom'

// Admin dashboard removed for static GitHub Pages deployment
export default function ProtectedRoute({ children }) {
  return <Navigate to="/" replace />
}