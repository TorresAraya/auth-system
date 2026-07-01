const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const redis = require('../lib/redis')

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  )
  return { accessToken, refreshToken }
}

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return res.status(409).json({ error: 'El email ya está registrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name }
    })

    const { accessToken, refreshToken } = generateTokens(user.id, user.role)

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'REGISTER', ip: req.ip }
    })

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role)

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        ip: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', ip: req.ip }
    })

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ error: 'Token requerido' })
    }

    await prisma.session.deleteMany({ where: { token: refreshToken } })

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000)
        if (ttl > 0) await redis.setex(`blacklist:${refreshToken}`, ttl, '1')
      }
    } catch (_) {}

    const tokenUserId = (() => { try { return jwt.decode(refreshToken)?.userId } catch (_) { return null } })()
    await prisma.auditLog.create({
      data: { userId: tokenUserId || null, action: 'LOGOUT', ip: req.ip }
    })

    res.json({ message: 'Sesión cerrada correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' })
    }

    const blacklisted = await redis.get(`blacklist:${refreshToken}`)
    if (blacklisted) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)

    const session = await prisma.session.findUnique({
      where: { token: refreshToken }
    })
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Sesión expirada' })
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role)

    await prisma.session.update({
      where: { token: refreshToken },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) await redis.setex(`blacklist:${refreshToken}`, ttl, '1')

    res.json({ accessToken, refreshToken: newRefreshToken })
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
module.exports = { register, login, logout, refresh }