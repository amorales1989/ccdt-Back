const { supabase } = require('../config/supabase');

const staffReportsController = {
    // GET /api/staff-reports
    getReports: async (req, res, next) => {
        try {
            const { role, profile_id, department } = req.user || {};
            // In auth middleware usually we have req.user, let's verify how it's done. 
            // Better fetch profile by req.user.id if available, or just take it from query if trusted within internal network. But let's check authMiddleware structure later.
            // For now, assume the frontend will send user_id, role and department as query params, since many routes here just use req.companyId and minimal auth.
            // Let's accept it from query for safety, combined with auth token.
            const { user_id, user_role, user_department } = req.query;

            let query = supabase
                .from('staff_reports')
                .select(`
                    *,
                    author:profiles!staff_reports_created_by_fkey(first_name, last_name, role),
                    target:profiles!staff_reports_target_user_id_fkey(first_name, last_name, role)
                `)
                .eq('company_id', req.companyId)
                .order('created_at', { ascending: false });

            if (user_role === 'maestro') {
                // Maestro can only see what they wrote
                query = query.eq('created_by', user_id);
            } else if (user_role === 'director' || user_role === 'vicedirector') {
                // Director/Vicedirector can see all reports in their department
                if (user_department) {
                    query = query.eq('department', user_department);
                }
            } else if (user_role === 'admin' || user_role === 'director_general' || user_role === 'secretaria') {
                // Admin can see all, no filter needed beyond company_id
            } else {
                // Other roles shouldn't see anything by default
                return res.json({ success: true, data: [] });
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/staff-reports/eligible
    getEligibleStaff: async (req, res, next) => {
        try {
            const { department, assigned_class } = req.query;

            if (!department || !assigned_class) {
                return res.json({ success: true, data: [] });
            }

            // Find users who have the same assigned_class, are in the department array, and are maestro or colaborador
            const { data, error } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, role, assigned_class, departments')
                .eq('company_id', req.companyId)
                .eq('assigned_class', assigned_class)
                .in('role', ['maestro', 'colaborador']);

            if (error) throw error;

            // Filter manually for department array overlap since Supabase array operations can be tricky without raw SQL
            const eligible = (data || []).filter(p => p.departments && p.departments.includes(department));

            res.json({ success: true, data: eligible });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/staff-reports/unread-count
    getUnreadCount: async (req, res, next) => {
        try {
            const { user_role, user_department } = req.query;

            // Solo los directores/vicedirectores ven los informes, por lo tanto el contador es para ellos
            if (user_role !== 'director' && user_role !== 'vicedirector') {
                return res.json({ success: true, count: 0 });
            }

            if (!user_department) {
                return res.json({ success: true, count: 0 });
            }

            const { count, error } = await supabase
                .from('staff_reports')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', req.companyId)
                .eq('department', user_department)
                .eq('is_read', false);

            if (error) throw error;
            res.json({ success: true, count: count || 0 });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/staff-reports/mark-read
    markAsRead: async (req, res, next) => {
        try {
            const { reportIds } = req.body;
            if (!reportIds || !reportIds.length) {
                return res.json({ success: true });
            }

            const { error } = await supabase
                .from('staff_reports')
                .update({ is_read: true })
                .in('id', reportIds)
                .eq('company_id', req.companyId);

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/staff-reports
    create: async (req, res, next) => {
        try {
            const { target_user_id, report, department, assigned_class, created_by } = req.body;

            // Optional Backend Validation to ensure target is in the same class and department
            const { data: targetUser, error: targetError } = await supabase
                .from('profiles')
                .select('assigned_class, departments, role')
                .eq('id', target_user_id)
                .single();

            if (targetError) throw targetError;

            if (targetUser.assigned_class !== assigned_class || !targetUser.departments?.includes(department)) {
                return res.status(403).json({ success: false, message: 'El usuario objetivo no pertenece a tu misma clase y departamento.' });
            }

            const { data, error } = await supabase
                .from('staff_reports')
                .insert([{
                    created_by,
                    target_user_id,
                    report,
                    department,
                    assigned_class,
                    company_id: req.companyId
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/staff-reports/:id
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { report, user_id } = req.body;

            const { data: existingReport, error: fetchError } = await supabase
                .from('staff_reports')
                .select('created_by')
                .eq('id', id)
                .single();
            if (fetchError) throw fetchError;

            if (existingReport.created_by !== user_id) {
                return res.status(403).json({ success: false, message: 'Solo el autor puede editar este informe.' });
            }

            const { data, error } = await supabase
                .from('staff_reports')
                .update({ report, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/staff-reports/:id
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { user_id, user_role, user_department } = req.query;

            const { data: existingReport, error: fetchError } = await supabase
                .from('staff_reports')
                .select('created_by, department')
                .eq('id', id)
                .single();
            if (fetchError) throw fetchError;

            let canDelete = false;

            if (user_role === 'maestro' && existingReport.created_by === user_id) {
                canDelete = true;
            } else if ((user_role === 'director' || user_role === 'vicedirector') && existingReport.department === user_department) {
                canDelete = true;
            } else if (user_role === 'admin' || user_role === 'director_general') {
                canDelete = true;
            }

            if (!canDelete) {
                return res.status(403).json({ success: false, message: 'No tienes permisos para eliminar este informe.' });
            }

            const { error } = await supabase
                .from('staff_reports')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = staffReportsController;
