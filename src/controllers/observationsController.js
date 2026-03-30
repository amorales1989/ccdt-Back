const { supabase } = require('../config/supabase');

const observationsController = {
    // GET /api/observations/:studentId
    getByStudentId: async (req, res, next) => {
        try {
            const { studentId } = req.params;
            // Obtener el perfil del estudiante para buscar observaciones compartidas
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('profile_id')
                .eq('id', studentId)
                .single();

            if (studentError) throw studentError;

            let query = supabase
                .from('student_observations')
                .select(`
                  *,
                  profiles (
                    first_name,
                    last_name
                  )
                `);

            if (student.profile_id) {
                // Si tiene perfil, buscar todas las observaciones de ese perfil
                query = query.eq('profile_id', student.profile_id);
            } else {
                // Si no, solo las de este student_id
                query = query.eq('student_id', studentId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/observations
    create: async (req, res, next) => {
        try {
            const { student_id, observation, created_by } = req.body;

            // Obtener el profile_id del estudiante
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('profile_id')
                .eq('id', student_id)
                .single();

            if (studentError) throw studentError;

            const { data, error } = await supabase
                .from('student_observations')
                .insert([{
                    student_id,
                    observation,
                    created_by,
                    profile_id: student.profile_id
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/observations/:id
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { observation } = req.body;
            const { data, error } = await supabase
                .from('student_observations')
                .update({ observation })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/observations/:id
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('student_observations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true, message: 'Observation deleted' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = observationsController;
