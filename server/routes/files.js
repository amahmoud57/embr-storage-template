const router = require('express').Router();

const BLOB_KEY = process.env.EMBR_BLOB_KEY || '';

function getBlobBase(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  return proto + '://' + host + '/_embr/blob';
}

// List files from blob storage
router.get('/', async (req, res, next) => {
  try {
    const blobBase = getBlobBase(req);
    const prefix = req.query.prefix || '';
    const pageSize = req.query.pageSize || 100;
    const continuationToken = req.query.continuationToken || '';
    let url = blobBase + '/?pageSize=' + pageSize;
    if (prefix) url += '&prefix=' + encodeURIComponent(prefix);
    if (continuationToken) url += '&continuationToken=' + encodeURIComponent(continuationToken);

    const response = await fetch(url, {
      headers: BLOB_KEY ? { 'Authorization': 'Bearer ' + BLOB_KEY } : {},
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'List failed: ' + errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) { next(err); }
});

// Upload a file
router.post('/', async (req, res, next) => {
  try {
    const { fileName, contentType, fileBase64 } = req.body;
    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'fileName and fileBase64 are required' });
    }

    const folder = req.body.folder ? req.body.folder.replace(/^\/|\/$/g, '') + '/' : '';
    const blobKey = folder + Date.now() + '-' + fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const blobBase = getBlobBase(req);
    const response = await fetch(blobBase + '/' + blobKey, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        ...(BLOB_KEY ? { 'Authorization': 'Bearer ' + BLOB_KEY } : {}),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: 'Upload failed: ' + errText });
    }

    res.status(201).json({
      key: blobKey,
      url: '/_embr/blob/' + blobKey,
      sizeBytes: fileBuffer.length,
      contentType: contentType || 'application/octet-stream',
    });
  } catch (err) { next(err); }
});

// Delete a file
router.delete('/:key(*)', async (req, res, next) => {
  try {
    const blobBase = getBlobBase(req);
    const response = await fetch(blobBase + '/' + req.params.key, {
      method: 'DELETE',
      headers: BLOB_KEY ? { 'Authorization': 'Bearer ' + BLOB_KEY } : {},
    });

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      return res.status(502).json({ error: 'Delete failed: ' + errText });
    }

    res.json({ deleted: true, key: req.params.key });
  } catch (err) { next(err); }
});

module.exports = router;
