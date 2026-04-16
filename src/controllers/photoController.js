const multer = require('multer');
const sharp = require('sharp');
const { supabaseAdmin } = require('../config/supabase');
const { supabase } = require('../config/supabase');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for raw upload
    },
});

const photoController = {
    uploadPhoto: async (req, res, next) => {
        try {
            const { id } = req.params;
            const file = req.file;
            const companyId = req.companyId;

            if (!file) {
                return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo' });
            }

            if (!id) {
                return res.status(400).json({ success: false, message: 'ID de miembro no proporcionado' });
            }

            // 1. Procesar con Sharp
            // Redimensionamos a un máximo de 1024px y comprimimos para asegurar < 1MB
            const compressedImageBuffer = await sharp(file.buffer)
                .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer();

            // Verificar tamaño final (sharp suele ser muy eficiente, pero por si acaso)
            if (compressedImageBuffer.length > 1024 * 1024) {
                // Si aún es mayor a 1MB, bajamos más la calidad
                const highCompressionBuffer = await sharp(compressedImageBuffer)
                    .jpeg({ quality: 60 })
                    .toBuffer();

                return uploadToSupabase(highCompressionBuffer, id, companyId, res);
            }

            return uploadToSupabase(compressedImageBuffer, id, companyId, res);

        } catch (error) {
            console.error('Error in uploadPhoto:', error);
            next(error);
        }
    },

    deletePhoto: async (req, res, next) => {
        try {
            const { id } = req.params;
            const companyId = req.companyId;

            if (!id) {
                return res.status(400).json({ success: false, message: 'ID de miembro no proporcionado' });
            }

            // 1. Obtener la URL actual para extraer el path
            const { data: student, error: fetchError } = await supabaseAdmin
                .from('students')
                .select('photo_url')
                .eq('id', id)
                .eq('company_id', companyId)
                .single();

            if (fetchError || !student) {
                return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
            }

            if (student.photo_url) {
                // Extraer el path de la URL pública
                // Formato: .../public/member-photos/path/to/file.jpg
                const urlParts = student.photo_url.split('/member-photos/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    // Eliminar de storage
                    await supabaseAdmin.storage
                        .from('member-photos')
                        .remove([filePath]);
                }
            }

            // 2. Actualizar registro en DB
            const { error: updateError } = await supabaseAdmin
                .from('students')
                .update({ photo_url: null })
                .eq('id', id)
                .eq('company_id', companyId);

            if (updateError) throw updateError;

            res.json({
                success: true,
                message: 'Foto eliminada correctamente'
            });

        } catch (error) {
            console.error('Error in deletePhoto:', error);
            next(error);
        }
    }
};

async function uploadToSupabase(buffer, studentId, companyId, res) {
    try {
        // 2. Subir a Supabase Storage
        const path = `${companyId}/${studentId}_${Date.now()}.jpg`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('member-photos')
            .upload(path, buffer, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (uploadError) {
            if (uploadError.message.includes('bucket not found')) {
                return res.status(500).json({
                    success: false,
                    message: 'El bucket "member-photos" no existe en Supabase. Por favor, créalo.'
                });
            }
            throw uploadError;
        }

        // 3. Obtener URL Pública
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('member-photos')
            .getPublicUrl(path);

        // 4. Actualizar registro del estudiante
        const { error: updateError } = await supabaseAdmin
            .from('students')
            .update({ photo_url: publicUrl })
            .eq('id', studentId)
            .eq('company_id', companyId);

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: 'Foto subida y comprimida exitosamente',
            data: {
                photo_url: publicUrl,
                size: buffer.length
            }
        });
    } catch (error) {
        console.error('Error in uploadToSupabase:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    photoController,
    uploadMiddleware: upload.single('photo')
};
