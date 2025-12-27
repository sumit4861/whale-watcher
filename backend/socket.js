/**
 * SOCKET.IO CONFIGURATION
 * Manages WebSocket connections and broadcasts.
 */
function setupSocketIO(io, whaleDetector) {
  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Initial sync for new connections
    socket.emit('metrics_update', whaleDetector.getMetrics());
    socket.emit('chart_data', whaleDetector.getChartData());

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return {
    broadcastTradeUpdate: (tradeData) => {
      io.emit('trade_update', tradeData); // Real-time trade pipeline
    },
    broadcastWhaleAlert: (whaleData) => {
      io.emit('whale_alert', { // Automated Alert System broadcast
        ...whaleData,
        message: `🐋 WHALE DETECTED: $${whaleData.tradeValue.toLocaleString()} BTC trade!`
      });
    }
  };
}

module.exports = setupSocketIO;