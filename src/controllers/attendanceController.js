const { supabase } = require('../config/supabase');

const attendanceController = {
    // DELETE /api/attendance/by-date - Eliminar toda la asistencia de una fecha
    deleteByDate: async (req, res, next) => {
        try {
            const { date, department_id, assigned_class } = req.body;

            if (!date) {
                return res.status(400).json({ success: false, message: 'date es requerido' });
            }

            let query = supabase
                .from('attendance')
                .delete()
                .eq('date', date)
                .eq('company_id', req.companyId);

            if (department_id) {
                query = query.eq('department_id', department_id);
            }
            if (assigned_class) {
                query = query.eq('assigned_class', assigned_class);
            }

            const { data, error } = await query.select('id');

            if (error) throw error;
            res.json({ success: true, deleted: data?.length || 0 });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = attendanceController;
