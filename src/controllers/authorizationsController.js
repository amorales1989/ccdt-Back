const { supabase } = require('../config/supabase');

const authorizationsController = {
  // GET /api/authorizations
  getAll: async (req, res, next) => {
    try {
      const { department_id, class: className, student_id } = req.query;

      let query = supabase
        .from('student_authorizations')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            departments (name)
          ),
          departments (name)
        `);

      // Filtros opcionales
      if (department_id) {
        query = query.eq('department_id', department_id);
      }
      if (className) {
        query = query.eq('class', className);
      }
      if (student_id) {
        query = query.eq('student_id', student_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Mapear datos para incluir información completa
      const authorizationsWithDetails = data.map(auth => ({
        ...auth,
        student_name: auth.students ? `${auth.students.first_name} ${auth.students.last_name}` : 'Estudiante no encontrado',
        student_department: auth.students?.departments?.name || 'Sin departamento',
        authorized_department: auth.departments?.name || 'Departamento no encontrado'
      }));

      res.json({
        success: true,
        data: authorizationsWithDetails,
        count: authorizationsWithDetails.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/authorizations/:id
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('student_authorizations')
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            departments (name)
          ),
          departments (name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Autorización no encontrada');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      const authorizationWithDetails = {
        ...data,
        student_name: data.students ? `${data.students.first_name} ${data.students.last_name}` : 'Estudiante no encontrado',
        student_department: data.students?.departments?.name || 'Sin departamento',
        authorized_department: data.departments?.name || 'Departamento no encontrado'
      };

      res.json({
        success: true,
        data: authorizationWithDetails
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/authorizations/students/:student_id
  getByStudent: async (req, res, next) => {
    try {
      const { student_id } = req.params;

      const { data, error } = await supabase
        .from('student_authorizations')
        .select(`
          *,
          departments (name)
        `)
        .eq('student_id', student_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const authorizationsWithDepartment = data.map(auth => ({
        ...auth,
        authorized_department: auth.departments?.name || 'Departamento no encontrado'
      }));

      res.json({
        success: true,
        data: authorizationsWithDepartment,
        count: authorizationsWithDepartment.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/authorizations/departments/:department_id/students
  getAuthorizedStudents: async (req, res, next) => {
    try {
      const { department_id } = req.params;
      const { class: className } = req.query;

      let query = supabase
        .from('student_authorizations')
        .select(`
          student_id,
          class,
          students!inner (
            *,
            departments (name)
          )
        `)
        .eq('department_id', department_id);

      // Filtrar por clase si se proporciona
      if (className) {
        query = query.eq('class', className);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Extraer y mapear información de estudiantes
      const authorizedStudents = data.map(auth => ({
        ...auth.students,
        isAuthorized: true,
        authorized_class: auth.class,
        department: auth.students.departments?.name
      }));

      res.json({
        success: true,
        data: authorizedStudents,
        count: authorizedStudents.length
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/authorizations
  create: async (req, res, next) => {
    try {
      const { student_id, department_id, class: className } = req.body;

      // Validaciones básicas
      if (!student_id || !department_id || !className) {
        const validationError = new Error('Los campos student_id, department_id y class son requeridos');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Verificar que el estudiante existe
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('id', student_id)
        .single();

      if (studentError || !student) {
        const validationError = new Error('Estudiante no encontrado');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Verificar que el departamento existe
      const { data: department, error: deptError } = await supabase
        .from('departments')
        .select('id, name, classes')
        .eq('id', department_id)
        .single();

      if (deptError || !department) {
        const validationError = new Error('Departamento no encontrado');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Verificar que la clase existe en el departamento
      if (department.classes && !department.classes.includes(className)) {
        const validationError = new Error('La clase especificada no existe en este departamento');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Verificar que no existe ya una autorización igual
      const { data: existingAuth, error: existingError } = await supabase
        .from('student_authorizations')
        .select('id')
        .eq('student_id', student_id)
        .eq('department_id', department_id)
        .eq('class', className)
        .single();

      if (existingAuth) {
        const validationError = new Error('Ya existe una autorización para este estudiante en esta clase y departamento');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const authorizationData = {
        student_id,
        department_id,
        class: className
      };

      const { data, error } = await supabase
        .from('student_authorizations')
        .insert([authorizationData])
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            departments (name)
          ),
          departments (name)
        `)
        .single();

      if (error) {
        throw error;
      }

      const authorizationWithDetails = {
        ...data,
        student_name: `${data.students.first_name} ${data.students.last_name}`,
        student_department: data.students.departments?.name || 'Sin departamento',
        authorized_department: data.departments?.name || 'Departamento no encontrado'
      };

      res.status(201).json({
        success: true,
        message: 'Autorización creada exitosamente',
        data: authorizationWithDetails
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/authorizations/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { class: className } = req.body;

      if (!className) {
        const validationError = new Error('El campo class es requerido');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const { data, error } = await supabase
        .from('student_authorizations')
        .update({ class: className })
        .eq('id', id)
        .select(`
          *,
          students (
            id,
            first_name,
            last_name,
            departments (name)
          ),
          departments (name)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Autorización no encontrada');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      const authorizationWithDetails = {
        ...data,
        student_name: `${data.students.first_name} ${data.students.last_name}`,
        student_department: data.students.departments?.name || 'Sin departamento',
        authorized_department: data.departments?.name || 'Departamento no encontrado'
      };

      res.json({
        success: true,
        message: 'Autorización actualizada exitosamente',
        data: authorizationWithDetails
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/authorizations/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('student_authorizations')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Autorización eliminada exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/authorizations/students/:student_id/departments/:department_id
  deleteByStudentAndDepartment: async (req, res, next) => {
    try {
      const { student_id, department_id } = req.params;
      const { class: className } = req.query;

      let query = supabase
        .from('student_authorizations')
        .delete()
        .eq('student_id', student_id)
        .eq('department_id', department_id);

      // Filtrar por clase si se proporciona
      if (className) {
        query = query.eq('class', className);
      }

      const { error } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Autorización(es) eliminada(s) exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authorizationsController;