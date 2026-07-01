const express = require('express');
const systemAdminController = require('../controllers/systemAdminController');
const router = express.Router();

// Todas las rutas exigen rol system_admin (validado dentro del controller).

// GET /api/system/companies - Listar todas las empresas con estado y conteo de usuarios
router.get('/companies', systemAdminController.listCompanies);

// POST /api/system/companies - Crear nueva empresa
router.post('/companies', systemAdminController.createCompany);

// PUT /api/system/companies/:id - Editar empresa
router.put('/companies/:id', systemAdminController.updateCompany);

// DELETE /api/system/companies/:id - Eliminar empresa (solo sin datos asociados)
router.delete('/companies/:id', systemAdminController.deleteCompany);

// PATCH /api/system/companies/:id/status - Activar/desactivar empresa
router.patch('/companies/:id/status', systemAdminController.setCompanyStatus);

// GET /api/system/companies/:id/admins - Listar admins de una empresa
router.get('/companies/:id/admins', systemAdminController.listCompanyAdmins);

// POST /api/system/companies/:id/admin - Crear admin (email + password) para una empresa
router.post('/companies/:id/admin', systemAdminController.createCompanyAdmin);

// PATCH /api/system/admins/:userId/password - Cambiar contraseña de un admin
router.patch('/admins/:userId/password', systemAdminController.updateAdminPassword);

module.exports = router;
