const express = require('express')
const router = express.Router()
const { getUsers, updateRole, deleteUser, getAuditLog } = require('../controllers/admin.controller')
const { verifyToken, requireRole } = require('../middleware/auth.middleware')

router.use(verifyToken)
router.use(requireRole('ADMIN'))

router.get('/users', getUsers)
router.patch('/users/:id/role', updateRole)
router.delete('/users/:id', deleteUser)
router.get('/audit-log', getAuditLog)

module.exports = router