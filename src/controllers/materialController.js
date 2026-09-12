const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { r2Client, R2_BUCKET, R2_PUBLIC_URL, isR2Configured } = require('../config/r2');

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const UPLOAD_URL_TTL = 300; // 5 min para completar la subida

const materialController = {
    // POST /api/material/upload-url
    // Devuelve una URL firmada para que el browser haga PUT directo a R2.
    // No proxeamos el archivo por Express: 50MB por el back es lento y se come la RAM.
    presignUpload: async (req, res, next) => {
        try {
            if (!isR2Configured) {
                const error = new Error('El almacenamiento de archivos no esta configurado');
                error.status = 503;
                throw error;
            }

            const { filename, content_type, file_size } = req.body;

            if (!filename || typeof filename !== 'string') {
                const error = new Error('El campo filename es requerido');
                error.status = 400;
                throw error;
            }

            if (typeof file_size !== 'number' || file_size <= 0 || file_size > MAX_UPLOAD_BYTES) {
                const error = new Error('El archivo excede el limite de 50MB');
                error.status = 400;
                throw error;
            }

            const ext = (filename.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
            const random = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
            // El companyId va en la key para que los archivos queden separados por empresa.
            const key = `materials/${req.companyId}/${random}${ext ? `.${ext}` : ''}`;

            const uploadUrl = await getSignedUrl(
                r2Client,
                new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: key,
                    ContentType: content_type || 'application/octet-stream'
                }),
                { expiresIn: UPLOAD_URL_TTL }
            );

            res.json({
                success: true,
                data: {
                    upload_url: uploadUrl,
                    key,
                    public_url: `${R2_PUBLIC_URL}/${key}`
                }
            });
        } catch (error) {
            next(error);
        }
    },

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
                storage_provider: req.body.storage_provider === 'r2' ? 'r2' : 'supabase',
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

            // Leemos primero para saber donde vive el archivo: borrar solo la fila
            // dejaba el objeto huerfano ocupando cuota para siempre.
            const { data: material, error: fetchError } = await supabaseAdmin
                .from('material_didactico')
                .select('file_url, storage_provider')
                .eq('id', id)
                .eq('company_id', req.companyId)
                .single();

            if (fetchError) throw fetchError;

            const { error } = await supabaseAdmin
                .from('material_didactico')
                .delete()
                .eq('id', id)
                .eq('company_id', req.companyId);

            if (error) throw error;

            if (material?.storage_provider === 'r2' && isR2Configured) {
                try {
                    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: material.file_url }));
                } catch (storageError) {
                    // La fila ya no existe: no falla la request, pero queda el log para limpiarlo.
                    console.error('Error borrando objeto de R2:', material.file_url, storageError.message);
                }
            }

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
