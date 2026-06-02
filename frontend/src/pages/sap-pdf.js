import { showToast } from '../main.js'

export function renderSapPdf(container) {
  let selectedFormat = 'both'
  let selectedFile   = null
  let lastResult     = null

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title">SAP PDF EXTRACTOR</div>
        <div class="page-subtitle">Extract tables from SAP production reports → JSON / CSV</div>
      </div>
      <div class="split-layout">

        <div class="panel-left">
          <label class="label">Upload SAP PDF Report</label>
          <div class="drop-zone" id="dropZone">
            <input type="file" id="fileInput" accept=".pdf"/>
            <div class="drop-zone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div class="drop-zone-title" id="dropZoneTitle">DRAG & DROP PDF</div>
            <div class="drop-zone-sub">or click to browse</div>
          </div>
          <button class="btn-mock" id="mockBtn">USE MOCK SAP REPORT</button>

          <div class="divider"></div>
          <label class="label">Output Format</label>
          <div class="pill-group" id="formatPills">
            <button class="pill" data-fmt="json">JSON</button>
            <button class="pill" data-fmt="csv">CSV</button>
            <button class="pill active" data-fmt="both">BOTH</button>
          </div>

          <button class="btn-primary mt-16" id="extractBtn">
            <span id="extractBtnText">EXTRACT</span>
          </button>
        </div>

        <div class="panel-right" id="resultsPanel">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="empty-state-text">DROP A PDF TO BEGIN</div>
          </div>
        </div>

      </div>
    </div>
  `

  const dropZone    = container.querySelector('#dropZone')
  const fileInput   = container.querySelector('#fileInput')
  const dropTitle   = container.querySelector('#dropZoneTitle')
  const extractBtn  = container.querySelector('#extractBtn')
  const extractText = container.querySelector('#extractBtnText')
  const resultsPanel= container.querySelector('#resultsPanel')
  const mockBtn     = container.querySelector('#mockBtn')

  // Drop zone
  dropZone.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0])
  })
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over') })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
  dropZone.addEventListener('drop', e => {
    e.preventDefault()
    dropZone.classList.remove('drag-over')
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])
  })

  function setFile(f) {
    selectedFile = f
    dropTitle.textContent = f.name
    dropZone.classList.add('has-file')
  }

  // Format pills
  container.querySelectorAll('#formatPills .pill').forEach(p => {
    p.addEventListener('click', () => {
      container.querySelectorAll('#formatPills .pill').forEach(x => x.classList.remove('active'))
      p.classList.add('active')
      selectedFormat = p.dataset.fmt
    })
  })

  // Mock button
  mockBtn.addEventListener('click', () => {
    selectedFile = null
    dropTitle.textContent = 'mock_sap_report.pdf (MOCK)'
    dropZone.classList.add('has-file')
    doExtract(true)
  })

  // Extract button
  extractBtn.addEventListener('click', () => doExtract(false))

  async function doExtract(useMock) {
    extractBtn.disabled = true
    extractText.innerHTML = '<span class="spinner"></span>'

    const fd = new FormData()
    fd.append('output_format', selectedFormat)
    if (useMock || !selectedFile) {
      fd.append('use_mock', 'true')
    } else {
      fd.append('file', selectedFile)
      fd.append('use_mock', 'false')
    }

    try {
      const res = await fetch('/api/sap-pdf/extract', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Extraction failed')
      }
      lastResult = await res.json()
      renderResults(lastResult)
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    } finally {
      extractBtn.disabled = false
      extractText.textContent = 'EXTRACT'
    }
  }

  function renderResults(data) {
    const { meta, tables, downloads } = data
    let tablesHtml = ''
    tables.forEach(t => {
      const cols = t.columns.length ? t.columns : (t.records[0] ? Object.keys(t.records[0]) : [])
      const rows = t.records.slice(0, 30)
      tablesHtml += `
        <div style="margin-bottom:24px;">
          <div class="section-title">${escHtml(t.name)} <span style="color:var(--t4);font-weight:400;">(${t.total_rows} rows)</span></div>
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead><tr>${cols.map(c => `<th>${escHtml(String(c))}</th>`).join('')}</tr></thead>
              <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${escHtml(String(r[c] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      `
    })

    const dlBtns = Object.entries(downloads).map(([fmt, url]) => `
      <a class="btn-secondary" href="${url}" download style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">
        ↓ Download ${fmt.toUpperCase()}
      </a>
    `).join('')

    resultsPanel.innerHTML = `
      <div class="card">
        <div class="kpi-row">
          <div class="kpi-chip"><div class="kpi-label">PLANT</div><div class="kpi-value" style="font-size:14px;">${escHtml(meta.plant)}</div></div>
          <div class="kpi-chip"><div class="kpi-label">COMPANY CODE</div><div class="kpi-value" style="font-size:14px;">${escHtml(meta.company_code)}</div></div>
          <div class="kpi-chip"><div class="kpi-label">RUN DATE</div><div class="kpi-value" style="font-size:14px;">${escHtml(meta.run_date)}</div></div>
          <div class="kpi-chip"><div class="kpi-label">TABLES FOUND</div><div class="kpi-value">${meta.tables_found}</div></div>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:20px;">${dlBtns}</div>
        ${tablesHtml || '<div class="empty-state-text" style="padding:20px;">No tables extracted</div>'}
      </div>
    `
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;')
}
