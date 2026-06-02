import { showToast } from '../main.js'

let charts = []

export function renderMaintenance(container) {
  // Destroy any previous Chart.js instances
  charts.forEach(c => c.destroy())
  charts = []

  container.innerHTML = `
    <div class="page-container" style="max-width:100%;">
      <div class="page-header">
        <div class="page-title">MAINTENANCE DASHBOARD</div>
        <div class="page-subtitle">Machine breakdown calls · Welspun Pipe Division</div>
      </div>

      <div id="dashLoading" style="padding:40px;text-align:center;font-family:var(--font-mono);color:var(--t4);">
        Loading data<span class="loading-dots"></span>
      </div>
      <div id="dashContent" style="display:none;">

        <div class="kpi-cards-row" id="kpiCards"></div>

        <div class="charts-row">
          <div class="chart-card">
            <div class="chart-title">Calls per Machine (Top 10) — Day vs Night</div>
            <div class="chart-canvas-wrap"><canvas id="barChart"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">Resolution Status</div>
            <div class="chart-canvas-wrap"><canvas id="doughnutChart"></canvas></div>
          </div>
        </div>

        <div class="trend-card">
          <div class="chart-title">Daily Call Frequency Trend</div>
          <div style="position:relative;height:200px;"><canvas id="lineChart"></canvas></div>
        </div>

        <div class="table-toolbar">
          <select class="filter-select" id="filterMachine"><option value="">All Machines</option></select>
          <select class="filter-select" id="filterShift">
            <option value="">All Shifts</option>
            <option value="Day">Day</option>
            <option value="Night">Night</option>
          </select>
          <select class="filter-select" id="filterStatus">
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <div class="spacer"></div>
          <button class="btn-export" id="exportCsvBtn">↓ EXPORT CSV</button>
        </div>

        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Machine</th><th>Shift</th>
                <th>Problem</th><th>Attended By</th>
                <th>Resolve Time (hrs)</th><th>Status</th>
              </tr>
            </thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `

  let allRows = []
  let kpis    = {}

  fetch('/api/maintenance/data')
    .then(r => r.json())
    .then(data => {
      kpis    = data.kpis
      allRows = data.rows
      const machines = data.machines

      // Populate machine filter
      const machSel = container.querySelector('#filterMachine')
      machines.forEach(m => {
        const o = document.createElement('option')
        o.value = m; o.textContent = m
        machSel.appendChild(o)
      })

      renderKpis(kpis)
      renderCharts(kpis)
      renderTable(allRows)

      container.querySelector('#dashLoading').style.display = 'none'
      container.querySelector('#dashContent').style.display = ''

      // Filters
      ;['filterMachine','filterShift','filterStatus'].forEach(id => {
        container.querySelector('#' + id).addEventListener('change', applyFilters)
      })

      // Export
      container.querySelector('#exportCsvBtn').addEventListener('click', () => exportCsv(filterRows()))
    })
    .catch(e => {
      showToast('Failed to load maintenance data: ' + e.message, 'error')
      container.querySelector('#dashLoading').textContent = 'Error loading data'
    })

  function filterRows() {
    const m = container.querySelector('#filterMachine').value
    const s = container.querySelector('#filterShift').value
    const st = container.querySelector('#filterStatus').value
    return allRows.filter(r =>
      (!m  || r.machine === m) &&
      (!s  || r.shift   === s) &&
      (!st || r.Status  === st)
    )
  }

  function applyFilters() {
    renderTable(filterRows())
  }

  function renderKpis(k) {
    const el = container.querySelector('#kpiCards')
    el.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-number">${k.total_calls ?? '—'}</div>
        <div class="kpi-label">Total Calls</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number">${k.avg_resolution_time_hrs ?? '—'} hrs</div>
        <div class="kpi-label">Avg Resolution Time</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number">${k.open_rate_pct ?? '—'}%</div>
        <div class="kpi-label">Open Rate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-number" style="font-size:16px;">${k.top_machine ?? '—'}</div>
        <div class="kpi-label">Top Machine</div>
      </div>
    `
  }

  function renderCharts(k) {
    // Bar chart: top 10 machines, day vs night
    const shiftData = k.calls_per_machine_shift || []
    const top10 = k.top_5_machines
      ? [...new Set([...k.top_5_machines, ...Object.keys(k.calls_per_machine || {}).slice(0, 10)])]
        .slice(0, 10)
      : Object.keys(k.calls_per_machine || {}).slice(0, 10)

    const dayData   = top10.map(m => shiftData.find(d => d.machine === m && d.shift === 'Day')?.calls  ?? 0)
    const nightData = top10.map(m => shiftData.find(d => d.machine === m && d.shift === 'Night')?.calls ?? 0)

    const barCtx = container.querySelector('#barChart').getContext('2d')
    charts.push(new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: top10,
        datasets: [
          { label: 'Day',   data: dayData,   backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 2 },
          { label: 'Night', data: nightData, backgroundColor: 'rgba(34,211,238,0.5)', borderRadius: 2 },
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
        scales: {
          x: { stacked: true, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { stacked: true, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
        }
      }
    }))

    // Doughnut chart
    const dCtx = container.querySelector('#doughnutChart').getContext('2d')
    charts.push(new Chart(dCtx, {
      type: 'doughnut',
      data: {
        labels: ['Closed', 'Open'],
        datasets: [{
          data: [k.closed_count ?? 0, k.open_count ?? 0],
          backgroundColor: ['rgba(74,222,128,0.7)', 'rgba(248,113,113,0.7)'],
          borderColor: ['rgba(74,222,128,0.3)', 'rgba(248,113,113,0.3)'],
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 16 } }
        }
      }
    }))

    // Line chart: daily trend
    const trend = k.daily_trend || {}
    const dates  = Object.keys(trend).sort()
    const counts = dates.map(d => trend[d])

    const lCtx = container.querySelector('#lineChart').getContext('2d')
    charts.push(new Chart(lCtx, {
      type: 'line',
      data: {
        labels: dates.map(d => d.slice(5)),  // "MM-DD"
        datasets: [{
          label: 'Daily Calls',
          data: counts,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.07)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        }
      }
    }))
  }

  function renderTable(rows) {
    const tbody = container.querySelector('#tableBody')
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${esc(r.Date)}</td>
        <td>${esc(r.machine || r.Equipment)}</td>
        <td>${esc(r.shift)}</td>
        <td style="max-width:200px;white-space:normal;">${esc(r['Problem Description'])}</td>
        <td>${esc(r['Attended By'])}</td>
        <td>${esc(r['Time to Resolve (hrs)'])}</td>
        <td><span class="status-chip ${(r.Status||'').toLowerCase()}">${esc(r.Status)}</span></td>
      </tr>
    `).join('')
  }

  function exportCsv(rows) {
    if (!rows.length) return
    const cols = ['Date','machine','shift','Problem Description','Attended By','Time to Resolve (hrs)','Status']
    const lines = [cols.join(','), ...rows.map(r => cols.map(c => `"${(r[c]||'').replace(/"/g,'""')}"`).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'maintenance_logs.csv'
    a.click()
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
