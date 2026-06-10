import React, { useState } from 'react'
import AdminDashboard from './AdminDashboard'
import ImportExcel from './ImportExcel'
import './admin.css'

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'admin123'

function getStoredSecret() {
  try { return sessionStorage.getItem('admin_secret') || '' } catch { return '' }
}

function storeSecret(val) {
  try { sessionStorage.setItem('admin_secret', val) } catch {}
}

function clearSecret() {
  try { sessionStorage.removeItem('admin_secret') } catch {}
}

export default function AdminPage({ onBackToSite }) {
  const [secret, setSecret] = useState(getStoredSecret)
  const [isAuthed, setIsAuthed] = useState(() => !!getStoredSecret())
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('products')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_SECRET) {
      storeSecret(password)
      setSecret(password)
      setIsAuthed(true)
      setError('')
    } else {
      setError('Invalid password')
    }
  }

  const handleLogout = () => {
    clearSecret()
    setSecret('')
    setIsAuthed(false)
    setPassword('')
  }

  if (!isAuthed) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <span className="admin-lock-icon">🔐</span>
            <h1>Admin Panel</h1>
            <p>Enter password to manage products</p>
          </div>
          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="password"
              className="admin-login-input"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="admin-login-error">{error}</p>}
            <button type="submit" className="admin-login-btn">
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-inner">
          <h1 className="admin-title">🛒 Shriram Traders — Admin</h1>
          <nav className="admin-nav">
            <button
              className={`admin-nav-btn ${tab === 'products' ? 'active' : ''}`}
              onClick={() => setTab('products')}
            >
              📦 Products
            </button>
            <button
              className={`admin-nav-btn ${tab === 'import' ? 'active' : ''}`}
              onClick={() => setTab('import')}
            >
              📥 Import Excel
            </button>
          {onBackToSite && (
            <button className="admin-back-btn" onClick={onBackToSite}>
              ← Store
            </button>
          )}
          <button className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
          </nav>
        </div>
      </header>

      <main className="admin-main">
        {tab === 'products' && (
          <AdminDashboard
            secret={secret}
            refreshKey={refreshKey}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        )}
        {tab === 'import' && (
          <ImportExcel secret={secret} onImported={() => setTab('products')} />
        )}
      </main>
    </div>
  )
}
