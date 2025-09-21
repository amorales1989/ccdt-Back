const { supabase } = require('../config/supabase');

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
        .eq('department_id', id);

      // Filtrar por clase si se proporciona
      if (assigned_class) {
        query = query.eq('assigned_class', assigned_class);
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
        .eq('department_id', id);

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
        classes: classes || []
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

  // DELETE /api/departments/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verificar si hay estudiantes asociados
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('department_id', id)
        .limit(1);

      if (studentsError) {
        throw studentsError;
      }

      if (students && students.length > 0) {
        const validationError = new Error('No se puede eliminar el departamento porque tiene estudiantes asociados');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Departamento eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
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