const express = require('express')
const router = express.Router()
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

router.get('/me', verifyToken, async (req, res) => {
  const prisma = require('../lib/prisma')
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  })
  res.json(user)
})

router.get('/admin', verifyToken, requireRole('ADMIN'), (req, res) => {
  res.json({ message: 'Bienvenido al panel de administración' })
})

module.exports = router