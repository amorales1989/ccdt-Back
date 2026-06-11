const { supabase } = require('../config/supabase');

const topicRecordsController = {
    // GET /api/topic-records
    getAll: async (req, res, next) => {
        try {
            const { user_id, user_role, department_id, assigned_class } = req.query;

            let query = supabase
                .from('topic_records')
                .select('*')
                .eq('company_id', req.companyId)
                .order('fecha', { ascending: false });

            const isMaestro = user_role === 'maestro' || user_role === 'auxiliar_maestro';
            const isDirectorLevel = user_role === 'director' || user_role === 'vicedirector' || user_role === 'director_general';
            const isAdmin = user_role === 'admin' || user_role === 'secretaria';

            if (isMaestro) {
                query = query.eq('created_by', user_id);
            } else if (isDirectorLevel || isAdmin) {
                // directors: su dept_id viene del perfil (requerido para aislar); admins: filtros opcionales desde la UI
                if (department_id) query = query.eq('department_id', department_id);
                if (assigned_class) query = query.eq('assigned_class', assigned_class);
            } else {
                return res.json({ success: true, data: [] });
            }

            const { data, error } = await query;
            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/topic-records
    create: async (req, res, next) => {
        try {
            const {
                fecha, tema, base_biblica, ensenanza_principal,
                versiculo_memorizar, actividad_practica,
                estadistica_total, estadistica_presentes_regulares,
                estadistica_presentes_nuevos, estadistica_ausentes,
                firma, observaciones,
                department_id, assigned_class, created_by
            } = req.body;

            if (!fecha || !created_by) {
                return res.status(400).json({ success: false, message: 'fecha y created_by son requeridos' });
            }

            const newId = require('crypto').randomUUID();

            const { error: insertError } = await supabase
                .from('topic_records')
                .insert({
                    id: newId,
                    company_id: req.companyId,
                    department_id: department_id || null,
                    assigned_class: assigned_class || null,
                    created_by,
                    fecha,
                    tema: tema || null,
                    base_biblica: base_biblica || null,
                    ensenanza_principal: ensenanza_principal || null,
                    versiculo_memorizar: versiculo_memorizar || null,
                    actividad_practica: actividad_practica || null,
                    estadistica_total: estadistica_total ?? null,
                    estadistica_presentes_regulares: estadistica_presentes_regulares ?? null,
                    estadistica_presentes_nuevos: estadistica_presentes_nuevos ?? null,
                    estadistica_ausentes: estadistica_ausentes ?? null,
                    firma: firma || null,
                    observaciones: observaciones || null,
                });

            if (insertError) {
                console.error('❌ topic_records INSERT error:', JSON.stringify(insertError), 'status:', insertError?.status, 'code:', insertError?.code);
                throw new Error(insertError.message || insertError.details || insertError.hint || JSON.stringify(insertError));
            }

            const { data, error: fetchError } = await supabase
                .from('topic_records')
                .select('*')
                .eq('id', newId)
                .single();

            if (fetchError) throw new Error(fetchError.message || JSON.stringify(fetchError));
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/topic-records/:id
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const {
                fecha, tema, base_biblica, ensenanza_principal,
                versiculo_memorizar, actividad_practica,
                estadistica_total, estadistica_presentes_regulares,
                estadistica_presentes_nuevos, estadistica_ausentes,
                firma, observaciones
            } = req.body;

            const { data, error } = await supabase
                .from('topic_records')
                .update({
                    fecha, tema, base_biblica, ensenanza_principal,
                    versiculo_memorizar, actividad_practica,
                    estadistica_total, estadistica_presentes_regulares,
                    estadistica_presentes_nuevos, estadistica_ausentes,
                    firma, observaciones,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('company_id', req.companyId)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/topic-records/:id
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('topic_records')
                .delete()
                .eq('id', id)
                .eq('company_id', req.companyId);

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = topicRecordsController;
