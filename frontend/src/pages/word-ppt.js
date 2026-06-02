import { showToast } from '../main.js'

export function renderWordPpt(container) {
  let selectedFile = null
  let useMock      = false

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title">WORD → PPT CONVERTER</div>
        <div class="page-subtitle">Convert Word reports into Welspun-branded PowerPoint presentations</div>
      </div>

      <div class="drop-zone-large" id="dropZone">
        <input type="file" id="fileInput" accept=".docx"/>
        <div class="drop-zone-icon" style="color:var(--amber);margin-bottom:12px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="drop-zone-title" id="dropTitle" style="font-size:14px;">DRAG & DROP .DOCX FILE</div>
        <div class="drop-zone-sub" style="margin-top:6px;">accepts .docx format</div>
      </div>

      <div style="text-align:center;margin-top:-10px;margin-bottom:20px;">
        <button class="mock-link" id="mockLink">OR USE MOCK REPORT</button>
      </div>

      <div id="convertRow" style="display:none;margin-bottom:24px;">
        <button class="btn-primary" id="convertBtn" style="max-width:320px;margin:0 auto;">
          <span id="convertBtnText">CONVERT TO PRESENTATION</span>
        </button>
      </div>

      <div id="resultsSection" style="display:none;">
        <div class="section-title">Slide Outline</div>
        <div id="slideOutline" class="slide-outline"></div>
        <div id="downloadRow" style="margin-top:20px;max-width:320px;"></div>
      </div>
    </div>
  `

  const dropZone   = container.querySelector('#dropZone')
  const fileInput  = container.querySelector('#fileInput')
  const dropTitle  = container.querySelector('#dropTitle')
  const mockLink   = container.querySelector('#mockLink')
  const convertRow = container.querySelector('#convertRow')
  const convertBtn = container.querySelector('#convertBtn')
  const convertText= container.querySelector('#convertBtnText')

  // Drop zone wiring
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
    useMock = false
    dropTitle.textContent = f.name
    dropZone.classList.add('has-file')
    convertRow.style.display = ''
  }

  mockLink.addEventListener('click', () => {
    useMock = true
    selectedFile = null
    dropTitle.textContent = 'mock_report.docx (MOCK)'
    dropZone.classList.add('has-file')
    convertRow.style.display = ''
  })

  convertBtn.addEventListener('click', doConvert)

  async function doConvert() {
    convertBtn.disabled = true
    convertText.innerHTML = '<span class="spinner" style="border-top-color:#000;border-color:rgba(0,0,0,0.3);"></span>'

    const fd = new FormData()
    if (useMock || !selectedFile) {
      fd.append('use_mock', 'true')
    } else {
      fd.append('file', selectedFile)
      fd.append('use_mock', 'false')
    }

    try {
      const res = await fetch('/api/word-ppt/convert', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Conversion failed')
      }
      const data = await res.json()
      renderResults(data)
      showToast('Presentation generated successfully', 'success')
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    } finally {
      convertBtn.disabled = false
      convertText.textContent = 'CONVERT TO PRESENTATION'
    }
  }

  function renderResults(data) {
    const { slides, file_size_kb, download_url } = data
    const outlineEl  = container.querySelector('#slideOutline')
    const dlRow      = container.querySelector('#downloadRow')
    const resultsSection = container.querySelector('#resultsSection')

    outlineEl.innerHTML = slides.map((s, i) => {
      const bullets = (s.bullets || []).slice(0, 6)
      const bodyHtml = bullets.length
        ? `<ul>${bullets.map(b => `<li>${escHtml(b)}</li>`).join('')}</ul>`
        : '<p style="font-size:11px;color:var(--t4);font-style:italic;">No bullet content</p>'

      return `
        <div class="slide-outline-item" data-idx="${i}">
          <div class="slide-outline-header">
            <span class="slide-num-badge">${i + 1}</span>
            <span class="slide-outline-title">${escHtml(s.title || 'Untitled Slide')}</span>
            <span class="slide-type-badge ${s.content_type || 'text'}" style="margin-right:6px;">${(s.content_type||'text').toUpperCase()}</span>
            <span class="chevron">›</span>
          </div>
          <div class="slide-outline-body">
            ${bodyHtml}
            ${s.table ? '<div style="margin-top:8px;font-family:var(--font-mono);font-size:10px;color:var(--cyan);">⊞ TABLE INCLUDED</div>' : ''}
          </div>
        </div>
      `
    }).join('')

    // Toggle expand/collapse
    outlineEl.querySelectorAll('.slide-outline-header').forEach(h => {
      h.addEventListener('click', () => {
        h.closest('.slide-outline-item').classList.toggle('expanded')
      })
    })

    dlRow.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:11px;color:var(--t4);margin-bottom:10px;">
        ${slides.length} slides · ${file_size_kb} KB
      </div>
      <a class="btn-download" href="${download_url}" download style="text-decoration:none;">
        ↓ DOWNLOAD .PPTX
      </a>
    `

    resultsSection.style.display = ''
  }
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
