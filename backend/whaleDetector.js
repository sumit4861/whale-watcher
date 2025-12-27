/**
 * WHALE DETECTOR MODULE - Updated for Dynamic Stats & Indicators
 */
class WhaleDetector {
  constructor() {
    this.tradeHistory = [];
    this.WHALE_THRESHOLD = 500000;
    this.MAX_HISTORY_MS = 60 * 60 * 1000; // 1-hour rolling window

    this.metrics = {
      whaleCount: 0,
      maxWhaleAmount: 0,
      high1h: 0,
      low1h: Infinity,
      volume1h: 0,
      rsi: 50,
      whalePressure: 'Neutral'
    };
  }

  processTrade(trade) {
    const price = parseFloat(trade.p);
    const quantity = parseFloat(trade.q);
    const tradeValue = price * quantity;
    const timestamp = trade.T || Date.now();

    const tradeRecord = {
      price,
      quantity,
      tradeValue,
      timestamp,
      isWhale: tradeValue >= this.WHALE_THRESHOLD
    };

    this.tradeHistory.push(tradeRecord);
    this.updateRealTimeStats();

    if (tradeRecord.isWhale) {
      this.metrics.whaleCount++;
      this.metrics.maxWhaleAmount = Math.max(this.metrics.maxWhaleAmount, tradeValue);
    }

    return tradeRecord;
  }

  updateRealTimeStats() {
    const now = Date.now();
    const cutoff = now - this.MAX_HISTORY_MS;

    // Filter history for the rolling 60-minute window
    this.tradeHistory = this.tradeHistory.filter(t => t.timestamp > cutoff);

    if (this.tradeHistory.length > 0) {
      let high = 0;
      let low = Infinity;
      let vol = 0;
      let whaleBuyValue = 0;
      let whaleSellValue = 0;

      this.tradeHistory.forEach(t => {
        if (t.price > high) high = t.price;
        if (t.price < low) low = t.price;
        vol += t.quantity;

        // Simple Whale Pressure: Is most whale volume at higher or lower prices?
        if (t.isWhale) {
          // If price is in top 50% of 1h range, consider it "Sell Pressure" (Distribution)
          const mid = (high + low) / 2;
          t.price > mid ? whaleSellValue += t.tradeValue : whaleBuyValue += t.tradeValue;
        }
      });

      this.metrics.high1h = high;
      this.metrics.low1h = low;
      this.metrics.volume1h = vol;

      // Determine Whale Pressure label
      const ratio = whaleBuyValue / (whaleSellValue || 1);
      if (ratio > 1.5) this.metrics.whalePressure = 'High Buy';
      else if (ratio < 0.5) this.metrics.whalePressure = 'High Sell';
      else this.metrics.whalePressure = 'Neutral';
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getChartData() {
    const buckets = new Map();
    this.tradeHistory.forEach(trade => {
      const minuteSlot = Math.floor(trade.timestamp / 60000) * 60000;
      if (!buckets.has(minuteSlot)) {
        buckets.set(minuteSlot, { time: minuteSlot / 1000, open: trade.price, high: trade.price, low: trade.price, close: trade.price, volume: 0 });
      }
      const b = buckets.get(minuteSlot);
      b.high = Math.max(b.high, trade.price);
      b.low = Math.min(b.low, trade.price);
      b.close = trade.price;
      b.volume += trade.quantity;
    });
    return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
  }
}

module.exports = WhaleDetector;