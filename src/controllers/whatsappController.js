const WhatsAppService = require('../services/whatsappService');
const { supabase } = require('../config/supabase');

const whatsappController = {
    getStatus: async (req, res, next) => {
        try {
            const { companyId } = req.query;
            if (!companyId) {
                return res.status(400).json({ success: false, message: 'Falta companyId' });
            }

            // Consultar estado en la base de datos
            const { data, error } = await supabase
                .from('companies')
                .select('whatsapp_status, whatsapp_qr')
                .eq('id', req.companyId)
                .single();

            if (error) throw error;

            res.json({
                success: true,
                status: data.whatsapp_status || 'disconnected',
                qr: data.whatsapp_qr
            });
        } catch (error) {
            next(error);
        }
    },

    connect: async (req, res, next) => {
        try {
            const { companyId } = req.body;
            if (!companyId) {
                return res.status(400).json({ success: false, message: 'Falta companyId' });
            }

            // Iniciar proceso de conexión
            await WhatsAppService.conectar(req.companyId);

            res.json({
                success: true,
                message: 'Proceso de conexión iniciado'
            });
        } catch (error) {
            next(error);
        }
    },

    disconnect: async (req, res, next) => {
        try {
            const { companyId } = req.body;
            if (!companyId) {
                return res.status(400).json({ success: false, message: 'Falta companyId' });
            }

            await WhatsAppService.desconectar(req.companyId);

            res.json({
                success: true,
                message: 'WhatsApp desconectado'
            });
        } catch (error) {
            next(error);
        }
    },

    testMessage: async (req, res, next) => {
        try {
            const { companyId, phoneNumber, message } = req.body;
            if (!companyId || !phoneNumber || !message) {
                return res.status(400).json({ success: false, message: 'Faltan parámetros' });
            }

            const result = await WhatsAppService.sendMessage(req.companyId, phoneNumber, message);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = whatsappController;
