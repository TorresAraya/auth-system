const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
require('dotenv').config()
require('./lib/prisma')
require('./lib/redis')

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
const authRoutes = require('./routes/auth.routes')
app.use('/api/auth', authRoutes)
const userRoutes = require('./routes/user.routes')
app.use('/api/user', userRoutes)
const twoFactorRoutes = require('./routes/twofactor.routes')
app.use('/api/2fa', twoFactorRoutes)
const adminRoutes = require('./routes/admin.routes')
app.use('/api/admin', adminRoutes)
app.get('/', (req, res) => {
  res.json({
    name: 'Auth System API',
    version: '1.0.0',
    status: 'running',
    docs: {
      health: '/health',
      auth: '/api/auth/register | /api/auth/login | /api/auth/logout | /api/auth/refresh',
      user: '/api/user/me',
      twoFactor: '/api/2fa/setup | /api/2fa/verify | /api/2fa/disable',
      admin: '/api/admin/users | /api/admin/audit-log'
    }
  })
})
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`)
})

module.exports = app