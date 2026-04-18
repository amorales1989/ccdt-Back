const { supabase, supabaseAdmin } = require('../config/supabase');

const materialController = {
    // GET /api/material
    getAll: async (req, res, next) => {
        try {
            const { department_id, age_range } = req.query;

            let query = supabaseAdmin
                .from('material_didactico')
                .select(`
          *,
          departments(name)
        `)
                .eq('company_id', req.companyId);

            if (department_id) {
                query = query.eq('department_id', department_id);
            }

            if (age_range) {
                query = query.eq('age_range', age_range);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/material
    create: async (req, res, next) => {
        try {
            const { name, description, file_url, age_range, department_id, file_size } = req.body;

            if (!name || !file_url || !age_range) {
                const error = new Error('Los campos nombre, archivo y rango de edad son requeridos');
                error.status = 400;
                throw error;
            }

            const materialData = {
                name,
                description,
                file_url,
                age_range,
                department_id: department_id || null,
                file_size: file_size || null,
                company_id: req.companyId,
                created_by: req.user.id
            };

            const { data, error } = await supabaseAdmin
                .from('material_didactico')
                .insert([materialData])
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                success: true,
                message: 'Material didáctico creado exitosamente',
                data
            });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/material/:id
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;

            const { error } = await supabaseAdmin
                .from('material_didactico')
                .delete()
                .eq('id', id)
                .eq('company_id', req.companyId);

            if (error) throw error;

            res.json({
                success: true,
                message: 'Material eliminado exitosamente'
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = materialController;
