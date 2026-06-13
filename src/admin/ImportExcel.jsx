import React, { useState, useRef, useEffect } from 'react'

export default function ImportExcel({ secret, onImported }) {
  const [file, setFile] = useState(null)
  const [imageFiles, setImageFiles] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [existingCategories, setExistingCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const fileRef = useRef(null)
  const imagesRef = useRef(null)

  // Fetch existing categories on mount
  useEffect(() => {
    let cancelled = false
    setCategoriesLoading(true)
    fetch('/api/admin/categories', { headers: { 'x-admin-key': secret } })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setExistingCategories(data.categories)
        }
        if (!cancelled) setCategoriesLoading(false)
      })
      .catch(() => { if (!cancelled) setCategoriesLoading(false) })
    return () => { cancelled = true }
  }, [secret])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setResult(null)
    setError('')
  }

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || [])
    setImageFiles(files)
    setResult(null)
    setError('')
  }

  // Revoke old blob URLs whenever imageFiles change or component unmounts
  useEffect(() => {
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImport = async () => {
    if (!file) {
      setError('Please select an Excel file first')
      return
    }
    setImporting(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      // Append each image file — the backend will read them as a 'images' array
      imageFiles.forEach((img) => {
        formData.append('images', img)
      })

      const res = await fetch('/api/admin/products/import-excel', {
        method: 'POST',
        headers: { 'x-admin-key': secret },
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setResult({ success: true, imported: data.imported, imagesImported: data.images_imported || 0, message: data.message })
        setFile(null)
        setImageFiles([])
        if (fileRef.current) fileRef.current.value = ''
        if (imagesRef.current) imagesRef.current.value = ''
        // Switch to products tab after short delay
        setTimeout(() => onImported?.(), 2000)
      } else {
        setError(data.error || 'Import failed')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadSample = () => {
    window.open('/api/admin/sample-excel', '_blank')
  }

  return (
    <div className="admin-import">
      <h2>📥 Import Products from Excel</h2>

      <div className="admin-import-card">
        <div className="admin-import-section">
          <h3>1. Download Sample Template</h3>
          <p>Start with our sample Excel file to see the required format.</p>
          <button className="admin-btn admin-btn-secondary" onClick={handleDownloadSample}>
            📄 Download Sample Excel
          </button>
        </div>

        <div className="admin-import-divider" />

        <div className="admin-import-section">
          {!categoriesLoading && existingCategories.length > 0 && (
            <div className="admin-import-info">
              <p>
                <strong>📂 Existing categories in the store:</strong>{' '}
                {existingCategories.map((cat, i) => (
                  <span key={cat}>
                    {i > 0 && ', '}
                    <code>{cat}</code>
                  </span>
                ))}
                . Use these in your <code>Category</code> column, or new ones will be created automatically.
              </p>
            </div>
          )}

          <h3>2. Select Excel File</h3>
          <p>Upload an Excel file with columns: <code>Product_Name</code>, <code>Price</code>, <code>Category</code>, <code>Sort_Order</code>.</p>
          <p className="admin-form-hint" style={{ marginTop: '6px' }}>
            💡 <code>Product_Name</code> can be in English <em>or</em> Marathi (Devanagari). The system auto-detects and translates if needed.
          </p>

          <div className="admin-import-upload">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              ref={fileRef}
              className="admin-file-input"
            />
            {file && (
              <p className="admin-file-name">
                Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        <div className="admin-import-divider" />

        <div className="admin-import-section">
          <h3>3. Upload Product Images (Optional)</h3>
          <p>
            Select image files named to match your product names (e.g., <code>Kashmiri_Garlic_Black.jpeg</code>).
            The system will auto-link them to products. Images are stored directly in the database.
          </p>

          <div className="admin-import-upload">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleImagesChange}
              ref={imagesRef}
              className="admin-file-input"
            />
          </div>

          {imageFiles.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p className="admin-file-name" style={{ marginBottom: '8px' }}>
                <strong>{imageFiles.length}</strong> image{imageFiles.length !== 1 ? 's' : ''} selected:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {imageFiles.map((imgFile, idx) => (
                  <div key={idx} style={{ position: 'relative', textAlign: 'center' }}>
                    <img
                      src={URL.createObjectURL(imgFile)}
                      alt={imgFile.name}
                      style={{
                        width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px',
                        border: '2px solid #e8e6e1', display: 'block',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{
                        position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px',
                        borderRadius: '50%', border: 'none', background: '#e53e3e', color: '#fff',
                        fontSize: '12px', cursor: 'pointer', lineHeight: '20px', padding: 0,
                      }}
                      title="Remove"
                    >
                      ✕
                    </button>
                    <p style={{ fontSize: '.7rem', color: '#6c6c80', marginTop: '4px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {imgFile.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="admin-import-divider" />

        <div className="admin-import-section">
          <h3>4. Import</h3>
          <div className="admin-import-upload">
            <button
              className="admin-btn admin-btn-primary"
              onClick={handleImport}
              disabled={!file || importing}
            >
              {importing ? '⏳ Importing...' : '🚀 Import Products'}
            </button>
          </div>

          {error && <p className="admin-form-error">{error}</p>}

          {result && (
            <div className="admin-import-result">
              ✅ {result.message}
              {result.imagesImported > 0 && (
                <span> ({result.imagesImported} image{result.imagesImported !== 1 ? 's' : ''} stored)</span>
              )}
            </div>
          )}
        </div>

        <div className="admin-import-divider" />

        <div className="admin-import-section">
          <h3>Excel Format Reference</h3>
          <table className="admin-format-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>Product_Name</code></td><td>✅ Yes</td><td>Product name in English or Marathi (auto-detected)</td></tr>
              <tr><td><code>Price</code></td><td>✅ Yes</td><td>Product price (number)</td></tr>
              <tr><td><code>Category</code></td><td>Optional</td><td>Category name (if omitted, guessed from product name)</td></tr>
              <tr><td><code>Sort_Order</code></td><td>Optional</td><td>Display order (lower = first)</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-import-note">
        <p>💡 <strong>Tip:</strong> Name your image files to match the product slugs — e.g., <code>Kashmiri_Garlic_Black.jpeg</code> for "Kashmiri Garlic Black". Upload them in step 3 and they'll be stored in the database automatically.</p>
      </div>
    </div>
  )
}
