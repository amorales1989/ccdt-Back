const { supabase } = require('../config/supabase');
const BirthdayService = require('../services/birthdayService');

const studentsController = {
  // POST /api/students/check-birthdays
  checkAndNotifyBirthdays: async (req, res, next) => {
    try {
      const result = await BirthdayService.checkDailyBirthdays();
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

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
  departments(name)
    `)
        .is('deleted_at', null); // Excluir estudiantes eliminados

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
        query = query.or(`first_name.ilike.% ${search}%, last_name.ilike.% ${search}% `);
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
  students!inner(
              *,
    departments(name)
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
        department: student.departments?.name,
        is_deleted: false
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
    departments(name)
      `)
        .eq('id', id)
        .is('deleted_at', null)
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
        department: data.departments?.name,
        is_deleted: false
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
  departments(name)
    `)
        .not('birthdate', 'is', null)
        .is('deleted_at', null);

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
          nuevo,
          departments (name)
        `)
        .is('deleted_at', null);

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
            departmentStats[deptName] = { male: 0, female: 0, total: 0, new: 0 };
          }

          if (student.gender === 'masculino') {
            departmentStats[deptName].male++;
          } else if (student.gender === 'femenino') {
            departmentStats[deptName].female++;
          }
          if (student.nuevo) {
            departmentStats[deptName].new++;
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
            classStats[className] = { male: 0, female: 0, total: 0, new: 0 };
          }

          if (student.gender === 'masculino') {
            classStats[className].male++;
          } else if (student.gender === 'femenino') {
            classStats[className].female++;
          }
          if (student.nuevo) {
            classStats[className].new++;
          }
          classStats[className].total++;
        });
        stats = classStats;
      } else {
        // Estadísticas generales
        stats = {
          male: data.filter(s => s.gender === 'masculino').length,
          female: data.filter(s => s.gender === 'femenino').length,
          new: data.filter(s => s.nuevo).length,
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
        department,
        assigned_class,
        phone,
        address,
        document_number,
        nuevo
      } = req.body;

      // Validaciones básicas
      if (!first_name || first_name.trim() === '') {
        const validationError = new Error('El nombre es requerido');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Validar DNI duplicado si se proporciona
      if (document_number && document_number.trim() !== '') {
        const { data: existingStudent, error: searchError } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('document_number', document_number.trim())
          .is('deleted_at', null)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingStudent) {
          const duplicateError = new Error(`El DNI ${document_number} ya está registrado en el sistema`);
          duplicateError.name = 'DuplicateError';
          duplicateError.status = 409;
          throw duplicateError;
        }
      }

      // Solo incluir campos que existen en la tabla
      const studentData = {
        first_name: first_name.trim(),
        last_name: last_name ? last_name.trim() : '',
        birthdate: birthdate || null,
        gender: gender || 'masculino',
        department_id: department_id || null,
        department: department || null,
        assigned_class: assigned_class || null,
        phone: phone || null,
        address: address ? address.trim() : null,
        document_number: document_number ? document_number.trim() : null,
        nuevo: nuevo !== undefined ? nuevo : true
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
        department: data.departments?.name || data.department,
        is_deleted: false
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

      // Verificar que el estudiante existe
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('id, document_number')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const notFoundError = new Error('Estudiante no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw fetchError;
      }

      // Validar DNI duplicado si se actualiza
      if (updates.document_number && updates.document_number !== existingStudent.document_number) {
        const { data: duplicateStudent, error: searchError } = await supabase
          .from('students')
          .select('id')
          .eq('document_number', updates.document_number)
          .neq('id', id)
          .is('deleted_at', null)
          .maybeSingle();

        if (searchError) throw searchError;

        if (duplicateStudent) {
          const duplicateError = new Error(`El DNI ${updates.document_number} ya está registrado en otro estudiante`);
          duplicateError.name = 'DuplicateError';
          duplicateError.status = 409;
          throw duplicateError;
        }
      }

      // Limpiar y preparar datos
      const cleanUpdates = {};
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          if (typeof updates[key] === 'string' && key !== 'gender') {
            cleanUpdates[key] = updates[key].trim() || null;
          } else {
            cleanUpdates[key] = updates[key];
          }
        }
      });

      const { data, error } = await supabase
        .from('students')
        .update(cleanUpdates)
        .eq('id', id)
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
        department: data.departments?.name || data.department,
        is_deleted: false
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

  // DELETE /api/students/:id - Soft delete
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Verificar que el estudiante existe y no está eliminado
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('id')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const notFoundError = new Error('Estudiante no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw fetchError;
      }

      // Soft delete: marcar como eliminado
      const { error } = await supabase
        .from('students')
        .update({ deleted_at: new Date().toISOString() })
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
      const { q, document_number, department_id, assigned_class, limit = 20 } = req.query;

      let query = supabase
        .from('students')
        .select(`
          *,
          departments (name)
        `)
        .is('deleted_at', null);

      // Búsqueda específica por DNI
      if (document_number) {
        query = query.eq('document_number', document_number);
      }
      // Búsqueda por nombre/apellido
      else if (q) {
        if (q.trim().length < 2) {
          return res.json({
            success: true,
            data: [],
            count: 0,
            message: 'Se requiere al menos 2 caracteres para la búsqueda'
          });
        }
        query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
      }

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
        department: student.departments?.name || student.department,
        fullName: `${student.first_name?.trim() || ''} ${student.last_name?.trim() || ''}`,
        is_deleted: false
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