/* ======================================================
   dashboard.js — Dashboard Stats & Charts
   Noori Cyber Cafe & Noori Perfume
   ====================================================== */

let dashCharts = {};

async function loadDashboard() {
  const today = todayStr();
  const monthStart = today.slice(0, 7) + '-01';

  const [salesRes, inventoryRes, customersRes, rechargeRes, bankingRes] = await Promise.all([
    API.get('sales'),
    API.get('inventory'),
    API.get('customers'),
    API.get('recharges'),
    API.get('banking_transactions')
  ]);

  // Animate stat cards on reload
  document.querySelectorAll('.stat-card').forEach((c, i) => {
    c.style.setProperty('--i', i);
    c.classList.remove('anim-card');
    void c.offsetWidth;
    c.classList.add('anim-card');
  });

  const allSalesData   = salesRes.data || [];
  const inventoryData  = (inventoryRes.data || []).filter(i => i.active !== false);
  const customersData  = (customersRes.data || []).filter(c => c.active !== false);
  const rechargeData   = (rechargeRes.data || []).filter(r => r.status === 'success');
  const bankingData    = (bankingRes.data || []).filter(t => t.status === 'success');

  // --- Today ---
  const todaySales   = allSalesData.filter(s  => (s.sale_date||'').slice(0,10)  === today);
  const todayRch     = rechargeData.filter(r  => (r.recharge_date||'').slice(0,10) === today);
  const todayBnk     = bankingData.filter(t   => (t.txn_date||'').slice(0,10)   === today);

  const todayRevenue  = todaySales.reduce((s,x) => s + (x.total_amount||0), 0);
  const todayRchAmt   = todayRch.reduce((s,r)  => s + (r.plan_amount||0), 0);
  const todayBnkEarned= todayBnk.reduce((s,t)  => s + (t.commission_earned||0) + (t.service_charge||0), 0);
  const todayRchComm  = todayRch.reduce((s,r)  => s + (r.commission_earned||0), 0);

  // --- Month ---
  const monthSales  = allSalesData.filter(s => (s.sale_date||'')    >= monthStart);
  const monthRch    = rechargeData.filter(r => (r.recharge_date||'') >= monthStart);
  const monthBnk    = bankingData.filter(t  => (t.txn_date||'')      >= monthStart);

  const monthRevenue = monthSales.reduce((s,x) => s + (x.total_amount||0), 0);
  const monthRchAmt  = monthRch.reduce((s,r)   => s + (r.plan_amount||0), 0);
  const monthBnkEarned = monthBnk.reduce((s,t) => s + (t.commission_earned||0) + (t.service_charge||0), 0);
  const monthRchComm   = monthRch.reduce((s,r) => s + (r.commission_earned||0), 0);
  const totalMonthEarnings = monthRevenue + monthRchComm + monthBnkEarned;

  // --- Stats update ---
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('stat-today-sales',    fmt(todayRevenue + todayRchComm + todayBnkEarned));
  set('stat-month-orders',   monthSales.length + monthRch.length + monthBnk.length);
  set('stat-customers',      customersData.length);
  set('stat-month-revenue',  fmt(totalMonthEarnings));

  const lowStock = inventoryData.filter(i => i.unit !== 'service' && i.stock_qty <= (i.low_stock_threshold||5));
  set('stat-low-stock', lowStock.length);

  const khataTotal = customersData.reduce((s,c) => s + (c.khata_balance||0), 0);
  set('stat-khata', fmt(khataTotal));

  // --- Dashboard lists ---
  renderDashboardLowStock(lowStock);
  renderTopItems(monthSales);
  renderServicesSummary(monthRch, monthBnk, monthRchComm, monthBnkEarned);

  // --- Charts ---
  drawDashSalesChart(allSalesData, rechargeData, bankingData);
  drawDashCategoryChart(monthSales, monthRch, monthBnk);
}

function renderServicesSummary(monthRch, monthBnk, rchComm, bnkEarned) {
  // Update recharge summary if on recharge page
  if (typeof renderRechargeSummary === 'function') {
    // Will be called when navigating to recharge page
  }
}

function renderDashboardLowStock(items) {
  const el = document.getElementById('dashboard-low-stock');
  if (!items.length) {
    el.innerHTML = `<p class="empty-msg">All items well stocked 👍</p>`;
    return;
  }
  el.innerHTML = `<div class="list-plain">
    ${items.slice(0,8).map(i => `<div class="list-plain-item">
      <div>
        <div style="font-weight:600;font-size:.83rem">${esc(i.name)}</div>
        <div style="font-size:.72rem;color:var(--text-3)">${catLabel(i.category)}</div>
      </div>
      <div style="text-align:right">
        <div class="stock-${i.stock_qty<=0?'low':'warn'}">${fmtN(i.stock_qty)} ${i.unit}</div>
        <div style="font-size:.7rem;color:var(--text-3)">Alert: ${i.low_stock_threshold||5} ${i.unit}</div>
      </div>
    </div>`).join('')}
  </div>`;
}

function renderTopItems(monthSales) {
  const el = document.getElementById('top-items-list');
  const productMap = {};
  monthSales.forEach(s => {
    safeJSON(s.items,[]).forEach(i => {
      const key = i.name;
      if (!productMap[key]) productMap[key] = { revenue:0, qty:0, cat:i.category };
      productMap[key].revenue += i.price * i.qty;
      productMap[key].qty    += i.qty;
    });
  });
  const sorted = Object.entries(productMap).sort((a,b) => b[1].revenue - a[1].revenue).slice(0,6);
  if (!sorted.length) { el.innerHTML = `<p class="empty-msg">No sales this month yet.</p>`; return; }
  el.innerHTML = `<div class="list-plain">
    ${sorted.map(([name,data],idx) => `<div class="list-plain-item">
      <div style="display:flex;align-items:center;gap:10px">
        <span class="list-rank">${idx+1}</span>
        <div>
          <div style="font-weight:600;font-size:.83rem">${esc(name)}</div>
          <div style="font-size:.7rem;color:var(--text-3)">${catLabel(data.cat)}</div>
        </div>
      </div>
      <div style="font-weight:800;color:var(--primary)">${fmt(data.revenue)}</div>
    </div>`).join('')}
  </div>`;
}

function drawDashSalesChart(allSales, recharges, banking) {
  const labels=[], salesData=[], rchData=[], bnkData=[];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    labels.push(d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}));
    salesData.push(parseFloat(allSales.filter(s=>(s.sale_date||'').slice(0,10)===key).reduce((t,s)=>t+(s.total_amount||0),0).toFixed(2)));
    rchData.push(parseFloat(recharges.filter(r=>(r.recharge_date||'').slice(0,10)===key).reduce((t,r)=>t+(r.commission_earned||0),0).toFixed(2)));
    bnkData.push(parseFloat(banking.filter(t=>(t.txn_date||'').slice(0,10)===key).reduce((t,b)=>t+(b.commission_earned||0)+(b.service_charge||0),0).toFixed(2)));
  }

  const existing = Chart.getChart('salesChart');
  if (existing) existing.destroy();
  const ctx = document.getElementById('salesChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Shop Sales', data:salesData, backgroundColor:'rgba(91,79,207,.8)', borderRadius:6 },
        { label:'Recharge Comm.', data:rchData, backgroundColor:'rgba(34,197,94,.8)', borderRadius:6 },
        { label:'Banking Earned', data:bnkData, backgroundColor:'rgba(239,68,68,.7)', borderRadius:6 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ font:{size:10}, padding:8 } } },
      scales:{ x:{ stacked:false }, y:{ beginAtZero:true } }
    }
  });
}

function drawDashCategoryChart(monthSales, monthRch, monthBnk) {
  const catMap = {};
  monthSales.forEach(s => {
    safeJSON(s.items,[]).forEach(i => {
      const c = i.category||'other';
      catMap[c] = (catMap[c]||0) + i.price*i.qty;
    });
  });
  const rchTotal  = monthRch.reduce((s,r) => s+(r.commission_earned||0),0);
  const bnkTotal  = monthBnk.reduce((s,t) => s+(t.commission_earned||0)+(t.service_charge||0),0);
  if (rchTotal > 0) catMap['Recharge Comm.'] = rchTotal;
  if (bnkTotal > 0) catMap['Banking Earned'] = bnkTotal;

  const existing = Chart.getChart('categoryChart');
  if (existing) existing.destroy();
  if (!Object.keys(catMap).length) return;

  const ctx = document.getElementById('categoryChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(catMap).map(c => catLabel(c)||c),
      datasets:[{ data: Object.values(catMap).map(v=>parseFloat(v.toFixed(2))),
        backgroundColor:['#5b4fcf','#3b82f6','#22c55e','#f97316','#a855f7','#14b8a6','#ef4444','#eab308'],
        borderWidth:2, borderColor:'#fff' }]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ font:{size:10}, padding:8 } } }
    }
  });
}
