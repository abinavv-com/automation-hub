export function renderHome(container, navigate) {
  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <div class="page-title">AUTOMATION HUB</div>
        <div class="page-subtitle">Welspun Corp Pipe Division · 4 active AI initiatives</div>
      </div>

      <div class="initiative-grid">

        <div class="initiative-card" data-route="/sap-pdf">
          <div class="card-header-row">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <span class="status-badge ready">READY</span>
          </div>
          <div>
            <div class="card-title">SAP PDF EXTRACTOR</div>
            <div class="card-desc">Extract structured tables from SAP production reports. Outputs clean JSON + CSV ready for downstream analytics.</div>
          </div>
          <div class="card-action">
            <button class="btn-open">OPEN →</button>
          </div>
        </div>

        <div class="initiative-card" data-route="/maintenance">
          <div class="card-header-row">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span class="status-badge ready">READY</span>
          </div>
          <div>
            <div class="card-title">MAINTENANCE DASHBOARD</div>
            <div class="card-desc">Live KPI dashboard for machine breakdown calls across shifts. Identifies top failure points and open ticket trends.</div>
          </div>
          <div class="card-action">
            <button class="btn-open">OPEN →</button>
          </div>
        </div>

        <div class="initiative-card" data-route="/financial-ppt">
          <div class="card-header-row">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <span class="status-badge ready">READY</span>
          </div>
          <div>
            <div class="card-title">FINANCIAL PPT GENERATOR</div>
            <div class="card-desc">Auto-generate board-ready PowerPoint decks from monthly financial Excel data. AI narrative + charts included.</div>
          </div>
          <div class="card-action">
            <button class="btn-open">OPEN →</button>
          </div>
        </div>

        <div class="initiative-card" data-route="/word-ppt">
          <div class="card-header-row">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <span class="status-badge ready">READY</span>
          </div>
          <div>
            <div class="card-title">WORD → PPT CONVERTER</div>
            <div class="card-desc">Convert Word reports into structured Welspun-branded PowerPoint presentations. Intelligent outline extraction.</div>
          </div>
          <div class="card-action">
            <button class="btn-open">OPEN →</button>
          </div>
        </div>

      </div>
    </div>
  `

  container.querySelectorAll('.initiative-card').forEach(card => {
    card.addEventListener('click', () => navigate(card.dataset.route))
  })
}
