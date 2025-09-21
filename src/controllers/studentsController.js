const { supabase } = require('../config/supabase');

const studentsController = {
  // GET /api/students
  getAll: async (req, res, next) => {
    try {
      const { 
        department_id, 
        assigned_class, 
        role, 
        departments: userDepartments,
        gender,
        search 
      } = req.query;

      let query = supabase
        .from('students')
        .select(`
          *,
          departments (name)
        `);

      // Filtrar por departamento si se proporciona
      if (department_id) {
        query = query.eq('department_id', department_id);
      }

      // Filtrar por clase asignada si se proporciona
      if (assigned_class) {
        query = query.eq('assigned_class', assigned_class);
      }

      // Filtrar por género si se proporciona
      if (gender) {
        query = query.eq('gender', gender);
      }

      // Búsqueda por nombre si se proporciona
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      const { data: baseStudents, error } = await query.order('first_name');

      if (error) {
        throw error;
      }

      let students = baseStudents || [];

      // Si se proporciona department_id y assigned_class, también buscar estudiantes autorizados
      if (department_id && assigned_class) {
        const { data: authorizedData, error: authError } = await supabase
          .from('student_authorizations')
          .select(`
            student_id,
            students!inner (
              *,
              departments (name)
            )
          `)
          .eq('department_id', department_id)
          .eq('class', assigned_class);

        if (!authError && authorizedData) {
          // Agregar estudiantes autorizados que no estén ya en la lista
          const baseStudentIds = students.map(s => s.id);
          const authorizedStudents = authorizedData
            .map(auth => ({
              ...auth.students,
              isAuthorized: true
            }))
            .filter(student => !baseStudentIds.includes(student.id));

          students = [...students, ...authorizedStudents];
        }
      }

      // Mapear datos para incluir información del departamento
      const studentsWithDepartment = students.map(student => ({
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

  // GET /api/students/:id
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          departments (name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Estudiante no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      const studentWithDepartment = {
        ...data,
        department: data.departments?.name
      };

      res.json({
        success: true,
        data: studentWithDepartment
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/students/birthdays/upcoming
  getUpcomingBirthdays: async (req, res, next) => {
    try {
      const { 
        department_id, 
        assigned_class, 
        departments: userDepartments,
        limit = 10 
      } = req.query;

      let query = supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          birthdate,
          department_id,
          assigned_class,
          departments (name)
        `)
        .not('birthdate', 'is', null);

      // Filtrar por departamento si se proporciona
      if (department_id) {
        query = query.eq('department_id', department_id);
      }

      // Filtrar por clase asignada si se proporciona
      if (assigned_class) {
        query = query.eq('assigned_class', assigned_class);
      }

      const { data, error } = await query.order('first_name');

      if (error) {
        throw error;
      }

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();
      const currentYear = today.getFullYear();

      const studentsWithBirthdayInfo = data
        .map(student => {
          const [birthYear, birthMonth, birthDay] = student.birthdate.split('-').map(Number);
          
          const isBirthdayToday = birthMonth === currentMonth && birthDay === currentDay;
          
          let daysUntilBirthday;
          if (isBirthdayToday) {
            daysUntilBirthday = 0;
          } else {
            let birthdayDate = new Date(currentYear, birthMonth - 1, birthDay);
            
            if (birthdayDate < today) {
              birthdayDate = new Date(currentYear + 1, birthMonth - 1, birthDay);
            }
            
            const timeDiff = birthdayDate.getTime() - today.getTime();
            daysUntilBirthday = Math.ceil(timeDiff / (1000 * 3600 * 24));
          }
          
          return {
            ...student,
            department: student.departments?.name,
            daysUntilBirthday,
            birthdayThisYear: `${String(birthDay).padStart(2, '0')}/${String(birthMonth).padStart(2, '0')}`,
            fullName: `${student.first_name?.trim() || ''} ${student.last_name?.trim() || ''}`,
            isBirthdayToday
          };
        })
        .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday)
        .slice(0, parseInt(limit));

      res.json({
        success: true,
        data: studentsWithBirthdayInfo,
        count: studentsWithBirthdayInfo.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/students/stats
  getStats: async (req, res, next) => {
    try {
      const { 
        department_id, 
        assigned_class, 
        group_by = 'department' 
      } = req.query;

      let query = supabase
        .from('students')
        .select(`
          id,
          gender,
          department_id,
          assigned_class,
          departments (name)
        `);

      // Filtrar por departamento si se proporciona
      if (department_id) {
        query = query.eq('department_id', department_id);
      }

      // Filtrar por clase asignada si se proporciona
      if (assigned_class) {
        query = query.eq('assigned_class', assigned_class);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let stats = {};

      if (group_by === 'department') {
        // Agrupar por departamento
        const departmentStats = {};
        data.forEach(student => {
          const deptName = student.departments?.name || 'Sin departamento';
          if (!departmentStats[deptName]) {
            departmentStats[deptName] = { male: 0, female: 0, total: 0 };
          }
          
          if (student.gender === 'masculino') {
            departmentStats[deptName].male++;
          } else if (student.gender === 'femenino') {
            departmentStats[deptName].female++;
          }
          departmentStats[deptName].total++;
        });
        stats = departmentStats;
      } else if (group_by === 'class') {
        // Agrupar por clase
        const classStats = {};
        data.forEach(student => {
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
        // Estadísticas generales
        stats = {
          male: data.filter(s => s.gender === 'masculino').length,
          female: data.filter(s => s.gender === 'femenino').length,
          total: data.length
        };
      }

      res.json({
        success: true,
        data: stats,
        group_by
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/students
  create: async (req, res, next) => {
    try {
      const { 
        first_name, 
        last_name, 
        birthdate, 
        gender, 
        department_id, 
        assigned_class 
      } = req.body;

      // Validaciones básicas
      if (!first_name || !last_name || !birthdate || !gender || !department_id) {
        const validationError = new Error('Los campos first_name, last_name, birthdate, gender y department_id son requeridos');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const studentData = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        birthdate,
        gender,
        department_id,
        assigned_class: assigned_class || null
      };

      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select(`
          *,
          departments (name)
        `)
        .single();

      if (error) {
        throw error;
      }

      const studentWithDepartment = {
        ...data,
        department: data.departments?.name
      };

      res.status(201).json({
        success: true,
        message: 'Estudiante creado exitosamente',
        data: studentWithDepartment
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/students/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Limpiar nombres si se proporcionan
      if (updates.first_name) {
        updates.first_name = updates.first_name.trim();
      }
      if (updates.last_name) {
        updates.last_name = updates.last_name.trim();
      }

      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          departments (name)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Estudiante no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      const studentWithDepartment = {
        ...data,
        department: data.departments?.name
      };

      res.json({
        success: true,
        message: 'Estudiante actualizado exitosamente',
        data: studentWithDepartment
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/students/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Estudiante eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/students/search
  search: async (req, res, next) => {
    try {
      const { q, department_id, assigned_class, limit = 20 } = req.query;

      if (!q || q.trim().length < 2) {
        return res.json({
          success: true,
          data: [],
          count: 0,
          message: 'Se requiere al menos 2 caracteres para la búsqueda'
        });
      }

      let query = supabase
        .from('students')
        .select(`
          *,
          departments (name)
        `)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);

      // Filtros opcionales
      if (department_id) {
        query = query.eq('department_id', department_id);
      }
      if (assigned_class) {
        query = query.eq('assigned_class', assigned_class);
      }

      const { data, error } = await query
        .order('first_name')
        .limit(parseInt(limit));

      if (error) {
        throw error;
      }

      const studentsWithDepartment = data.map(student => ({
        ...student,
        department: student.departments?.name,
        fullName: `${student.first_name?.trim() || ''} ${student.last_name?.trim() || ''}`
      }));

      res.json({
        success: true,
        data: studentsWithDepartment,
        count: studentsWithDepartment.length
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = studentsController;