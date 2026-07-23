const { supabase, supabaseAdmin } = require('../config/supabase');
const BirthdayService = require('../services/birthdayService');
const { assertMemberLimitNotReached } = require('../services/memberLimitService');

const studentsController = {
  // POST /api/students/check-birthdays
  checkAndNotifyBirthdays: async (req, res, next) => {
    try {
      const result = await BirthdayService.checkDailyBirthdays(req.companyId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/students
  getAll: async (req, res, next) => {
    try {
      const { department_id, assigned_class, gender, search } = req.query;

      const { data, error } = await supabase.rpc('get_students', {
        p_company_id:     req.companyId,
        p_department_id:  department_id  || null,
        p_assigned_class: (assigned_class && assigned_class !== 'all') ? assigned_class : null,
        p_gender:         gender          || null,
        p_search:         search          || null,
      });

      if (error) throw error;

      const students = (data || []).map(s => ({
        ...s,
        department:    s.department_name,
        isAuthorized:  s.is_authorized,
        dept_assignments: s.dept_assignments || [],
        is_deleted: false,
      }));

      res.json({ success: true, data: students, count: students.length });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/students/:id
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const [{ data, error }, { data: deptAssignments }] = await Promise.all([
        supabase
          .from('students')
          .select('*, departments(name)')
          .eq('id', id)
          .is('deleted_at', null)
          .eq('company_id', req.companyId)
          .single(),
        supabase
          .from('student_departments')
          .select('*, departments(id, name, classes)')
          .eq('student_id', id)
          .eq('company_id', req.companyId)
      ]);

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Estudiante no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      res.json({
        success: true,
        data: {
          ...data,
          department: data.departments?.name,
          is_deleted: false,
          dept_assignments: deptAssignments || []
        }
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
        .is('deleted_at', null)
        .eq('company_id', req.companyId);

      // Filtrar por departamento si se proporciona
      if (department_id) {
        query = query.eq('department_id', department_id);
      }

      // Filtrar por clase asignada si se proporciona
      if (assigned_class !== undefined && assigned_class !== null && assigned_class !== 'all') {
        query = query.ilike('assigned_class', assigned_class);
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
        .is('deleted_at', null)
        .eq('company_id', req.companyId);

      // Filtrar por departamento si se proporciona
      if (department_id) {
        query = query.eq('department_id', department_id);
      }

      // Filtrar por clase asignada si se proporciona
      if (assigned_class !== undefined && assigned_class !== null && assigned_class !== 'all') {
        query = query.ilike('assigned_class', assigned_class);
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
        nuevo,
        baptized,
        profile_id,
        person_source,
        existing_student_id
      } = req.body;

      // Validaciones básicas
      if (!first_name || first_name.trim() === '') {
        const validationError = new Error('El nombre es requerido');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Validar DNI duplicado SOLO si NO se proporciona profile_id ni person_source (es un registro genuinamente nuevo)
      if (document_number && document_number.trim() !== '' && !profile_id && !person_source) {
        const { data: existingStudent, error: searchError } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('document_number', document_number.trim())
          .is('deleted_at', null)
          .eq('company_id', req.companyId)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingStudent) {
          const duplicateError = new Error(`El DNI ${document_number} ya está registrado en el sistema`);
          duplicateError.name = 'DuplicateError';
          duplicateError.status = 409;
          throw duplicateError;
        }
      }

      const { dept_assignments } = req.body;

      // Determinar departamento primario
      const primaryDept = dept_assignments?.[0];
      const primaryDeptId = primaryDept?.department_id || department_id || null;
      const primaryClass = primaryDept?.assigned_class ?? assigned_class ?? null;

      // Si la persona ya existe como student, reutilizar registro y solo agregar nueva asignación
      if (existing_student_id) {
        const { data: existing, error: fetchErr } = await supabase
          .from('students')
          .select('*, departments(name)')
          .eq('id', existing_student_id)
          .eq('company_id', req.companyId)
          .is('deleted_at', null)
          .maybeSingle();

        if (fetchErr) throw fetchErr;
        if (!existing) {
          const err = new Error('El miembro existente no fue encontrado');
          err.status = 404;
          throw err;
        }

        // Si se editaron datos de la persona en el formulario al vincularla (nombre, teléfono,
        // dirección, género, fecha de nacimiento), esos cambios se aplican a su ficha existente
        // en vez de perderse. El documento no se toca acá: en el front queda deshabilitado al
        // vincular, y cambiarlo requiere pasar por la validación de duplicados de un alta nueva.
        const personUpdates = {};
        if (first_name && first_name.trim() !== existing.first_name) personUpdates.first_name = first_name.trim();
        if (last_name !== undefined && last_name.trim() !== (existing.last_name || '')) personUpdates.last_name = last_name.trim();
        if (phone !== undefined && (phone || null) !== existing.phone) personUpdates.phone = phone || null;
        if (address !== undefined && (address ? address.trim() : null) !== existing.address) personUpdates.address = address ? address.trim() : null;
        if (gender && gender !== existing.gender) personUpdates.gender = gender;
        if (birthdate !== undefined && (birthdate || null) !== existing.birthdate) personUpdates.birthdate = birthdate || null;
        if (baptized !== undefined && (baptized === true) !== existing.baptized) personUpdates.baptized = baptized === true;

        let currentPerson = existing;
        if (Object.keys(personUpdates).length > 0) {
          const { data: updated, error: updErr } = await supabase
            .from('students')
            .update(personUpdates)
            .eq('id', existing.id)
            .select('*, departments(name)')
            .single();
          if (updErr) throw updErr;
          currentPerson = updated;

          // Mismo motivo que en update(): get_students prioriza p.baptized sobre el del student.
          if (currentPerson.profile_id && personUpdates.baptized !== undefined) {
            await supabase
              .from('profiles')
              .update({ baptized: personUpdates.baptized })
              .eq('id', currentPerson.profile_id)
              .eq('company_id', req.companyId);
          }
        }

        const assignmentsToAdd = dept_assignments?.length
          ? dept_assignments
          : primaryDeptId
            ? [{ department_id: primaryDeptId, assigned_class: primaryClass, role_in_dept: 'alumno' }]
            : [];

        if (assignmentsToAdd.length > 0) {
          const junctionRows = assignmentsToAdd.map(a => ({
            student_id: existing.id,
            department_id: a.department_id,
            assigned_class: a.assigned_class || null,
            role_in_dept: a.role_in_dept || 'alumno',
            company_id: req.companyId
          }));
          await supabase
            .from('student_departments')
            .upsert(junctionRows, { onConflict: 'student_id,department_id,role_in_dept' });
        }

        return res.status(200).json({
          success: true,
          message: 'Miembro existente vinculado al nuevo departamento',
          data: { ...currentPerson, department: currentPerson.departments?.name || currentPerson.department, is_deleted: false }
        });
      }

      const studentData = {
        first_name: first_name.trim(),
        last_name: last_name ? last_name.trim() : '',
        birthdate: birthdate || null,
        gender: gender || 'masculino',
        department_id: primaryDeptId,
        department: department || null,
        assigned_class: primaryClass,
        phone: phone || null,
        address: address ? address.trim() : null,
        document_number: document_number ? document_number.trim() : null,
        profile_id: profile_id || null,
        nuevo: nuevo !== undefined ? nuevo : true,
        baptized: baptized === true,
        company_id: req.companyId
      };

      // Enforcement de límite de miembros del plan (miembros nuevos solamente).
      await assertMemberLimitNotReached(req.companyId);

      const { data, error } = await supabase
        .from('students')
        .insert([studentData])
        .select('*, departments(name)')
        .single();

      if (error) throw error;

      // Insertar en junction table
      const assignments = dept_assignments?.length
        ? dept_assignments
        : primaryDeptId
          ? [{ department_id: primaryDeptId, assigned_class: primaryClass, role_in_dept: 'alumno' }]
          : [];

      if (assignments.length > 0) {
        const junctionRows = assignments.map(a => ({
          student_id: data.id,
          department_id: a.department_id,
          assigned_class: a.assigned_class || null,
          role_in_dept: a.role_in_dept || 'alumno',
          company_id: req.companyId
        }));
        await supabase.from('student_departments').upsert(junctionRows, { onConflict: 'student_id,department_id,role_in_dept' });
      }

      res.status(201).json({
        success: true,
        message: 'Estudiante creado exitosamente',
        data: { ...data, department: data.departments?.name || data.department, is_deleted: false }
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
        .eq('company_id', req.companyId)
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
          .eq('company_id', req.companyId)
          .maybeSingle();

        if (searchError) throw searchError;

        if (duplicateStudent) {
          const duplicateError = new Error(`El DNI ${updates.document_number} ya está registrado en otro estudiante`);
          duplicateError.name = 'DuplicateError';
          duplicateError.status = 409;
          throw duplicateError;
        }
      }

      // Limpiar y preparar datos (excluir dept_assignments — va a la junction)
      const { dept_assignments, ...updatesWithoutDepts } = updates;
      const cleanUpdates = {};
      Object.keys(updatesWithoutDepts).forEach(key => {
        if (updatesWithoutDepts[key] !== undefined) {
          if (typeof updatesWithoutDepts[key] === 'string' && key !== 'gender') {
            cleanUpdates[key] = updatesWithoutDepts[key].trim() || null;
          } else {
            cleanUpdates[key] = updatesWithoutDepts[key];
          }
        }
      });

      // Si vienen dept_assignments, actualizar departamento primario en students también
      if (dept_assignments?.length > 0) {
        const primary = dept_assignments[0];
        cleanUpdates.department_id = primary.department_id || null;
        cleanUpdates.assigned_class = primary.assigned_class || null;
      }

      const { data, error } = await supabase
        .from('students')
        .update(cleanUpdates)
        .eq('id', id)
        .eq('company_id', req.companyId)
        .select(`
          *,
          departments (name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Si el miembro está vinculado a un usuario, sincronizar baptized al perfil:
      // get_students prioriza p.baptized, así que sin esto la edición no se vería.
      if (data.profile_id && cleanUpdates.baptized !== undefined) {
        await supabaseAdmin
          .from('profiles')
          .update({ baptized: cleanUpdates.baptized === true })
          .eq('id', data.profile_id)
          .eq('company_id', req.companyId);
      }

      // Sincronizar datos personales con otros registros del mismo perfil
      if (data.profile_id) {
        const personalFields = ['first_name', 'last_name', 'birthdate', 'gender', 'phone', 'address', 'document_number'];
        const syncUpdates = {};
        personalFields.forEach(field => {
          if (cleanUpdates[field] !== undefined) {
            syncUpdates[field] = cleanUpdates[field];
          }
        });

        if (Object.keys(syncUpdates).length > 0) {
          console.log(`Sincronizando datos para perfil ${data.profile_id}:`, syncUpdates);
          await supabase
            .from('students')
            .update(syncUpdates)
            .eq('profile_id', data.profile_id)
            .eq('company_id', req.companyId)
            .neq('id', id); // No actualizar el que acabamos de cambiar

          // El SP get_students lee los datos personales desde profiles (COALESCE(p.x, s.x)),
          // así que hay que actualizar el profile o los cambios no se reflejan en la lista.
          await supabase
            .from('profiles')
            .update(syncUpdates)
            .eq('id', data.profile_id);
        }
      }

      // Sincronizar junction table si se enviaron dept_assignments
      if (dept_assignments !== undefined) {
        // Eliminar asignaciones anteriores y reemplazar
        await supabase.from('student_departments').delete().eq('student_id', id).eq('company_id', req.companyId);
        if (dept_assignments?.length > 0) {
          const junctionRows = dept_assignments.map(a => ({
            student_id: id,
            department_id: a.department_id,
            assigned_class: a.assigned_class || null,
            role_in_dept: a.role_in_dept || 'alumno',
            company_id: req.companyId
          }));
          await supabase.from('student_departments').upsert(junctionRows, { onConflict: 'student_id,department_id,role_in_dept' });
        }
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

  // DELETE /api/students/:id - Soft delete completo o solo desvincular de un departamento
  // Query opcional: ?department_id=XXX -> si el miembro pertenece a >1 depto, solo desvincula ese
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { department_id: fromDeptId } = req.query;

      // Verificar que el estudiante existe y no está eliminado
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('id, department_id, assigned_class')
        .eq('id', id)
        .is('deleted_at', null)
        .eq('company_id', req.companyId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          const notFoundError = new Error('Estudiante no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw fetchError;
      }

      // Obtener departamentos extra del miembro
      const { data: extras, error: extrasError } = await supabase
        .from('student_departments')
        .select('department_id, assigned_class')
        .eq('student_id', id)
        .eq('company_id', req.companyId);
      if (extrasError) throw extrasError;

      // Conjunto único de todos los department_id del miembro (primario + extras)
      const allDeptIds = new Set();
      if (existingStudent.department_id) allDeptIds.add(existingStudent.department_id);
      (extras || []).forEach((e) => { if (e.department_id) allDeptIds.add(e.department_id); });

      const totalDepts = allDeptIds.size;

      // Si se pasó department_id y el miembro está en más de 1, solo desvincular ese
      if (fromDeptId && totalDepts > 1 && allDeptIds.has(fromDeptId)) {
        if (fromDeptId === existingStudent.department_id) {
          // Promover un extra a primario
          const promote = (extras || []).find((e) => e.department_id && e.department_id !== fromDeptId);
          if (promote) {
            const { error: updErr } = await supabase
              .from('students')
              .update({ department_id: promote.department_id, assigned_class: promote.assigned_class || null })
              .eq('id', id)
              .eq('company_id', req.companyId);
            if (updErr) throw updErr;

            const { error: delErr } = await supabase
              .from('student_departments')
              .delete()
              .eq('student_id', id)
              .eq('department_id', promote.department_id)
              .eq('company_id', req.companyId);
            if (delErr) throw delErr;
          }
        } else {
          // Solo borrar la fila de student_departments del depto indicado
          const { error: delErr } = await supabase
            .from('student_departments')
            .delete()
            .eq('student_id', id)
            .eq('department_id', fromDeptId)
            .eq('company_id', req.companyId);
          if (delErr) throw delErr;
        }

        return res.json({
          success: true,
          message: 'Miembro desvinculado del departamento',
          unlinked: true
        });
      }

      // Caso default: soft delete completo (1 solo depto o no se pasó department_id)
      const { error } = await supabase
        .from('students')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', req.companyId);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Estudiante eliminado exitosamente',
        unlinked: false
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/students/:id/departments
  addDepartment: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { department_id, assigned_class, role_in_dept = 'alumno' } = req.body;
      if (!department_id) return res.status(400).json({ success: false, message: 'department_id requerido' });

      const { data, error } = await supabase
        .from('student_departments')
        .upsert({ student_id: id, department_id, assigned_class: assigned_class || null, role_in_dept, company_id: req.companyId }, { onConflict: 'student_id,department_id,role_in_dept' })
        .select('*, departments(id, name, classes)')
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/students/:id/departments/:deptId
  removeDepartment: async (req, res, next) => {
    try {
      const { id, deptId } = req.params;
      const { error } = await supabase
        .from('student_departments')
        .delete()
        .eq('student_id', id)
        .eq('department_id', deptId)
        .eq('company_id', req.companyId);

      if (error) throw error;

      // Si el departamento quitado era el primario del alumno, hay que reemplazarlo por otra
      // asignación que le quede; si no le queda ninguna, el miembro pasa a estar sin departamento
      // (sigue contando como miembro de la congregación, pero fuera de asistencia/ausencias).
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('id, department_id')
        .eq('id', id)
        .eq('company_id', req.companyId)
        .maybeSingle();
      if (studentErr) throw studentErr;

      if (student && student.department_id === deptId) {
        const { data: remaining, error: remErr } = await supabase
          .from('student_departments')
          .select('department_id, assigned_class, departments(name)')
          .eq('student_id', id)
          .eq('company_id', req.companyId)
          .limit(1);
        if (remErr) throw remErr;

        const fallback = remaining?.[0] || null;
        const { error: updErr } = await supabase
          .from('students')
          .update({
            department_id: fallback?.department_id || null,
            assigned_class: fallback?.assigned_class || null,
            department: fallback?.departments?.name || null,
          })
          .eq('id', id)
          .eq('company_id', req.companyId);
        if (updErr) throw updErr;
      }

      res.json({ success: true });
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
        .is('deleted_at', null)
        .eq('company_id', req.companyId);

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
      if (assigned_class !== undefined && assigned_class !== null && assigned_class !== 'all') {
        query = query.ilike('assigned_class', assigned_class);
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
  },

  // GET /api/students/lookup/:document_number
  lookup: async (req, res, next) => {
    try {
      const { document_number } = req.params;

      if (!document_number) {
        return res.status(400).json({ success: false, message: 'DNI es requerido' });
      }

      // 1. Buscar en estudiantes
      const { data: student, error: sError } = await supabase
        .from('students')
        .select('*, departments(name)')
        .eq('document_number', document_number)
        .is('deleted_at', null)
        .eq('company_id', req.companyId)
        .maybeSingle();

      if (sError) throw sError;

      if (student) {
        return res.json({
          success: true,
          source: 'student',
          data: {
            ...student,
            department: student.departments?.name,
            fullName: `${student.first_name} ${student.last_name}`
          }
        });
      }

      // 2. Si no se encontró, buscar en perfiles
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('document_number', document_number)
        .eq('company_id', req.companyId)
        .maybeSingle();

      if (pError) throw pError;

      if (profile) {
        return res.json({
          success: true,
          source: 'profile',
          data: {
            ...profile,
            fullName: `${profile.first_name} ${profile.last_name}`
          }
        });
      }

      // 3. No se encontró nada
      res.json({
        success: true,
        data: null,
        message: 'No se encontró ninguna persona con ese DNI'
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = studentsController;