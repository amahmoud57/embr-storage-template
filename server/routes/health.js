const router = require('express').Router();
router.get('/health', (req, res) => res.json({ status: 'healthy', service: 'filevault' }));
module.exports = router;
