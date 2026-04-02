'use strict';

const { WebSocketServer } = require('ws');

const PORT = 8080;

const stocks = {
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', currentPrice: 175.50, dailyHigh: 177.20, dailyLow: 173.80, weekHigh52: 199.62, weekLow52: 143.90 },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', currentPrice: 165.30, dailyHigh: 167.80, dailyLow: 163.50, weekHigh52: 193.31, weekLow52: 130.67 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corp.', currentPrice: 420.15, dailyHigh: 424.50, dailyLow: 417.30, weekHigh52: 468.35, weekLow52: 344.79 },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', currentPrice: 248.75, dailyHigh: 255.00, dailyLow: 244.10, weekHigh52: 358.64, weekLow52: 138.80 },
};

const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server running on ws://localhost:${PORT}`);

function generateUpdate() {
  const symbols = Object.keys(stocks);
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const stock = stocks[symbol];
  const change = (Math.random() - 0.5) * 3;
  const newPrice = parseFloat(Math.max(0.01, stock.currentPrice + change).toFixed(2));

  stock.currentPrice = newPrice;
  stock.dailyHigh = parseFloat(Math.max(stock.dailyHigh, newPrice).toFixed(2));
  stock.dailyLow = parseFloat(Math.min(stock.dailyLow, newPrice).toFixed(2));

  return {
    symbol,
    currentPrice: stock.currentPrice,
    dailyHigh: stock.dailyHigh,
    dailyLow: stock.dailyLow,
    weekHigh52: stock.weekHigh52,
    weekLow52: stock.weekLow52,
  };
}

setInterval(() => {
  if (wss.clients.size === 0) return;
  const update = JSON.stringify(generateUpdate());
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(update);
  });
}, 1500);

wss.on('connection', ws => {
  console.log('Client connected');
  // Send initial state for all stocks on connection
  Object.values(stocks).forEach(stock => {
    ws.send(JSON.stringify({
      symbol: stock.symbol,
      currentPrice: stock.currentPrice,
      dailyHigh: stock.dailyHigh,
      dailyLow: stock.dailyLow,
      weekHigh52: stock.weekHigh52,
      weekLow52: stock.weekLow52,
    }));
  });
  ws.on('close', () => console.log('Client disconnected'));
});
