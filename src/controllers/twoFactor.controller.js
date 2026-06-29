const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const prisma = require('../lib/prisma')

const setup2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `AuthSystem (${req.user.userId})`
    })

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { twoFactorSecret: secret.base32 }
    })

    const qrCode = await QRCode.toDataURL(secret.otpauth_url)

    res.json({
      secret: secret.base32,
      qrCode
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const verify2FA = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ error: 'Código requerido' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!user?.twoFactorSecret) {
      return res.status(400).json({ error: '2FA no configurado' })
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    })

    if (!valid) {
      return res.status(401).json({ error: 'Código incorrecto' })
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { twoFactorEnabled: true }
    })

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: '2FA_ENABLED', ip: req.ip }
    })

    res.json({ message: '2FA activado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const disable2FA = async (req, res) => {
  try {
    const { code } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1
    })

    if (!valid) {
      return res.status(401).json({ error: 'Código incorrecto' })
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null }
    })

    await prisma.auditLog.create({
      data: { userId: req.user.userId, action: '2FA_DISABLED', ip: req.ip }
    })

    res.json({ message: '2FA desactivado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { setup2FA, verify2FA, disable2FA }