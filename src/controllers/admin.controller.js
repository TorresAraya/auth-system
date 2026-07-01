const prisma = require('../lib/prisma')

const isNotFound = (error) => error?.code === 'P2025'

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const updateRole = async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'ROLE_UPDATED',
        ip: req.ip,
        meta: { targetUserId: id, newRole: role }
      }
    })

    res.json(user)
  } catch (error) {
    if (isNotFound(error)) return res.status(404).json({ error: 'Usuario no encontrado' })
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
    }

    await prisma.user.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'USER_DELETED',
        ip: req.ip,
        meta: { deletedUserId: id }
      }
    })

    res.json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    if (isNotFound(error)) return res.status(404).json({ error: 'Usuario no encontrado' })
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

const getAuditLog = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true } }
      }
    })
    res.json(logs)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

module.exports = { getUsers, updateRole, deleteUser, getAuditLog }