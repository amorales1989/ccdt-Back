const { supabase, supabaseAdmin } = require('../config/supabase');
const BirthdayService = require('../services/birthdayService');
const { assertMemberLimitNotReached } = require('../services/memberLimitService');
const {
  EVENT, buildFieldDiff, deptNames, logStudentEvent, logStudentEvents
} = require('../services/studentEventsService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// El archivo de ex miembros expone datos de gente que ya no está (motivo de baja incluido):
// no es para cualquier rol.
const ARCHIVE_ROLES = ['admin', 'secretaria', 'director_general'];

// Motivos válidos de baja. Tienen que coincidir con MOTIVOS_BAJA del front
// (src/components/BajaMiembroDialog.tsx): el valor se guarda en students.deleted_reason
// y el archivo filtra por él, así que no se cambian una vez que hay datos.
const MOTIVOS_BAJA = ['mudanza', 'dejo_de_asistir', 'cambio_iglesia', 'fallecimiento', 'duplicado', 'otro'];

// Recorte por rol de GET /api/students?scope=mine (pantalla Listar miembros).
// Antes lo hacía el front en JS bajándose toda la empresa; ahora lo resuelve el SP.
const ALL_STUDENTS_ROLES = ['admin', 'secretaria'];
const DEPT_SCOPE_ROLES = ['director', 'director_general', 'vicedirector'];

// null = sin recorte. { ids: [], class } = no ve a nadie.
const resolveStudentScope = async (profile, companyId) => {
  const role = profile?.role;
  if (ALL_STUDENTS_ROLES.includes(role)) return null;

  if (DEPT_SCOPE_ROLES.includes(role)) {
    // El perfil guarda los departamentos por nombre; el SP los quiere por id.
    const ids = new Set();
    if (profile?.department_id) ids.add(profile.department_id);
    const names = Array.isArray(profile?.departments) ? profile.departments : [];
    if (names.length) {
      const { data, error } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('company_id', companyId)
        .in('name', names);
      if (error) throw error;
      (data || []).forEach(d => ids.add(d.id));
    }
    return { ids: [...ids], class: null };
  }

  // Maestro/líder/auxiliar: solo su departamento y su clase.
  if (profile?.department_id && profile?.assigned_class) {
    return { ids: [profile.department_id], class: profile.assigned_class };
  }

  // Sin departamento asignado no ve a nadie (misma regla que tenía el front).
  return { ids: [], class: null };
};

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
      const { department_id, assigned_class, gender, search, scope } = req.query;

      // scope=mine: el back deriva el recorte del perfil, nunca del cliente.
      const roleScope = scope === 'mine'
        ? await resolveStudentScope(req.profile, req.companyId)
        : null;

      // supabaseAdmin (service_role): get_students tiene el EXECUTE revocado para
      // anon/authenticated (ver get_students_permissions.sql).
      const { data, error } = await supabaseAdmin.rpc('get_students', {
        p_company_id:     req.companyId,
        p_department_id:  department_id  || null,
        p_assigned_class: (assigned_class && assigned_class !== 'all') ? assigned_class : null,
        p_gender:         gender          || null,
        p_search:         search          || null,
        p_scope_department_ids: roleScope ? roleScope.ids : null,
        p_scope_class:          roleScope ? roleScope.class : null,
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

  // GET /api/students/archived - Archivo de ex miembros (fichas dadas de baja).
  archived: async (req, res, next) => {
    try {
      if (!ARCHIVE_ROLES.includes(req.profile?.role)) {
        return res.status(403).json({ success: false, message: 'No tenés permiso para ver el archivo de miembros' });
      }

      const { search, department_id, desde, hasta, limit, offset } = req.query;

      if (department_id && !UUID_RE.test(department_id)) {
        return res.status(400).json({ success: false, message: 'department_id inválido' });
      }
      if (desde && !ISO_DATE_RE.test(desde)) {
        return res.status(400).json({ success: false, message: 'desde debe ser una fecha YYYY-MM-DD' });
      }
      if (hasta && !ISO_DATE_RE.test(hasta)) {
        return res.status(400).json({ success: false, message: 'hasta debe ser una fecha YYYY-MM-DD' });
      }

      const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      const { data, error } = await supabaseAdmin.schema('api').rpc('miembros_archivados', {
        p_company_id: req.companyId,
        p_search: search || null,
        p_department_id: department_id || null,
        p_desde: desde || null,
        p_hasta: hasta || null,
        p_limit: parsedLimit,
        p_offset: parsedOffset,
      });

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/students/:id/timeline - Línea cronológica de la persona (activa o archivada).
  timeline: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!UUID_RE.test(id)) {
        return res.status(400).json({ success: false, message: 'id inválido' });
      }

      const { data, error } = await supabaseAdmin.schema('api').rpc('miembro_linea_tiempo', {
        p_company_id: req.companyId,
        p_student_id: id,
      });

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
      }

      res.json({ success: true, data });
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

        // Red de seguridad: el DNI puede ser de alguien que ya estuvo y se fue. Crear una
        // ficha nueva dejaría su historial (asistencias, observaciones) colgando de la vieja,
        // así que se corta acá y el front ofrece reactivar la que ya existe.
        const { data: archivado, error: archErr } = await supabase
          .from('students')
          .select('id, first_name, last_name, deleted_at, deleted_reason, departments(name)')
          .eq('document_number', document_number.trim())
          .not('deleted_at', 'is', null)
          .eq('company_id', req.companyId)
          .order('deleted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (archErr) throw archErr;

        if (archivado) {
          return res.status(409).json({
            success: false,
            code: 'ARCHIVED_DNI',
            message: `${archivado.first_name} ${archivado.last_name || ''}`.trim() +
              ' ya estuvo en la congregación y su ficha está archivada. Reactivala para no perder su historial.',
            archived_student: {
              id: archivado.id,
              first_name: archivado.first_name,
              last_name: archivado.last_name,
              deleted_at: archivado.deleted_at,
              deleted_reason: archivado.deleted_reason,
              department: archivado.departments?.name || null,
            },
          });
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

        const cambiosPersona = buildFieldDiff(existing, personUpdates);
        const nombresVinculados = await deptNames(req.companyId, assignmentsToAdd.map(a => a.department_id));
        await logStudentEvent(req, {
          studentId: existing.id,
          type: EVENT.VINCULACION,
          departmentId: assignmentsToAdd[0]?.department_id || null,
          detail: {
            departamentos: assignmentsToAdd.map(a => ({
              id: a.department_id,
              nombre: nombresVinculados[a.department_id] || null,
              clase: a.assigned_class || null,
              rol: a.role_in_dept || 'alumno',
            })),
            ...(Object.keys(cambiosPersona).length > 0 ? { cambios: cambiosPersona } : {}),
          },
        });

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

      const nombresAlta = await deptNames(req.companyId, assignments.map(a => a.department_id));
      await logStudentEvent(req, {
        studentId: data.id,
        type: EVENT.ALTA,
        departmentId: primaryDeptId,
        detail: {
          nombre: `${data.first_name} ${data.last_name || ''}`.trim(),
          origen: person_source || (profile_id ? 'usuario' : 'manual'),
          departamentos: assignments.map(a => ({
            id: a.department_id,
            nombre: nombresAlta[a.department_id] || null,
            clase: a.assigned_class || null,
            rol: a.role_in_dept || 'alumno',
          })),
        },
      });

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
        // Los campos de más son el "antes" que compara la bitácora (student_events).
        .select('id, document_number, first_name, last_name, birthdate, gender, phone, address, baptized, department_id, assigned_class')
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

      // Bitácora: el cambio de departamento es un movimiento y se guarda aparte de la
      // edición de datos personales, que es otra cosa cuando se lee la línea de tiempo.
      const cambios = buildFieldDiff(existingStudent, cleanUpdates);
      const deptAnterior = existingStudent.department_id || null;
      const deptNuevo = data.department_id || null;

      if (deptAnterior !== deptNuevo) {
        const nombres = await deptNames(req.companyId, [deptAnterior, deptNuevo]);
        await logStudentEvent(req, {
          studentId: id,
          type: EVENT.CAMBIO_DEPARTAMENTO,
          departmentId: deptNuevo,
          detail: {
            de: { id: deptAnterior, nombre: nombres[deptAnterior] || null, clase: existingStudent.assigned_class || null },
            a: { id: deptNuevo, nombre: nombres[deptNuevo] || data.departments?.name || null, clase: data.assigned_class || null },
          },
        });
        delete cambios.assigned_class; // la clase nueva ya viaja dentro del cambio de departamento
      }

      if (cambios.baptized?.a === true) {
        await logStudentEvent(req, { studentId: id, type: EVENT.BAUTISMO, departmentId: deptNuevo, detail: {} });
        delete cambios.baptized;
      }

      if (Object.keys(cambios).length > 0) {
        await logStudentEvent(req, { studentId: id, type: EVENT.EDICION, departmentId: deptNuevo, detail: { cambios } });
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

  // POST /api/students/:id/merge - Fusiona dos fichas que son la misma persona.
  // :id es la ficha que se absorbe (queda soft-deleted); body.target_id la que sobrevive
  // con todo el historial de ambas. Con body.dry_run = true solo devuelve el conteo.
  //
  // Va por SP porque son 7 tablas en cadena y supabase-js no da transacciones: a mitad
  // de camino la persona quedaria partida en dos sin forma de volver atras.
  merge: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { target_id, dry_run } = req.body || {};

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(id)) {
        return res.status(400).json({ success: false, message: 'id inválido' });
      }
      if (!target_id || !UUID_RE.test(target_id)) {
        return res.status(400).json({ success: false, message: 'target_id inválido' });
      }
      if (id === target_id) {
        return res.status(400).json({ success: false, message: 'No se puede fusionar un miembro consigo mismo' });
      }

      const { data, error } = await supabaseAdmin.schema('api').rpc('miembros_fusionar', {
        p_company_id: req.companyId,
        p_source_id:  id,
        p_target_id:  target_id,
        p_dry_run:    dry_run === true,
      });

      if (error) {
        // El SP valida pertenencia a la empresa, fichas borradas y el choque de cuentas
        // de usuario. Todo eso es culpa del pedido, no del servidor.
        if (error.code === 'P0002' || error.code === '23514') {
          return res.status(409).json({ success: false, message: error.message });
        }
        throw error;
      }

      // La ficha absorbida queda soft-deleted pero su fila sigue existiendo, así que ambas
      // conservan el evento y la línea de tiempo del sobreviviente explica de dónde salió.
      if (dry_run !== true) {
        await logStudentEvents(req, [
          { studentId: id, type: EVENT.FUSION, detail: { rol: 'absorbida', hacia: target_id, resumen: data } },
          { studentId: target_id, type: EVENT.FUSION, detail: { rol: 'sobrevive', desde: id, resumen: data } },
        ]);
      }

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/students/promote - Pase masivo de miembros a otro departamento/clase.
  //
  // Antes lo hacía el front con supabase.from('students').update() directo (regla 14): sin
  // registro de quién promovió a quién, y dejando student_departments con el departamento
  // viejo, así que la lista de miembros seguía mostrando el anterior.
  promote: async (req, res, next) => {
    try {
      const { student_ids, department_id, assigned_class } = req.body || {};

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'student_ids es requerido' });
      }
      if (!student_ids.every(sid => typeof sid === 'string' && UUID_RE.test(sid))) {
        return res.status(400).json({ success: false, message: 'student_ids contiene un id inválido' });
      }
      if (!department_id || !UUID_RE.test(department_id)) {
        return res.status(400).json({ success: false, message: 'department_id inválido' });
      }

      const { data: targetDept, error: deptErr } = await supabase
        .from('departments')
        .select('id, name')
        .eq('id', department_id)
        .eq('company_id', req.companyId)
        .maybeSingle();
      if (deptErr) throw deptErr;
      if (!targetDept) {
        return res.status(404).json({ success: false, message: 'Departamento destino no encontrado' });
      }

      // El filtro por company_id acá es el aislamiento multi-tenant: ids de otra empresa
      // simplemente no entran a la lista.
      const { data: students, error: stErr } = await supabase
        .from('students')
        .select('id, first_name, last_name, department_id, assigned_class')
        .in('id', student_ids)
        .eq('company_id', req.companyId)
        .is('deleted_at', null);
      if (stErr) throw stErr;
      if (!students || students.length === 0) {
        return res.status(404).json({ success: false, message: 'Ningún miembro válido para promover' });
      }

      const ids = students.map(s => s.id);
      const nuevaClase = assigned_class || null;

      const { error: updErr } = await supabase
        .from('students')
        .update({ department_id, department: targetDept.name, assigned_class: nuevaClase })
        .in('id', ids)
        .eq('company_id', req.companyId);
      if (updErr) throw updErr;

      // Junction: sacar la asignación del departamento de origen (agrupada por origen, que
      // normalmente es uno solo) y crear la del destino. Las otras asignaciones no se tocan.
      const porOrigen = new Map();
      students.forEach(s => {
        if (!s.department_id || s.department_id === department_id) return;
        if (!porOrigen.has(s.department_id)) porOrigen.set(s.department_id, []);
        porOrigen.get(s.department_id).push(s.id);
      });
      for (const [origenId, sids] of porOrigen) {
        const { error: delErr } = await supabase
          .from('student_departments')
          .delete()
          .in('student_id', sids)
          .eq('department_id', origenId)
          .eq('company_id', req.companyId);
        if (delErr) throw delErr;
      }

      const { error: upsErr } = await supabase
        .from('student_departments')
        .upsert(
          ids.map(sid => ({
            student_id: sid,
            department_id,
            assigned_class: nuevaClase,
            role_in_dept: 'alumno',
            company_id: req.companyId,
          })),
          { onConflict: 'student_id,department_id,role_in_dept' }
        );
      if (upsErr) throw upsErr;

      // Las autorizaciones firmadas son por departamento: al entrar al nuevo hay que volver
      // a pedirlas, así que se limpian las que ya existieran ahí.
      await supabase
        .from('student_authorizations')
        .delete()
        .in('student_id', ids)
        .eq('department_id', department_id)
        .eq('company_id', req.companyId);

      const nombresOrigen = await deptNames(req.companyId, students.map(s => s.department_id));
      await logStudentEvents(req, students.map(s => ({
        studentId: s.id,
        type: EVENT.PROMOCION,
        departmentId: department_id,
        detail: {
          de: { id: s.department_id, nombre: nombresOrigen[s.department_id] || null, clase: s.assigned_class || null },
          a: { id: department_id, nombre: targetDept.name, clase: nuevaClase },
        },
      })));

      res.json({
        success: true,
        promoted: ids.length,
        message: `${ids.length} miembro(s) promovido(s) a ${targetDept.name}`,
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/students/:id/restore - Vuelve a activar una ficha archivada.
  //
  // Es la contracara de la baja: la persona volvió, y en vez de cargarla de nuevo (dejando su
  // asistencia y observaciones colgadas de la ficha vieja) se reactiva la que ya existe.
  restore: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { department_id, assigned_class } = req.body || {};

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(id)) {
        return res.status(400).json({ success: false, message: 'id inválido' });
      }
      if (department_id && !UUID_RE.test(department_id)) {
        return res.status(400).json({ success: false, message: 'department_id inválido' });
      }

      const { data: archivado, error: fetchErr } = await supabase
        .from('students')
        .select('id, first_name, last_name, department_id, assigned_class, deleted_at, deleted_reason')
        .eq('id', id)
        .eq('company_id', req.companyId)
        .not('deleted_at', 'is', null)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!archivado) {
        return res.status(404).json({ success: false, message: 'La ficha no existe o ya está activa' });
      }

      // Vuelve a ocupar un lugar activo, así que cuenta contra el límite del plan.
      await assertMemberLimitNotReached(req.companyId);

      let deptName = null;
      if (department_id) {
        const { data: dept, error: deptErr } = await supabase
          .from('departments')
          .select('id, name')
          .eq('id', department_id)
          .eq('company_id', req.companyId)
          .maybeSingle();
        if (deptErr) throw deptErr;
        if (!dept) {
          return res.status(404).json({ success: false, message: 'Departamento no encontrado' });
        }
        deptName = dept.name;
      }

      const updates = { deleted_at: null, deleted_reason: null, deleted_by: null };
      if (department_id) {
        updates.department_id = department_id;
        updates.department = deptName;
        updates.assigned_class = assigned_class || null;
      }

      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .eq('company_id', req.companyId)
        .select('*, departments(name)')
        .single();
      if (error) throw error;

      // Junction: al volver a otro departamento, la asignación vieja no tiene sentido.
      // Las filas de asistencia no se tocan: cada una guarda el departamento donde ocurrió.
      if (department_id) {
        if (archivado.department_id && archivado.department_id !== department_id) {
          await supabase
            .from('student_departments')
            .delete()
            .eq('student_id', id)
            .eq('department_id', archivado.department_id)
            .eq('company_id', req.companyId);
        }
        await supabase
          .from('student_departments')
          .upsert(
            {
              student_id: id,
              department_id,
              assigned_class: assigned_class || null,
              role_in_dept: 'alumno',
              company_id: req.companyId,
            },
            { onConflict: 'student_id,department_id,role_in_dept' }
          );
      }

      await logStudentEvent(req, {
        studentId: id,
        type: EVENT.REACTIVACION,
        departmentId: department_id || archivado.department_id || null,
        detail: {
          nombre: `${archivado.first_name} ${archivado.last_name || ''}`.trim(),
          baja_previa: { fecha: archivado.deleted_at, motivo: archivado.deleted_reason },
          ...(department_id
            ? { departamento: { id: department_id, nombre: deptName, clase: assigned_class || null } }
            : {}),
        },
      });

      res.json({
        success: true,
        message: 'Miembro reactivado con todo su historial',
        data: { ...data, department: data.departments?.name || data.department, is_deleted: false },
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
      const { department_id: fromDeptId, reason, reason_note } = req.query;

      // Verificar que el estudiante existe y no está eliminado
      const { data: existingStudent, error: fetchError } = await supabase
        .from('students')
        .select('id, department_id, assigned_class, first_name, last_name')
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

        const nombresDesv = await deptNames(req.companyId, [fromDeptId]);
        await logStudentEvent(req, {
          studentId: id,
          type: EVENT.DESVINCULACION,
          departmentId: fromDeptId,
          detail: {
            departamento: nombresDesv[fromDeptId] || null,
            ...(reason ? { motivo: reason } : {}),
            ...(reason_note ? { nota: reason_note } : {}),
          },
        });

        return res.json({
          success: true,
          message: 'Miembro desvinculado del departamento',
          unlinked: true
        });
      }

      // Caso default: soft delete completo (1 solo depto o no se pasó department_id).
      // Acá el motivo es obligatorio: una baja sin motivo es la que dejaba el archivo lleno
      // de fichas que nadie puede interpretar después. La desvinculación de un departamento
      // (arriba) no lo pide, porque no es una baja.
      if (!reason || !MOTIVOS_BAJA.includes(reason)) {
        return res.status(400).json({
          success: false,
          code: 'REASON_REQUIRED',
          message: 'Indicá el motivo de la baja.',
          motivos_validos: MOTIVOS_BAJA,
        });
      }

      // El `.is('deleted_at', null)` hace la baja idempotente: si dos pedidos llegan a la vez
      // (doble click, reintento de red), el segundo no actualiza ninguna fila y no registra
      // una segunda baja en la bitácora. Sin esto, ambos pasaban la verificación de arriba.
      const { data: bajaAplicada, error } = await supabase
        .from('students')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_reason: reason,
          deleted_by: req.user?.id || null,
        })
        .eq('id', id)
        .eq('company_id', req.companyId)
        .is('deleted_at', null)
        .select('id');

      if (error) {
        throw error;
      }

      if (!bajaAplicada || bajaAplicada.length === 0) {
        return res.json({
          success: true,
          message: 'El miembro ya estaba dado de baja',
          unlinked: false,
        });
      }

      // La ficha no se borra: queda archivada con su motivo y su historial completo.
      const nombresBaja = await deptNames(req.companyId, [...allDeptIds]);
      await logStudentEvent(req, {
        studentId: id,
        type: EVENT.BAJA,
        departmentId: existingStudent.department_id || null,
        detail: {
          nombre: `${existingStudent.first_name} ${existingStudent.last_name || ''}`.trim(),
          motivo: reason,
          ...(reason_note ? { nota: reason_note } : {}),
          departamentos: [...allDeptIds].map(d => ({ id: d, nombre: nombresBaja[d] || null })),
        },
      });

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

      await logStudentEvent(req, {
        studentId: id,
        type: EVENT.VINCULACION,
        departmentId: department_id,
        detail: {
          departamentos: [{
            id: department_id,
            nombre: data?.departments?.name || null,
            clase: assigned_class || null,
            rol: role_in_dept,
          }],
        },
      });

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

      const nombresQuitado = await deptNames(req.companyId, [deptId]);
      await logStudentEvent(req, {
        studentId: id,
        type: EVENT.DESVINCULACION,
        departmentId: deptId,
        detail: { departamento: nombresQuitado[deptId] || null },
      });

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

      // 3. Nadie activo con ese DNI: puede ser alguien que estuvo y se fue. La ficha vieja
      // sigue archivada con todo su historial, así que se avisa en vez de dejar que carguen
      // un duplicado. Si hay más de una (fusiones viejas), la más reciente.
      const { data: archivado, error: aError } = await supabase
        .from('students')
        .select('id, first_name, last_name, birthdate, gender, phone, address, document_number, baptized, deleted_at, deleted_reason, department_id, assigned_class, departments(name)')
        .eq('document_number', document_number)
        .not('deleted_at', 'is', null)
        .eq('company_id', req.companyId)
        .order('deleted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (aError) throw aError;

      if (archivado) {
        return res.json({
          success: true,
          source: 'student_archivado',
          data: {
            ...archivado,
            department: archivado.departments?.name || null,
            fullName: `${archivado.first_name} ${archivado.last_name || ''}`.trim()
          }
        });
      }

      // 4. No se encontró nada
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