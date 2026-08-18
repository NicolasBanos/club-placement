import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import { Upload, Download, FileSpreadsheet, Check, AlertCircle, X, Clock, ArrowLeft, Users, UserPlus, Trash2 } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const REQUIRED_COLUMNS = ['first_name', 'last_name', 'grade', 'teacher', 'club_name', 'family_email']
const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function SpreadsheetUpload() {
  const [tab, setTab] = useState('students')   // students | teachers

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{
          background: 'white', padding: isMobile ? '68px 16px 16px' : '16px 28px', borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
              Import Data
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Upload club assignments or manage the homeroom teacher list
            </div>
          </div>
        </div>

        <div style={{ padding: isMobile ? '16px 16px 0' : '16px 28px 0', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setTab('students')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: tab === 'students' ? theme.colors.primary : 'white',
              color: tab === 'students' ? 'white' : theme.colors.textSecondary,
              border: `1px solid ${tab === 'students' ? theme.colors.primary : theme.colors.border}`,
              borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600',
              fontFamily: theme.fonts.primary, cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={14} /> Student & Club Import
          </button>
          <button
            onClick={() => setTab('teachers')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: tab === 'teachers' ? theme.colors.primary : 'white',
              color: tab === 'teachers' ? 'white' : theme.colors.textSecondary,
              border: `1px solid ${tab === 'teachers' ? theme.colors.primary : theme.colors.border}`,
              borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600',
              fontFamily: theme.fonts.primary, cursor: 'pointer',
            }}
          >
            <Users size={14} /> Homeroom Teachers
          </button>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '16px' : '20px 28px' }}>
          {tab === 'students' ? <StudentImport /> : <TeacherImport />}
        </div>
      </div>
    </div>
  )
}

// ============ Existing student/club spreadsheet import (unchanged logic) ============

function StudentImport() {
  const [step, setStep] = useState('upload')   // upload | grid | result
  const [filename, setFilename] = useState('')
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [cellErrors, setCellErrors] = useState([])
  const [cellWarnings, setCellWarnings] = useState([])
  const [validated, setValidated] = useState(false)
  const [validationSummary, setValidationSummary] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showMessage('Please upload a .xlsx, .xls, or .csv file', 'error')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFilename(res.data.filename)
      setColumns(res.data.columns)
      setRows(res.data.rows)
      setCellErrors([])
      setCellWarnings([])
      setValidated(false)
      setValidationSummary(null)
      setStep('grid')
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to parse file', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/import/template', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'club_import_template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      showMessage('Failed to download template', 'error')
    }
  }

  const handleCellEdit = (rowIndex, column, value) => {
    setRows(prev => {
      const next = [...prev]
      next[rowIndex] = { ...next[rowIndex], [column]: value }
      return next
    })
    setValidated(false)
    setCellWarnings([])
  }

  const handleValidate = async () => {
    setLoading(true)
    try {
      const res = await api.post('/import/validate-rows', { rows })
      setCellErrors(res.data.cell_errors || [])
      setCellWarnings(res.data.cell_warnings || [])
      setValidationSummary(res.data)
      setValidated(res.data.valid)
      if (res.data.structural_error) {
        showMessage(res.data.structural_error, 'error')
      } else if (res.data.valid) {
        showMessage('All rows valid — ready to import.')
      } else {
        showMessage(`${res.data.invalid_rows} row(s) need fixing.`, 'error')
      }
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Validation failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await api.post('/import/confirm-rows', { rows })
      setReport(res.data.report)
      setStep('result')
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Import failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const errorFor = (rowIndex, column) =>
    cellErrors.find(e => e.row_index === rowIndex && e.column === column)
  const warningFor = (rowIndex, column) =>
    cellWarnings.find(w => w.row_index === rowIndex && w.column === column)

  const resetAll = () => {
    setStep('upload')
    setFilename('')
    setColumns([])
    setRows([])
    setCellErrors([])
    setValidated(false)
    setValidationSummary(null)
    setReport(null)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          onClick={handleDownloadTemplate}
          style={{ background: 'white', color: theme.colors.primary, border: `1.5px solid ${theme.colors.primary}`, borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={15} /> Download template
        </button>
      </div>

      {message && (
        <div style={{
          marginBottom: '16px',
          background: messageType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight,
          border: `1px solid ${messageType === 'error' ? theme.colors.danger : theme.colors.border}`,
          borderRadius: '9px', padding: '12px 16px',
          color: messageType === 'error' ? theme.colors.danger : theme.colors.primary,
          fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600'
        }}>
          {message}
        </div>
      )}

      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'white',
            border: `2px dashed ${dragOver ? theme.colors.primary : theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: '60px 40px', textAlign: 'center', cursor: 'pointer',
            maxWidth: '640px', margin: '20px auto',
          }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <FileSpreadsheet size={44} color={theme.colors.primary} style={{ marginBottom: '14px' }} />
          <div style={{ fontSize: '16px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
            {loading ? 'Reading file...' : 'Drop your spreadsheet here'}
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '6px' }}>
            or click to browse · .xlsx, .xls, or .csv
          </div>
        </div>
      )}

      {step === 'grid' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={resetAll} style={{ background: 'white', color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ArrowLeft size={13} /> Start over
              </button>
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                {filename} · {rows.length} rows
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleValidate}
                disabled={loading}
                style={{ background: 'white', color: theme.colors.primary, border: `1.5px solid ${theme.colors.primary}`, borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={15} /> Validate
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !validated}
                style={{
                  background: validated ? theme.colors.primary : theme.colors.border,
                  color: validated ? 'white' : theme.colors.textMuted,
                  border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '600',
                  fontFamily: theme.fonts.primary, cursor: validated ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                <Upload size={15} /> Confirm import
              </button>
            </div>
          </div>

          {validationSummary && (
            <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', fontSize: '12px', fontFamily: theme.fonts.primary }}>
              <span style={{ color: theme.colors.primary, fontWeight: '600' }}>{validationSummary.valid_rows} valid</span>
              {validationSummary.invalid_rows > 0 && (
                <span style={{ color: theme.colors.danger, fontWeight: '600' }}>{validationSummary.invalid_rows} need fixing</span>
              )}
            </div>
          )}

          <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: theme.fonts.primary }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col} style={{
                      textAlign: 'left', padding: '10px 12px', fontSize: '11px', fontWeight: '700',
                      color: REQUIRED_COLUMNS.includes(col) ? theme.colors.primary : theme.colors.textMuted,
                      borderBottom: `1px solid ${theme.colors.border}`, whiteSpace: 'nowrap', background: theme.colors.background,
                    }}>
                      {col}{REQUIRED_COLUMNS.includes(col) ? ' *' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map(col => {
                      const err = errorFor(rowIndex, col)
                      const warn = !err && warningFor(rowIndex, col)
                      return (
                        <td key={col} style={{ padding: '3px', borderBottom: `1px solid ${theme.colors.border}` }}>
                          <input
                            value={row[col] ?? ''}
                            onChange={(e) => handleCellEdit(rowIndex, col, e.target.value)}
                            title={err ? err.message : warn ? warn.message : ''}
                            style={{
                              width: '100%', minWidth: '90px', boxSizing: 'border-box',
                              padding: '7px 8px', fontSize: '12px', fontFamily: theme.fonts.primary,
                              border: err ? `1.5px solid ${theme.colors.danger}` : warn ? `1.5px solid ${theme.colors.warning}` : `1px solid transparent`,
                              background: err ? theme.colors.dangerLight : warn ? theme.colors.warningLight : 'white',
                              borderRadius: '5px', outline: 'none',
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'result' && report && (
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { label: 'Enrolled', value: report.counts.enrolled, color: theme.colors.primary },
              { label: 'Waitlisted', value: report.counts.waitlisted, color: theme.colors.warning },
              { label: 'Skipped', value: report.counts.skipped, color: theme.colors.danger },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 120px', background: 'white', borderRadius: theme.borderRadius.md, padding: '16px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '26px', fontWeight: '800', color: s.color, fontFamily: theme.fonts.primary }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {report.waitlisted.length > 0 && (
            <div style={{ background: theme.colors.warningLight, border: `1px solid ${theme.colors.warning}`, borderRadius: theme.borderRadius.lg, padding: '16px 18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.warning, fontFamily: theme.fonts.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={13} /> WAITLISTED ({report.waitlisted.length}) — clubs were full
              </div>
              {report.waitlisted.map((w, i) => (
                <div key={i} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                  {w.student} → {w.club} (position {w.position})
                </div>
              ))}
            </div>
          )}

          {report.enrolled.length > 0 && (
            <div style={{ background: 'white', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, padding: '16px 18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={13} /> ENROLLED ({report.enrolled.length})
              </div>
              {report.enrolled.map((e, i) => (
                <div key={i} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                  {e.student} → {e.club}
                </div>
              ))}
            </div>
          )}

          {report.skipped.length > 0 && (
            <div style={{ background: 'white', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, padding: '16px 18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.danger, fontFamily: theme.fonts.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <X size={13} /> SKIPPED ({report.skipped.length})
              </div>
              {report.skipped.map((s, i) => (
                <div key={i} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                  {s.student} → {s.club} — <span style={{ color: theme.colors.danger }}>{s.reason}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={resetAll}
            style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>
            Import another file
          </button>
        </div>
      )}
    </>
  )
}

// ============ New: homeroom teacher import + management ============

function TeacherImport() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [report, setReport] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGrade, setNewGrade] = useState('')

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const loadTeachers = () => {
    api.get('/homeroom-teachers/')
      .then(res => setTeachers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  if (!loaded) {
    setLoaded(true)
    loadTeachers()
  }

  const handleFile = async (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showMessage('Please upload a .xlsx, .xls, or .csv file', 'error')
      return
    }
    setUploading(true)
    setReport(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await api.post('/homeroom-teachers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReport(res.data.report)
      showMessage(`Added ${res.data.report.counts.added}, skipped ${res.data.report.counts.skipped}.`)
      loadTeachers()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Import failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleAddSingle = async () => {
    if (!newName.trim() || newGrade === '') {
      showMessage('Enter a name and grade', 'error')
      return
    }
    try {
      await api.post('/homeroom-teachers/', { name: newName.trim(), grade: Number(newGrade) })
      showMessage(`${newName.trim()} added.`)
      setNewName('')
      setNewGrade('')
      setShowAddForm(false)
      loadTeachers()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to add teacher', 'error')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return
    try {
      await api.delete(`/homeroom-teachers/${id}`)
      loadTeachers()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to remove teacher', 'error')
    }
  }

  const inp = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px' }

  return (
    <>
      {message && (
        <div style={{
          marginBottom: '16px',
          background: messageType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight,
          border: `1px solid ${messageType === 'error' ? theme.colors.danger : theme.colors.border}`,
          borderRadius: '9px', padding: '12px 16px',
          color: messageType === 'error' ? theme.colors.danger : theme.colors.primary,
          fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: '1 1 300px',
            background: 'white',
            border: `2px dashed ${dragOver ? theme.colors.primary : theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
          }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <FileSpreadsheet size={30} color={theme.colors.primary} style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
            {uploading ? 'Uploading…' : 'Import teachers from spreadsheet'}
          </div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>
            Columns: name, grade · .xlsx, .xls, or .csv
          </div>
        </div>

        <div style={{ flex: '1 1 300px', background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserPlus size={15} /> Add one teacher
          </div>
          {!showAddForm ? (
            <div onClick={() => setShowAddForm(true)} style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, cursor: 'pointer' }}>
              Click to add a single homeroom teacher manually
            </div>
          ) : (
            <div>
              <input style={{ ...inp, marginBottom: '8px' }} placeholder="Teacher name" value={newName} onChange={e => setNewName(e.target.value)} />
              <select style={{ ...inp, marginBottom: '10px' }} value={newGrade} onChange={e => setNewGrade(e.target.value)}>
                <option value="">Select grade…</option>
                {Object.entries(GRADE_LABELS).map(([g, label]) => <option key={g} value={g}>{label}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleAddSingle} style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>
                  Add
                </button>
                <button onClick={() => { setShowAddForm(false); setNewName(''); setNewGrade('') }} style={{ background: 'white', color: theme.colors.textMuted, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {report && (
        <div style={{ background: 'white', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, padding: '16px 18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '8px' }}>
            Import result: {report.counts.added} added, {report.counts.skipped} skipped
          </div>
          {report.skipped.length > 0 && report.skipped.map((s, i) => (
            <div key={i} style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
              Row {s.row}: {s.name || '(blank)'} — <span style={{ color: theme.colors.danger }}>{s.reason}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>
        Current homeroom teachers ({teachers.length})
      </div>
      {loading ? (
        <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading…</div>
      ) : teachers.length === 0 ? (
        <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No homeroom teachers added yet.</div>
      ) : (
        <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, overflow: 'hidden' }}>
          {teachers.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < teachers.length - 1 ? `1px solid ${theme.colors.border}` : 'none' }}>
              <span style={{ fontSize: '13px', color: '#333', fontFamily: theme.fonts.primary }}>
                {t.name} <span style={{ color: theme.colors.textMuted, fontWeight: '400' }}>· Grade {GRADE_LABELS[t.grade]}</span>
              </span>
              <button onClick={() => handleDelete(t.id, t.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={14} color={theme.colors.danger} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default SpreadsheetUpload