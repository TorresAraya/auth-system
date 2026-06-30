const express = require('express')
const router = express.Router()
const { register, login, logout, refresh } = require('../controllers/auth.controller')
const { verifyToken } = require('../middleware/auth.middleware')

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.post('/refresh', refresh)

router.get('/verify', verifyToken, (req, res) => {
  res.json({ userId: req.user.userId, role: req.user.role })
})

module.exports = router