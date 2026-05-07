import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';

export default function LabResults() {
    const [results, setResults] = useState([]);
    const [patients, setPatients] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadMode, setUploadMode] = useState('text'); // 'text' or 'file'
    const [form, setForm] = useState({ patient_id: '', test_type: 'mammogram', result_summary: '' });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => { load(); }, []);
    const load = () => {
        api.getLabResults().then(setResults).catch(() => { });
        api.getLabPatients().then(setPatients).catch(() => { });
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploading(true);
        try {
            if (uploadMode === 'file' && file) {
                await api.uploadLabResultWithFile(
                    parseInt(form.patient_id), form.test_type, form.result_summary, file
                );
            } else {
                await api.uploadLabResult({ ...form, patient_id: parseInt(form.patient_id), result_data: {} });
            }
            setShowUpload(false);
            setForm({ patient_id: '', test_type: 'mammogram', result_summary: '' });
            setFile(null);
            setUploadMode('text');
            load();
        } catch (e) { alert(e.message); }
        setUploading(false);
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) { setFile(dropped); setUploadMode('file'); }
    };

    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected) { setFile(selected); setUploadMode('file'); }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const fileIcon = (name) => {
        if (!name) return '📄';
        const ext = name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(ext)) return '🖼️';
        if (['pdf'].includes(ext)) return '📑';
        if (['dcm', 'dicom'].includes(ext)) return '🔬';
        if (['doc', 'docx'].includes(ext)) return '📝';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
        return '📄';
    };

    return (
        <div className="animate-in">
            <div className="page-header flex-between">
                <div><h1>🧪 Lab Results</h1><p>Upload and manage screening and test results</p></div>
                <button className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Upload Result</button>
            </div>

            <div className="card">
                {results.length === 0 ? (
                    <div className="empty-state"><div className="icon">🧪</div><h3>No Lab Results</h3><p>Upload your first lab result to get started.</p></div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Patient</th><th>Test Type</th><th>Summary</th><th>File</th><th>Status</th><th>Date</th></tr></thead>
                            <tbody>
                                {results.map(r => (
                                    <tr key={r.id}>
                                        <td className="fw-600">{r.patient_name}</td>
                                        <td>{r.test_type.replace('_', ' ').toUpperCase()}</td>
                                        <td className="text-sm" style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.result_summary}</td>
                                        <td>
                                            {r.has_file ? (
                                                <a href={api.downloadLabFile(r.id)} target="_blank" rel="noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'var(--accent-glow)', border: '1px solid var(--accent)', textDecoration: 'none', fontSize: 12, color: 'var(--accent)' }}>
                                                    {fileIcon(r.file_name)} {r.file_name || 'Download'}
                                                </a>
                                            ) : (
                                                <span className="text-sm text-muted">—</span>
                                            )}
                                        </td>
                                        <td><span className={`pill pill-${r.status === 'completed' ? 'success' : 'pending'}`}>{r.status}</span></td>
                                        <td className="text-sm text-muted">{new Date(r.date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showUpload && (
                <div className="modal-overlay" onClick={() => setShowUpload(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <h2>🧪 Upload Lab Result</h2>

                        {/* Mode toggle */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <button type="button" className={`btn ${uploadMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => setUploadMode('text')}>📝 Text Only</button>
                            <button type="button" className={`btn ${uploadMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => setUploadMode('file')}>📁 Upload File</button>
                        </div>

                        <form onSubmit={handleUpload}>
                            <div className="form-group">
                                <label>Patient</label>
                                <select className="form-select" value={form.patient_id} onChange={e => setForm({ ...form, patient_id: e.target.value })} required>
                                    <option value="">Select patient...</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} {p.age ? `(${p.age}y)` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Test Type</label>
                                <select className="form-select" value={form.test_type} onChange={e => setForm({ ...form, test_type: e.target.value })}>
                                    <option value="mammogram">Mammogram</option>
                                    <option value="biopsy">Biopsy</option>
                                    <option value="ultrasound">Ultrasound</option>
                                    <option value="mri">MRI</option>
                                    <option value="blood_test">Blood Test</option>
                                    <option value="ct_scan">CT Scan</option>
                                    <option value="pet_scan">PET Scan</option>
                                </select>
                            </div>

                            {/* File upload zone */}
                            {uploadMode === 'file' && (
                                <div className="form-group">
                                    <label>Attach File</label>
                                    <div
                                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleFileDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: `2px dashed ${dragOver ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            padding: file ? '16px 20px' : '32px 20px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            background: dragOver ? 'var(--accent-glow)' : file ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                                            transition: 'var(--transition)',
                                        }}>
                                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }}
                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.dcm,.dicom,.doc,.docx,.xls,.xlsx,.csv" />
                                        {file ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontSize: 32 }}>{fileIcon(file.name)}</span>
                                                <div style={{ textAlign: 'left', flex: 1 }}>
                                                    <div className="fw-600 text-sm">{file.name}</div>
                                                    <div className="text-sm text-muted">{formatSize(file.size)}</div>
                                                </div>
                                                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 20, padding: 4 }}>×</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                                                <p className="fw-600" style={{ marginBottom: 4 }}>Drop file here or click to browse</p>
                                                <p className="text-sm text-muted">Supports: Images, PDFs, DICOM, Docs, Spreadsheets (max 50MB)</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Result Summary</label>
                                <textarea className="form-textarea" value={form.result_summary} onChange={e => setForm({ ...form, result_summary: e.target.value })} required
                                    placeholder="Detailed summary of test findings..." rows={4} />
                            </div>

                            <div className="flex-between">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowUpload(false); setFile(null); setUploadMode('text'); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={uploading || (uploadMode === 'file' && !file)}>
                                    {uploading ? '⏳ Uploading...' : uploadMode === 'file' ? '📤 Upload with File' : '📤 Upload Result'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
