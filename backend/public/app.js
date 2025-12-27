const socket = io();
let candleSeries, volSeries, analyticsSeries, candleChart, analyticsChart;
let ma7Series, ma25Series, ma99Series;
let lastPrice = 0;
let priceHistory = [];
let allTrades = [];

// Chart Setup
function initCharts() {
  // Main Candlestick Chart - Binance Style
  candleChart = LightweightCharts.createChart(document.getElementById('candleChart'), {
    layout: {
      background: { color: '#0b0e11' },
      textColor: '#787b86'
    },
    grid: {
      vertLines: { color: '#1e222d', style: 0 },
      horzLines: { color: '#1e222d', style: 0 }
    },
    width: document.getElementById('candleChart').clientWidth,
    height: 500,
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: {
        color: '#9598a1',
        width: 1,
        style: 3,
        labelBackgroundColor: '#363c4e'
      },
      horzLine: {
        color: '#9598a1',
        width: 1,
        style: 3,
        labelBackgroundColor: '#363c4e'
      }
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: '#2b2f36',
      barSpacing: 6,
      minBarSpacing: 4,
      rightOffset: 12,
      fixLeftEdge: false,
      fixRightEdge: false
    },
    rightPriceScale: {
      borderColor: '#2b2f36',
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      }
    },
    localization: {
      priceFormatter: price => '$' + price.toFixed(2)
    }
  });

  // Candlestick Series
  candleSeries = candleChart.addCandlestickSeries({
    upColor: '#0ecb81',
    downColor: '#f6465d',
    borderUpColor: '#0ecb81',
    borderDownColor: '#f6465d',
    wickUpColor: '#0ecb81',
    wickDownColor: '#f6465d',
    borderVisible: true,
    priceLineVisible: true
  });

  // Moving Average Lines
  ma7Series = candleChart.addLineSeries({
    color: '#f7931a',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    title: 'MA 7'
  });

  ma25Series = candleChart.addLineSeries({
    color: '#c77dff',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    title: 'MA 25'
  });

  ma99Series = candleChart.addLineSeries({
    color: '#f72585',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
    title: 'MA 99'
  });

  // Volume Histogram
  volSeries = candleChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    scaleMargins: {
      top: 0.7,
      bottom: 0,
    }
  });

  // Analytics Chart (Price Area)
  analyticsChart = LightweightCharts.createChart(document.getElementById('analyticsChart'), {
    layout: {
      background: { color: '#0b0e11' },
      textColor: '#787b86'
    },
    grid: {
      vertLines: { color: '#1e222d', style: 0 },
      horzLines: { color: '#1e222d', style: 0 }
    },
    width: document.getElementById('analyticsChart').clientWidth,
    height: 200,
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: {
        color: '#9598a1',
        width: 1,
        style: 3
      },
      horzLine: {
        color: '#9598a1',
        width: 1,
        style: 3
      }
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: '#2b2f36',
      barSpacing: 6,
      rightOffset: 12
    },
    rightPriceScale: {
      borderColor: '#2b2f36',
    }
  });

  analyticsSeries = analyticsChart.addAreaSeries({
    topColor: 'rgba(14, 203, 129, 0.4)',
    bottomColor: 'rgba(14, 203, 129, 0.0)',
    lineColor: '#0ecb81',
    lineWidth: 2,
    priceLineVisible: false,
    crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    candleChart.resize(document.getElementById('candleChart').clientWidth, 500);
    analyticsChart.resize(document.getElementById('analyticsChart').clientWidth, 200);
  });
}

// Calculate Moving Average
function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: data[i].time,
      value: sum / period
    });
  }
  return result;
}

// Data Handling
socket.on('connect', () => {
  console.log('Connected to server');
  updateConnectionStatus(true);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  updateConnectionStatus(false);
});

function updateConnectionStatus(connected) {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.connection-status span:last-child');

  if (connected) {
    statusDot.classList.add('pulse');
    statusText.textContent = 'Live Stream';
  } else {
    statusDot.classList.remove('pulse');
    statusText.textContent = 'Disconnected';
  }
}

socket.on('asset_info', info => {
  document.getElementById('assetLogo').src = info.logo;
  document.getElementById('assetSymbol').textContent = info.symbol;
  document.title = `${info.symbol} Whale Watcher | Real-Time`;
});

socket.on('trade_update', trade => {
  allTrades.push(trade);
  const time = Math.floor(trade.timestamp / 1000);

  // Update price ticker with animation
  const priceEl = document.getElementById('tickerPrice');
  const changeEl = document.getElementById('tickerChange');
  const newPrice = trade.price;

  priceEl.textContent = '$' + newPrice.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  // Calculate and display price change
  if (lastPrice > 0) {
    const change = ((newPrice - lastPrice) / lastPrice) * 100;
    changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className = 'ticker-change ' + (change >= 0 ? 'positive' : 'negative');

    // Price flash animation
    priceEl.classList.remove('flash-green', 'flash-red');
    void priceEl.offsetWidth;
    priceEl.classList.add(change >= 0 ? 'flash-green' : 'flash-red');
  }

  lastPrice = newPrice;

  // Update History Table
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
    <td class="${trade.isWhale ? 'whale-trade' : ''}">${trade.quantity.toFixed(4)}</td>
    <td>$${trade.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
  `;

  const tbody = document.getElementById('historyBody');
  tbody.insertBefore(row, tbody.firstChild);

  while (tbody.children.length > 50) {
    tbody.removeChild(tbody.lastChild);
  }

  // Trigger whale alert
  if (trade.isWhale) {
    addWhaleAlert(trade);
  }

  // Update whale alert groups
  updateWhaleGroups();
});

socket.on('metrics_update', m => {
  // Update market stats
  document.getElementById('high1h').textContent = '$' + m.high1h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('low1h').textContent = '$' + m.low1h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('volume1h').textContent = m.volume1h.toFixed(2) + " BTC";
  document.getElementById('whaleCount').textContent = m.whaleCount;
  document.getElementById('maxWhale').textContent = "$" + Math.round(m.maxWhaleAmount).toLocaleString();

  // Update whale pressure
  const pressureEl = document.getElementById('whalePressure');
  pressureEl.textContent = m.whalePressure;
  pressureEl.className = 'pressure-badge ' + m.whalePressure.toLowerCase();
});

socket.on('chart_data', data => {
  if (!data || data.length === 0) return;

  // Update candlestick chart
  const candleData = data.map(d => ({
    time: d.time,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close
  }));

  const volumeData = data.map(d => ({
    time: d.time,
    value: d.volume,
    color: d.close >= d.open ? 'rgba(14, 203, 129, 0.5)' : 'rgba(246, 70, 93, 0.5)'
  }));

  candleSeries.setData(candleData);
  volSeries.setData(volumeData);

  // Calculate and display Moving Averages
  if (data.length >= 99) {
    const ma7Data = calculateMA(data, 7);
    const ma25Data = calculateMA(data, 25);
    const ma99Data = calculateMA(data, 99);

    ma7Series.setData(ma7Data);
    ma25Series.setData(ma25Data);
    ma99Series.setData(ma99Data);

    // Update MA values in sidebar
    if (ma7Data.length > 0) {
      document.getElementById('ma7Value').textContent = '$' + ma7Data[ma7Data.length - 1].value.toFixed(2);
    }
    if (ma25Data.length > 0) {
      document.getElementById('ma25Value').textContent = '$' + ma25Data[ma25Data.length - 1].value.toFixed(2);
    }
    if (ma99Data.length > 0) {
      document.getElementById('ma99Value').textContent = '$' + ma99Data[ma99Data.length - 1].value.toFixed(2);
    }
  }

  // Update analytics chart
  const lineData = data.map(d => ({
    time: d.time,
    value: d.close
  }));

  analyticsSeries.setData(lineData);

  // Calculate technical indicators
  if (data.length >= 20) {
    const prices = data.map(d => d.close);

    // Simple Moving Average (SMA-20)
    const sma = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    document.getElementById('smaValue').textContent = '$' + sma.toFixed(2);

    // Exponential Moving Average (EMA-12)
    const ema = calculateEMA(prices, 12);
    document.getElementById('emaValue').textContent = '$' + ema.toFixed(2);

    // RSI (14)
    const rsi = calculateRSI(prices, 14);
    document.getElementById('rsiValue').textContent = rsi.toFixed(2);

    // Color code RSI
    const rsiEl = document.getElementById('rsiValue');
    if (rsi > 70) {
      rsiEl.style.color = '#f6465d'; // Overbought
    } else if (rsi < 30) {
      rsiEl.style.color = '#0ecb81'; // Oversold
    } else {
      rsiEl.style.color = '#f7931a'; // Neutral
    }
  }
});

// Calculate EMA
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return ema;
}

// Calculate RSI
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

// Whale Alert Management
let whaleAlerts = [];

function addWhaleAlert(trade) {
  whaleAlerts.unshift({
    time: trade.timestamp,
    quantity: trade.quantity,
    value: trade.tradeValue,
    price: trade.price
  });

  // Keep only last 100 alerts
  if (whaleAlerts.length > 100) {
    whaleAlerts = whaleAlerts.slice(0, 100);
  }

  updateWhaleGroups();
}

function updateWhaleGroups() {
  const now = Date.now();

  // Filter whales by time periods
  const whales5min = whaleAlerts.filter(w => now - w.time < 5 * 60 * 1000);
  const whales10min = whaleAlerts.filter(w => now - w.time < 10 * 60 * 1000);
  const whales15min = whaleAlerts.filter(w => now - w.time < 15 * 60 * 1000);

  // Update 5 min section
  updateWhaleSection('alerts5min', whales5min.slice(0, 5));
  document.getElementById('count5min').textContent = whales5min.length;

  // Update 10 min section
  updateWhaleSection('alerts10min', whales10min.slice(0, 5));
  document.getElementById('count10min').textContent = whales10min.length;

  // Update 15 min section
  updateWhaleSection('alerts15min', whales15min.slice(0, 5));
  document.getElementById('count15min').textContent = whales15min.length;
}

function updateWhaleSection(containerId, alerts) {
  const container = document.getElementById(containerId);

  if (alerts.length === 0) {
    container.innerHTML = '<div class="no-alerts">No whale activity</div>';
    return;
  }

  container.innerHTML = alerts.map(alert => `
    <div class="alert-item">
      <div class="alert-time">${new Date(alert.time).toLocaleTimeString()}</div>
      <div class="alert-amount">${alert.quantity.toFixed(2)} BTC</div>
      <div class="alert-value">$${alert.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
  `).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  console.log('ðŸ‹ Whale Watcher initialized');

  // Update whale groups every 10 seconds
  setInterval(updateWhaleGroups, 20000);
});