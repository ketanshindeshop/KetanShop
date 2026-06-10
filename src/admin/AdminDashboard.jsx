import React, { useState, useEffect, useCallback } from 'react'
import ProductForm from './ProductForm'

export default function AdminDashboard({ secret, refreshKey, onRefresh }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting, setDeleting] = useState(null)
  // Track per-product image errors (keyed by product id)
  const [imgErrors, setImgErrors] = useState({})

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/products?sort=sort_order&dir=asc&show_all=true')
      const data = await res.json()
      if (data.success) {
        setProducts(data.products)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts, refreshKey])

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.product_name}"? This cannot be undone.`)) return
    setDeleting(product.id)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': secret },
      })
      const data = await res.json()
      if (data.success) {
        loadProducts()
      } else {
        alert('Failed to delete: ' + data.error)
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleFormSaved = () => {
    setEditingProduct(null)
    setShowCreate(false)
    loadProducts()
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <h2>📦 Products ({products.length})</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowCreate(true)}>
          + Add Product
        </button>
      </div>

      {loading && (
        <div className="admin-loading">
          <div className="loading-spinner" />
          <p>Loading products...</p>
        </div>
      )}

      {error && <div className="admin-error">❌ {error}</div>}

      {!loading && !error && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="admin-empty">No products found</td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>                        {p.id && !imgErrors[p.id] ? (
                        <img src={`/api/products/${p.id}/image?v=${encodeURIComponent(p.updated_at || '0')}`} alt="" className="admin-thumb" onError={() => setImgErrors((prev) => ({ ...prev, [p.id]: true }))} />
                      ) : (
                        <span className="admin-thumb-placeholder">🛍️</span>
                      )}
                    </td>
                    <td className="admin-name-cell">
                      <strong>{p.product_name}</strong>
                      {p.product_name_m && <span className="admin-name-mr">{p.product_name_m}</span>}
                    </td>
                    <td><span className="admin-cat-tag">{p.category}</span></td>
                    <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`admin-stock ${p.availability === 'yes' ? 'in-stock' : 'out-stock'}`}>
                        {p.availability === 'yes' ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <button
                        className="admin-btn admin-btn-sm"
                        onClick={() => setEditingProduct(p)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-sm admin-btn-danger"
                        onClick={() => handleDelete(p)}
                        disabled={deleting === p.id}
                      >
                        {deleting === p.id ? '⏳' : '🗑️ Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Modal */}
      {(editingProduct || showCreate) && (
        <ProductForm
          key={editingProduct?.id || 'create'}
          product={editingProduct}
          secret={secret}
          onSaved={handleFormSaved}
          onCancel={() => { setEditingProduct(null); setShowCreate(false) }}
        />
      )}
    </div>
  )
}
