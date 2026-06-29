const jwt = require('jsonwebtoken')
const redis = require('../lib/redis')

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' })
    }

    const token = authHeader.split(' ')[1]

    const blacklisted = await redis.get(`blacklist:${token}`)
    if (blacklisted) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esto' })
    }
    next()
  }
}

module.exports = { verifyToken, requireRole }