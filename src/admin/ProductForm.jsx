import React, { useState, useRef } from 'react'

export default function ProductForm({ product, secret, onSaved, onCancel }) {
  const isEdit = !!product
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    product_name: product?.product_name || '',
    product_name_mr: product?.product_name_mr || '',
    price: product?.price || '',
    category: product?.category || 'Groceries',
    image_path: product?.image_path || '',
    availability: product?.availability || 'yes',
    sort_order: product?.sort_order || '',
  })
  const [imageData, setImageData] = useState(null)   // base64 string
  const [imageType, setImageType] = useState(null)    // MIME type
  const [imagePreview, setImagePreview] = useState(null) // blob URL for preview
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are supported')
      return
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }
    setError('')
    setImageType(file.type)
    // Create preview
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    // Read as base64
    const reader = new FileReader()
    reader.onload = () => {
      // Remove the data:image/...;base64, prefix
      const base64 = reader.result.split(',')[1]
      setImageData(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_name.trim()) {
      setError('Product name is required')
      return
    }
    setSaving(true)
    setError('')

    try {
      const url = isEdit
        ? `/api/admin/products/${product.id}`
        : '/api/admin/products'
      const method = isEdit ? 'PUT' : 'POST'

      const body = {
        ...form,
        price: Number(form.price) || 0,
        sort_order: Number(form.sort_order) || 0,
      }
      // Only include image data if a new file was selected
      if (imageData && imageType) {
        body.image_data = imageData
        body.image_type = imageType
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': secret,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        onSaved()
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>{isEdit ? '✏️ Edit Product' : '➕ Add Product'}</h2>
          <button className="admin-modal-close" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Product Name (English) *</label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
                placeholder="e.g. Kashmiri Garlic Black"
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Product Name (Marathi)</label>
              <input
                type="text"
                value={form.product_name_mr}
                onChange={(e) => handleChange('product_name_mr', e.target.value)}
                placeholder="Auto-generated from English name"
              />
              <p className="admin-form-hint">Auto-generated from English name. Edit to override.</p>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Price (₹)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="e.g. 180"
              />
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                <option value="Groceries">Groceries</option>
                <option value="Sweets & Snacks">Sweets & Snacks</option>
                <option value="Spices">Spices</option>
                <option value="Grains & Rice">Grains & Rice</option>
                <option value="Pickles & Chutneys">Pickles & Chutneys</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Availability</label>
              <select
                value={form.availability}
                onChange={(e) => handleChange('availability', e.target.value)}
              >
                <option value="yes">In Stock</option>
                <option value="no">Out of Stock</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group admin-form-group-full">
              <label>Product Image</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="admin-file-input"
              />
              {/* Show preview of uploaded image */}
              {imagePreview && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px', border: '2px solid #e8e6e1' }}
                  />
                  <p style={{ fontSize: '.8rem', color: '#6c6c80', marginTop: '6px' }}>
                    New image selected ✓
                  </p>
                </div>
              )}
              {/* Show existing image when editing, if no new file selected */}
              {!imagePreview && isEdit && product?.id && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img
                    src={`/api/products/${product.id}/image?v=${encodeURIComponent(product.updated_at || '0')}`}
                    alt="Current"
                    style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '8px', border: '2px solid #e8e6e1' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <p style={{ fontSize: '.8rem', color: '#6c6c80', marginTop: '6px' }}>
                    Current image (select a new file to replace)
                  </p>
                </div>
              )}
              <p className="admin-form-hint">
                Upload JPEG, PNG, or WebP. Max 5MB. Image is stored directly in the database.
              </p>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Sort Order</label>
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => handleChange('sort_order', e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
          </div>

          {error && <p className="admin-form-error">{error}</p>}

          <div className="admin-form-actions">
            <button type="button" className="admin-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? '⏳ Saving...' : isEdit ? '💾 Update Product' : '✅ Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
