let currentCurrency = 'USD';
let widgetData = null;
let chartInstance = null;

const formatCurrency = (val, currency) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency }).format(val);
};

const getWidgetState = (vendasHoje, meta) => {
  if (vendasHoje === 0) return 'bad';
  if (vendasHoje < meta * 0.5) return 'warn';
  if (vendasHoje >= meta) return 'good';
  return 'warn';
};

const animateValue = (obj, start, end, duration, formatFn) => {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // ease-out
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = start + easeOut * (end - start);
    obj.innerHTML = formatFn(current);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
};

const timeAgo = (isoString) => {
  const diffMs = new Date() - new Date(isoString);
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'agora';
  return `há ${diffMins} min`;
};

const updateUI = (data) => {
  widgetData = data;
  const state = getWidgetState(data.vendas_hoje, data.meta_diaria);
  
  const container = document.getElementById('widget-container');
  container.className = `widget-container state-${state}`;

  // Variation
  const varBadge = document.getElementById('variation-badge');
  if (data.variacao_vs_ontem > 0) {
    varBadge.textContent = `↑ +${data.variacao_vs_ontem} vs ontem`;
    varBadge.className = 'variation color-good';
  } else if (data.variacao_vs_ontem < 0) {
    varBadge.textContent = `↓ ${data.variacao_vs_ontem} vs ontem`;
    varBadge.className = 'variation color-bad';
  } else {
    varBadge.textContent = `= igual ontem`;
    varBadge.className = 'variation';
    varBadge.style.color = 'var(--text-secondary)';
  }

  // Meta
  document.getElementById('meta-value').textContent = data.meta_diaria;

  // Status
  const statusText = document.getElementById('status-text');
  const dot = document.getElementById('status-dot');
  if (data.status === 'offline') {
    statusText.textContent = `Sem conexão · último sync ${timeAgo(data.atualizado_em)}`;
    container.classList.remove(`state-${state}`);
    container.classList.add('state-warn');
    dot.classList.remove('live');
  } else {
    statusText.textContent = `Ao vivo · atualizado ${timeAgo(data.atualizado_em)}`;
    dot.classList.add('live');
  }

  renderValue();
  renderChart(data.historico_horas, state);
};

const renderValue = () => {
  if (!widgetData) return;
  const valElement = document.getElementById('main-value');
  const targetVal = currentCurrency === 'USD' ? widgetData.valor_total_usd : widgetData.valor_total_brl;
  
  document.getElementById('currency-label').textContent = currentCurrency;

  animateValue(valElement, 0, targetVal, 800, (v) => formatCurrency(v, currentCurrency));
};

window.toggleCurrency = () => {
  currentCurrency = currentCurrency === 'USD' ? 'BRL' : 'USD';
  renderValue();
};

const renderChart = (dataArray, state) => {
  const ctx = document.getElementById('salesChart').getContext('2d');
  
  const colorMap = {
    'good': '#10B981',
    'warn': '#F59E0B',
    'bad': '#EF4444'
  };
  const colorHex = colorMap[state] || colorMap['warn'];
  
  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 60);
  gradient.addColorStop(0, colorHex + '33'); // 0.2 opacity
  gradient.addColorStop(1, colorHex + '00'); // 0 opacity

  if (chartInstance) {
    chartInstance.destroy();
  }

  // Neon glow via context shadow before drawing
  Chart.defaults.elements.line.borderCapStyle = 'round';
  Chart.defaults.elements.line.borderJoinStyle = 'round';

  const glowPlugin = {
    id: 'glow',
    beforeDatasetsDraw: (chart) => {
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = colorHex;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    },
    afterDatasetsDraw: (chart) => {
      chart.ctx.restore();
    }
  };

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataArray.map((_, i) => i),
      datasets: [{
        data: dataArray,
        borderColor: colorHex,
        borderWidth: 2,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      },
      layout: {
        padding: { left: -5, right: -5, top: 5, bottom: 0 }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          position: 'right',
          grid: {
            color: '#1F2937',
            lineWidth: 1,
            drawBorder: false,
          },
          border: { display: false },
          ticks: {
            color: '#6B7280',
            font: { size: 9 },
            maxTicksLimit: 3,
            padding: 2
          }
        }
      }
    },
    plugins: [glowPlugin]
  });
};

const loadData = async () => {
  try {
    const res = await fetch('/api/widget/vendas-hoje');
    if (!res.ok) throw new Error('API erro');
    const data = await res.json();
    updateUI(data);
  } catch (err) {
    // Fallback to cache if available
    caches.match('/api/widget/vendas-hoje').then(res => {
      if (res) {
        res.json().then(data => {
          data.status = 'offline';
          updateUI(data);
        });
      }
    });
  }
};

// Listen to service worker
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WIDGET_UPDATE') {
    updateUI(event.data.data);
  }
});

// Init
loadData();
setInterval(loadData, 60000); // refresh time ago every minute
