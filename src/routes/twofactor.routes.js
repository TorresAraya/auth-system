const express = require('express')
const router = express.Router()
const { setup2FA, verify2FA, disable2FA } = require('../controllers/twoFactor.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.post('/setup', verifyToken, setup2FA)
router.post('/verify', verifyToken, verify2FA)
router.post('/disable', verifyToken, disable2FA)

module.exports = router