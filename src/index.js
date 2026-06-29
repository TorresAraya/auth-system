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
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

module.exports = app