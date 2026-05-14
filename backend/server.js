require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const express = require('express');
const app = require('./app');
const { initDatabase } = require('./database');

const PORT = process.env.PORT || 3000;

// Servir frontend
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  ANT1GRAVITY Portal: http://localhost:${PORT}`);
    console.log(`  Admin: admin / admin123\n`);
  });
}).catch(console.error);
