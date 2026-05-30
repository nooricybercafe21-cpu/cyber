/* ======================================================
   analytics.js — Profitability & Analytics Dashboard
   ====================================================== */

let analyticsCharts = {};

async function loadAnalytics() {
  const days = parseInt(document.getElementById('analytics-period').value) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [salesRes, purchasesRes] = await Promise.all([
    API.get('sales'),
    API.get('purchases')
  ]);

  const allSales = (salesRes.data || []).filter(s => new Date(s.sale_date) >= since);
  const allPurchases = (purchasesRes.data || []).filter(p => new Date(p.purchase_date) >= since);

  const totalRevenue = allSales.reduce((s, x) => s + (x.total_amount || 0), 0);
  const totalPurchases = allPurchases.reduce((s, x) => s + (x.total_amount || 0), 0);
  const avgOrder = allSales.length ? totalRevenue / allSales.length : 0;

  document.getElementById('an-total-revenue').textContent = fmt(totalRevenue);
  document.getElementById('an-total-orders').textContent = allSales.length;
  document.getElementById('an-avg-order').textContent = fmt(avgOrder);
  document.getElementById('an-total-purchases').textContent = fmt(totalPurchases);

  drawRevenueTrend(allSales, days);
  drawProfitByCategory(allSales);
  drawTopProducts(allSales);
  drawPaymentMethods(allSales);
}

function drawRevenueTrend(sales, days) {
  const labels = [];
  const data = [];

  if (days <= 30) {
    // Daily
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' }));
      const dayTotal = sales
        .filter(s => s.sale_date?.slice(0,10) === key)
        .reduce((t, s) => t + (s.total_amount || 0), 0);
      data.push(parseFloat(dayTotal.toFixed(2)));
    }
  } else {
    // Weekly
    const weeks = Math.ceil(days / 7);
    for (let w = weeks - 1; w >= 0; w--) {
      const wStart = new Date();
      wStart.setDate(wStart.getDate() - (w + 1) * 7);
      const wEnd = new Date();
      wEnd.setDate(wEnd.getDate() - w * 7);
      labels.push(`W${weeks - w}`);
      const wTotal = sales
        .filter(s => {
          const d = new Date(s.sale_date);
          return d >= wStart && d < wEnd;
        })
        .reduce((t, s) => t + (s.total_amount || 0), 0);
      data.push(parseFloat(wTotal.toFixed(2)));
    }
  }

  destroyChart('revenueTrendChart');
  const ctx = document.getElementById('revenueTrendChart').getContext('2d');
  analyticsCharts.revenueTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (₹)',
        data,
        borderColor: '#5b4fcf',
        backgroundColor: 'rgba(91,79,207,.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#5b4fcf',
        pointRadius: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function drawProfitByCategory(sales) {
  const catTotals = {};
  sales.forEach(s => {
    const items = safeJSON(s.items, []);
    items.forEach(i => {
      const cat = i.category || 'other';
      catTotals[cat] = (catTotals[cat] || 0) + (i.price * i.qty);
    });
  });

  const labels = Object.keys(catTotals).map(c => catLabel(c));
  const data = Object.values(catTotals).map(v => parseFloat(v.toFixed(2)));
  const colors = ['#5b4fcf','#3b82f6','#22c55e','#f97316','#a855f7','#14b8a6','#ef4444'];

  destroyChart('profitCategoryChart');
  const ctx = document.getElementById('profitCategoryChart').getContext('2d');
  analyticsCharts.profitCategory = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });
}

function drawTopProducts(sales) {
  const productMap = {};
  sales.forEach(s => {
    const items = safeJSON(s.items, []);
    items.forEach(i => {
      const key = i.name;
      if (!productMap[key]) productMap[key] = 0;
      productMap[key] += i.price * i.qty;
    });
  });

  const sorted = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  destroyChart('topProductsChart');
  const ctx = document.getElementById('topProductsChart').getContext('2d');
  analyticsCharts.topProducts = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(([name]) => name.length > 18 ? name.slice(0,16)+'…' : name),
      datasets: [{
        label: 'Revenue (₹)',
        data: sorted.map(([,val]) => parseFloat(val.toFixed(2))),
        backgroundColor: 'rgba(91,79,207,.8)',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

function drawPaymentMethods(sales) {
  const methods = {};
  sales.forEach(s => { methods[s.payment_method || 'cash'] = (methods[s.payment_method || 'cash'] || 0) + 1; });
  const labels = Object.keys(methods).map(m => m.toUpperCase());
  const data = Object.values(methods);
  const colors = ['#5b4fcf','#22c55e','#3b82f6','#f97316','#a855f7'];

  destroyChart('paymentChart');
  const ctx = document.getElementById('paymentChart').getContext('2d');
  analyticsCharts.paymentChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } } }
  });
}

function destroyChart(id) {
  const key = id.replace('Chart', '').charAt(0).toLowerCase() + id.replace('Chart', '').slice(1);
  // Try to destroy via Chart.js registry
  const existing = Chart.getChart(id);
  if (existing) existing.destroy();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-refresh-analytics').addEventListener('click', loadAnalytics);
  document.getElementById('analytics-period').addEventListener('change', loadAnalytics);
});
