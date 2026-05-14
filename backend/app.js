const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/news',      require('./routes/news'));
app.use('/api/members',   require('./routes/members'));
app.use('/api/builds',    require('./routes/builds'));
app.use('/api/reequip',   require('./routes/reequip'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/blacklist', require('./routes/blacklist'));
app.use('/api/credits',   require('./routes/credits'));
app.use('/api/rankings',  require('./routes/rankings_txt'));
app.use('/api/giveaway',  require('./routes/giveaway'));
app.use('/api/media',     require('./routes/media'));
app.use('/api/items',     require('./routes/items'));

module.exports = app;
