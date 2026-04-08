import React, { useState, useEffect, useCallback } from 'react';
import './index.css';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getFileIcon(contentType, name) {
  if (contentType && contentType.startsWith('image/')) return { bg: '#6366f120', color: '#818cf8', label: 'IMG' };
  if (contentType && contentType.startsWith('video/')) return { bg: '#f43f5e20', color: '#fb7185', label: 'VID' };
  if (contentType && contentType.includes('pdf')) return { bg: '#ef444420', color: '#ef4444', label: 'PDF' };
  if (contentType && contentType.includes('json')) return { bg: '#22c55e20', color: '#22c55e', label: 'JSON' };
  if (name && /\.(js|ts|py|rb|go|rs)$/i.test(name)) return { bg: '#eab30820', color: '#eab308', label: 'CODE' };
  if (name && /\.(md|txt|csv|log)$/i.test(name)) return { bg: '#8b5cf620', color: '#a78bfa', label: 'TXT' };
  return { bg: '#64748b20', color: '#94a3b8', label: 'FILE' };
}

function isPreviewable(contentType) {
  return contentType && contentType.startsWith('image/');
}

function UploadModal({ onClose, onUploaded, folder }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFiles = (fileList) => {
    setFiles(prev => [...prev, ...Array.from(fileList)]);
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress('Uploading ' + (i + 1) + ' of ' + files.length + ': ' + file.name);
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, fileBase64: base64, folder }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      }
      onUploaded();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Upload Files{folder ? ' to ' + folder : ''}</h2>
        <div className="form-group">
          <div
            className={'drop-zone' + (dragActive ? ' active' : '')}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={e => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.onchange = e => handleFiles(e.target.files); i.click(); }}
          >
            {files.length ? (
              <div className="file-list">
                {files.map((f, i) => <li key={i}>{f.name} ({formatBytes(f.size)})</li>)}
                <p style={{marginTop: 12, fontSize: 13, color: 'var(--text2)'}}>Click or drop to add more</p>
              </div>
            ) : (
              <p>Drop files here or click to browse</p>
            )}
          </div>
        </div>
        {progress && <p style={{fontSize: 13, color: 'var(--accent2)', marginBottom: 12}}>{progress}</p>}
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={uploading || !files.length}>
            {uploading ? 'Uploading...' : 'Upload ' + files.length + ' file' + (files.length !== 1 ? 's' : '')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/files?pageSize=200');
      if (!res.ok) throw new Error('Failed to load files');
      const data = await res.json();
      setFiles(data.blobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleDelete = async (key) => {
    if (!confirm('Delete ' + key + '?')) return;
    await fetch('/api/files/' + encodeURIComponent(key), { method: 'DELETE' });
    loadFiles();
  };

  const filtered = files.filter(f =>
    f.key.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>FileVault</h1>
          <p>File storage powered by Embr Blob Storage — no database required</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Upload</button>
      </div>

      <div className="stats-bar">
        <div className="stat"><span className="value">{files.length}</span><span className="label">Files</span></div>
        <div className="stat"><span className="value">{formatBytes(totalSize)}</span><span className="label">Storage Used</span></div>
        <div className="stat"><span className="value">{new Set(files.map(f => (f.contentType || '').split('/')[0])).size}</span><span className="label">File Types</span></div>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading">Loading files...</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <h3>{search ? 'No matching files' : 'No files yet'}</h3>
          <p>{search ? 'Try a different search' : 'Upload your first file to get started'}</p>
        </div>
      ) : (
        <table className="file-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Size</th>
              <th>Type</th>
              <th>Modified</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => {
              const icon = getFileIcon(f.contentType, f.key);
              const displayName = f.key.split('/').pop() || f.key;
              return (
                <tr key={f.key}>
                  <td><div className="file-icon" style={{background: icon.bg, color: icon.color}}>{icon.label}</div></td>
                  <td className="file-name">
                    {isPreviewable(f.contentType) ? (
                      <a href="#" onClick={e => { e.preventDefault(); setPreviewUrl('/_embr/blob/' + f.key); }}>{displayName}</a>
                    ) : (
                      <a href={'/_embr/blob/' + f.key} target="_blank" rel="noopener noreferrer">{displayName}</a>
                    )}
                    {f.key.includes('/') && <div className="file-meta">{f.key.substring(0, f.key.lastIndexOf('/'))}</div>}
                  </td>
                  <td className="file-meta">{formatBytes(f.sizeBytes)}</td>
                  <td className="file-meta">{f.contentType || 'unknown'}</td>
                  <td className="file-meta">{f.lastModified ? formatDate(f.lastModified) : '-'}</td>
                  <td><button className="btn btn-danger" onClick={() => handleDelete(f.key)}>Delete</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={loadFiles} folder="" />}
      {previewUrl && (
        <div className="preview-overlay" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="preview" />
        </div>
      )}
    </div>
  );
}
