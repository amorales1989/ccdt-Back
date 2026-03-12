const { supabase } = require('../config/supabase');

const observationsController = {
    // GET /api/observations/:studentId
    getByStudentId: async (req, res, next) => {
        try {
            const { studentId } = req.params;
            const { data, error } = await supabase
                .from('student_observations')
                .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });

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
            const { data, error } = await supabase
                .from('student_observations')
                .insert([{ student_id, observation, created_by }])
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
