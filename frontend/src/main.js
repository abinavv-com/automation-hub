import '../src/style.css'
import { renderHome }          from './pages/home.js'
import { renderSapPdf }        from './pages/sap-pdf.js'
import { renderMaintenance }   from './pages/maintenance.js'
import { renderFinancialPpt }  from './pages/financial-ppt.js'
import { renderWordPpt }       from './pages/word-ppt.js'

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
  window.location.hash = '#' + path
}

function render() {
  const path   = getRoute()
  const main   = document.getElementById('main-content')
  const fn     = routes[path] || renderHome
  main.innerHTML = ''
  fn(main, navigate)

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === path)
  })
}

// ─── Nav wiring ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.route))
})

window.addEventListener('hashchange', render)
render()
