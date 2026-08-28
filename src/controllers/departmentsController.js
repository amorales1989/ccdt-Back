const { supabase, supabaseAdmin } = require('../config/supabase');

// Quienes ven la pantalla de Departamentos (menu_departamentos en rolePermissions del front).
const MANAGE_ROLES = ['admin', 'secretaria'];

const departmentsController = {
  // GET /api/departments
  getAll: async (req, res, next) => {
    try {
      const { include_classes = false } = req.query;

      let selectFields = '*';
      if (include_classes === 'true') {
        selectFields = '*, classes';
      }

      const { data, error } = await supabase
        .from('departments')
        .select(selectFields)
        .eq('company_id', req.companyId)
        .order('name');

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/departments/:id
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .eq('company_id', req.companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Departamento no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      res.json({
        success: true,
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/departments/:id/classes
  getClasses: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Primero verificar que el departamento existe
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('id, name, classes')
        .eq('id', id)
        .eq('company_id', req.companyId)
        .single();

      if (deptError) {
        if (deptError.code === 'PGRST116') {
          const notFoundError = new Error('Departamento no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw deptError;
      }

      res.json({
        success: true,
        data: {
          department_id: department.id,
          department_name: department.name,
          classes: department.classes || []
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/departments/:id/students
  getStudents: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { assigned_class, gender } = req.query;

      let query = supabase
        .from('students')
        .select(`
          *,
          departments (name)
        `)
        .eq('department_id', id)
        .eq('company_id', req.companyId);

      // Filtrar por clase si se proporciona
      if (assigned_class) {
        query = query.ilike('assigned_class', assigned_class);
      }

      // Filtrar por género si se proporciona
      if (gender) {
        query = query.eq('gender', gender);
      }

      const { data, error } = await query.order('first_name');

      if (error) {
        throw error;
      }

      const studentsWithDepartment = data.map(student => ({
        ...student,
        department: student.departments?.name
      }));

      res.json({
        success: true,
        data: studentsWithDepartment,
        count: studentsWithDepartment.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/departments/:id/stats
  getStats: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { group_by = 'general' } = req.query;

      const { data: students, error } = await supabase
        .from('students')
        .select('id, gender, assigned_class')
        .eq('department_id', id)
        .eq('company_id', req.companyId);

      if (error) {
        throw error;
      }

      let stats = {};

      if (group_by === 'class') {
        // Agrupar por clase
        const classStats = {};
        students.forEach(student => {
          const className = student.assigned_class || 'Sin clase';
          if (!classStats[className]) {
            classStats[className] = { male: 0, female: 0, total: 0 };
          }

          if (student.gender === 'masculino') {
            classStats[className].male++;
          } else if (student.gender === 'femenino') {
            classStats[className].female++;
          }
          classStats[className].total++;
        });
        stats = classStats;
      } else {
        // Estadísticas generales del departamento
        stats = {
          male: students.filter(s => s.gender === 'masculino').length,
          female: students.filter(s => s.gender === 'femenino').length,
          total: students.length
        };
      }

      res.json({
        success: true,
        data: stats,
        department_id: id,
        group_by
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/departments
  create: async (req, res, next) => {
    try {
      const { name, classes } = req.body;

      // Validaciones básicas
      if (!name) {
        const validationError = new Error('El campo name es requerido');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const departmentData = {
        name: name.trim(),
        classes: classes || [],
        company_id: req.companyId
      };

      const { data, error } = await supabase
        .from('departments')
        .insert([departmentData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        success: true,
        message: 'Departamento creado exitosamente',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/departments/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Limpiar nombre si se proporciona
      if (updates.name) {
        updates.name = updates.name.trim();
      }

      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .eq('company_id', req.companyId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Departamento no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Departamento actualizado exitosamente',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/departments/:id/delete-impact
  // Previsualiza a quiénes afecta el borrado, para avisarlo en el diálogo de confirmación.
  deleteImpact: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!MANAGE_ROLES.includes(req.profile?.role)) {
        const e = new Error('No tienes permiso para eliminar departamentos');
        e.status = 403;
        throw e;
      }

      const { data, error } = await supabaseAdmin.schema('api').rpc('departamento_eliminar', {
        p_company_id: req.companyId,
        p_department_id: id,
        p_dry_run: true,
      });
      if (error) throw error;

      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  // DELETE /api/departments/:id
  // El SP reasigna a los miembros antes de borrar: los que tienen otra asignación se mudan a
  // ella y el resto queda sin departamento (sigue siendo miembro de la congregación).
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!MANAGE_ROLES.includes(req.profile?.role)) {
        const e = new Error('No tienes permiso para eliminar departamentos');
        e.status = 403;
        throw e;
      }

      const { data, error } = await supabaseAdmin.schema('api').rpc('departamento_eliminar', {
        p_company_id: req.companyId,
        p_department_id: id,
        p_dry_run: false,
      });
      if (error) throw error;

      res.json({
        success: true,
        message: 'Departamento eliminado exitosamente',
        data
      });
    } catch (error) { next(error); }
  },

  // PUT /api/departments/:id/classes
  updateClasses: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { classes } = req.body;

      if (!Array.isArray(classes)) {
        const validationError = new Error('El campo classes debe ser un array');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const { data, error } = await supabase
        .from('departments')
        .update({ classes })
        .eq('id', id)
        .eq('company_id', req.companyId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Departamento no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Clases del departamento actualizadas exitosamente',
        data: data
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = departmentsController;