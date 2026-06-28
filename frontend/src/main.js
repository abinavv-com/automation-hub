import '../src/style.css'
import { renderHome }          from './pages/home.js'
import { renderSapPdf }        from './pages/sap-pdf.js'
import { renderMaintenance }   from './pages/maintenance.js'
import { renderFinancialPpt }  from './pages/financial-ppt.js'
import { renderWordPpt }       from './pages/word-ppt.js'

window.__AUTOMATION_HUB_BUILD__ = '2026-06-02-spa-boot-guard'

// ─── Toast system ─────────────────────────────────────────────────────────
let toastContainer = null
export function showToast(msg, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'toast-container'
    document.body.appendChild(toastContainer)
  }
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  toastContainer.appendChild(t)
  setTimeout(() => t.remove(), 4000)
}

// ─── Router ────────────────────────────────────────────────────────────────
const routes = {
  '/':             renderHome,
  '/sap-pdf':      renderSapPdf,
  '/maintenance':  renderMaintenance,
  '/financial-ppt':renderFinancialPpt,
  '/word-ppt':     renderWordPpt,
}

function getRoute() {
  const hash = window.location.hash.replace('#', '') || '/'
  return hash
}

function navigate(path) {
  if (getRoute() === path) {
    render()
    return
  }
  window.location.hash = '#' + path
}

function render() {
  const path   = getRoute()
  const main   = document.getElementById('main-content')
  const fn     = routes[path] || renderHome
  if (!main) return
  main.innerHTML = ''
  try {
    fn(main, navigate)
  } catch (error) {
    console.error('Automation Hub render failed:', error)
    main.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div class="page-title">AUTOMATION HUB</div>
          <div class="page-subtitle">The page failed to render in this browser session.</div>
        </div>
        <div class="card">
          <div class="section-title">Render error</div>
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--red);line-height:1.7;">
            ${String(error?.message || error || 'Unknown error')}
          </div>
          <button class="btn-primary mt-16" id="retryRenderBtn" style="max-width:220px;">RETRY</button>
        </div>
      </div>
    `
    main.querySelector('#retryRenderBtn')?.addEventListener('click', render)
  }

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === path)
  })
}

// ─── Nav wiring ────────────────────────────────────────────────────────────
function ensureRendered() {
  const main = document.getElementById('main-content')
  if (main && main.children.length === 0) render()
}

function initApp() {
  document.querySelectorAll('.nav-item').forEach(el => {
    if (el.dataset.bound === 'true') return
    el.dataset.bound = 'true'
    el.addEventListener('click', () => navigate(el.dataset.route))
  })

  render()
  window.setTimeout(ensureRendered, 0)
  window.setTimeout(ensureRendered, 250)
}

window.addEventListener('hashchange', render)
window.addEventListener('pageshow', ensureRendered)
window.addEventListener('focus', ensureRendered)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true })
} else {
  initApp()
}
