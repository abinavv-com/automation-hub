import { showToast } from '../main.js'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function renderFinancialPpt(container) {
  const now = new Date()
  let selectedMonthIdx = now.getMonth()
  let selectedYear = now.getFullYear()
  let lastResult = null

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title">FINANCIAL PPT GENERATOR</div>
        <div class="page-subtitle">Generate board-ready presentations from monthly financial data</div>
      </div>
      <div class="split-layout">

        <div class="panel-left">
          <label class="label">Reporting Month</label>
          <div class="month-grid" id="monthGrid">
            ${MONTHS.map((m,i) => `<button class="month-pill${i===selectedMonthIdx?' active':''}" data-idx="${i}">${m}</button>`).join('')}
          </div>

          <div style="margin-top:14px;">
            <label class="label">Year</label>
            <input class="year-input" id="yearInput" type="number" value="${selectedYear}" min="2020" max="2035"/>
          </div>

          <div class="divider"></div>
          <button class="btn-primary" id="generateBtn">
            <span id="generateBtnText">GENERATE PRESENTATION</span>
          </button>
          <div id="progressEl" style="display:none;font-family:var(--font-mono);font-size:11px;color:var(--t4);text-align:center;margin-top:8px;">
            Processing<span class="loading-dots"></span>
          </div>
        </div>

        <div class="panel-right" id="previewPanel">
          <div class="empty-state">
            <div class="pptx-icon">📊</div>
            <div class="empty-state-text">CONFIGURE AND GENERATE</div>
          </div>
        </div>

      </div>
    </div>
  `

  // Month pills
  container.querySelectorAll('.month-pill').forEach(p => {
    p.addEventListener('click', () => {
      container.querySelectorAll('.month-pill').forEach(x => x.classList.remove('active'))
      p.classList.add('active')
      selectedMonthIdx = parseInt(p.dataset.idx)
    })
  })

  const generateBtn  = container.querySelector('#generateBtn')
  const generateText = container.querySelector('#generateBtnText')
  const progressEl   = container.querySelector('#progressEl')
  const previewPanel = container.querySelector('#previewPanel')
  const yearInput    = container.querySelector('#yearInput')

  generateBtn.addEventListener('click', async () => {
    const month = `${MONTHS[selectedMonthIdx]} ${yearInput.value}`
    generateBtn.disabled = true
    generateText.innerHTML = '<span class="spinner"></span>'
    progressEl.style.display = ''

    try {
      const res = await fetch('/api/financial-ppt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, use_mock: true, no_openai: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Generation failed')
      }
      lastResult = await res.json()
      renderPreview(lastResult)
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    } finally {
      generateBtn.disabled = false
      generateText.textContent = 'GENERATE PRESENTATION'
      progressEl.style.display = 'none'
    }
  })

  function renderPreview(data) {
    const { slides, file_size_kb, generated_at, elapsed_sec, download_url } = data
    const slidesHtml = slides.map((s, i) => `
      <div class="slide-preview-card">
        <div class="slide-num">SLIDE ${i + 1}</div>
        <div class="slide-title">${escHtml(s.title)}</div>
        <span class="slide-type-badge ${s.type}">${s.type.toUpperCase()}</span>
      </div>
    `).join('')

    previewPanel.innerHTML = `
      <div class="card">
        <div class="section-title">Slide Outline — ${escHtml(generated_at)}</div>
        <div class="slide-preview-grid">${slidesHtml}</div>
        <div class="meta-row">
          <div class="meta-item">Size: <span>${file_size_kb} KB</span></div>
          <div class="meta-item">Generated in: <span>${elapsed_sec}s</span></div>
          <div class="meta-item">Slides: <span>${slides.length}</span></div>
        </div>
        <a class="btn-download" href="${download_url}" download>
          ↓ DOWNLOAD .PPTX
        </a>
      </div>
    `
  }
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
