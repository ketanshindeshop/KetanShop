import React, { useState, useRef, useEffect } from 'react'
import { compressFile } from '../utils/clientCompress.js'
import { formatBytes } from '../utils/format.js'

export default function ProductForm({ product, secret, onSaved, onCancel }) {
  const isEdit = !!product
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    product_name: product?.product_name || '',
    price: product?.price || '',
    category: product?.category || 'Groceries',
    image_path: product?.image_path || '',
    availability: product?.availability || 'yes',
    sort_order: product?.sort_order || '',
  })
  const [imageData, setImageData] = useState(null)   // base64 string (compressed)
  const [imageType, setImageType] = useState(null)    // MIME type
  const [imagePreview, setImagePreview] = useState(null) // blob URL for preview
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [currentImageSize, setCurrentImageSize] = useState(null) // bytes of existing image
  const [originalFileSize, setOriginalFileSize] = useState(null) // bytes of selected original file
  const [compressedSize, setCompressedSize] = useState(null)     // bytes after client compression

  // Fetch current image size when editing an existing product
  useEffect(() => {
    if (!isEdit || !product?.id) return
    let cancelled = false
    fetch(`/api/products/${product.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.success && data.product?.image_data) {
          // Base64 → binary size: base64.length * 3/4
          const bytes = Math.round(data.product.image_data.length * 0.75)
          setCurrentImageSize(bytes)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isEdit, product?.id])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are supported')
      return
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB')
      return
    }
    setError('')
    setCompressing(true)
    setOriginalFileSize(file.size)
    setCompressedSize(null)

    // Show preview immediately using the original file
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)

    try {
      // Compress client-side: resize to 400px, convert to WebP
      const compressed = await compressFile(file)
      setImageData(compressed.base64)
      setImageType(compressed.mime) // 'image/webp'
      // Record compressed size from blob size
      setCompressedSize(compressed.blob.size)
    } catch (err) {
      console.warn('Client-side compression failed, using original:', err.message)
      // Fallback: read original file as base64
      const reader = new FileReader()
      reader.onload = () => {
        setImageData(reader.result.split(',')[1])
        setImageType(file.type)
      }
      reader.readAsDataURL(file)
    } finally {
      setCompressing(false)
    }
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
            <div className="admin-form-group admin-form-group-full">
              <label>Product Name *</label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
                placeholder="Enter name in English or मराठी (auto-detected)"
                required
              />
              <p className="admin-form-hint">
                Enter in English (auto-translates to Marathi) or directly in Marathi (Devanagari).
              </p>
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
                    {originalFileSize && (
                      <span>
                        Original: <strong>{formatBytes(originalFileSize)}</strong>
                      </span>
                    )}
                    {compressedSize && (
                      <span>
                        {' → '}Compressed: <strong style={{ color: '#38a169' }}>{formatBytes(compressedSize)}</strong>
                        {' '}<span style={{ color: '#38a169', fontSize: '.7rem' }}>
                          ({Math.round((1 - compressedSize / originalFileSize) * 100)}% smaller)
                        </span>
                      </span>
                    )}
                    {!compressedSize && compressing && (
                      <span style={{ color: '#a68b5b' }}>⏳ compressing...</span>
                    )}
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
                    Current image{currentImageSize ? ` — ${formatBytes(currentImageSize)}` : ''}
                  </p>
                </div>
              )}
              <p className="admin-form-hint">
                Upload JPEG, PNG, or WebP. Max 10MB. Image is compressed to 400px WebP automatically.
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
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || compressing}>
              {saving ? '⏳ Saving...' : compressing ? '🔄 Compressing...' : isEdit ? '💾 Update Product' : '✅ Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
