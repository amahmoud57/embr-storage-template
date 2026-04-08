const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/', require('./routes/health'));
app.use('/api/files', require('./routes/files'));

// Serve static build output
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('FileVault running on port ' + PORT);
});
