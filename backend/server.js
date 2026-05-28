require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initDatabase } = require('./database');

const PORT = process.env.PORT || 3000;

// Servir frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(require('express').static(frontendDist));
app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io',
});

require('./socket/poker')(io);
require('./socket/truco')(io);

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`\n  ANT1GRAVITY Portal: http://localhost:${PORT}`);
    console.log(`  Admin: admin / admin123\n`);
  });
}).catch(console.error);
