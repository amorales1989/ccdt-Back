const { supabase } = require('../config/supabase');
const nodemailer = require('nodemailer');
const axios = require('axios');


const { Resend } = require('resend');

const resend = new Resend('re_UV2bZBBj_5DpDPTZM2KnYnFfZ3ejNzoXr'); 

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,  // Cambiar de 465 a 587
  secure: false,  // Cambiar a false para STARTTLS
  auth: {
    user: 'comunidadcristianadontorcuato@gmail.com',
    pass: 'icyt wklz gcyv zlas'
  },
  tls: {
    rejectUnauthorized: false  // Añadir esto para evitar errores de certificados
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Error Gmail SMTP:', error);
  } 
});

const eventsController = {
  // GET /api/events
  getAll: async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/events/:id
  getById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Evento no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      res.json({
        success: true,
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/events/pending-requests
  getPendingRequests: async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('solicitud', true)
        .in('estado', ['solicitud', null])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/events/upcoming
  getUpcoming: async (req, res, next) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', today)
        .neq('solicitud', true)
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: data,
        count: data.length
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/events
  create: async (req, res, next) => {
    try {
      const { title, date, time, description, solicitud = false, estado, departamento, solicitante } = req.body;

      // Validaciones básicas
      if (!title || !date) {
        const validationError = new Error('Los campos title y date son requeridos');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const eventData = {
        title,
        date,
        time: time || null,
        description: description || null,
        solicitud,
        estado: estado || null,
        departamento: departamento || null,
        solicitante: solicitante || null
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({
        success: true,
        message: 'Evento creado exitosamente',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/events/:id
  update: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Evento no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Evento actualizado exitosamente',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/events/:id
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        message: 'Evento eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/events/:id/status
  updateStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!estado) {
        const validationError = new Error('El campo estado es requerido');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const { data, error } = await supabase
        .from('events')
        .update({ estado })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const notFoundError = new Error('Evento no encontrado');
          notFoundError.status = 404;
          throw notFoundError;
        }
        throw error;
      }

      res.json({
        success: true,
        message: 'Estado del evento actualizado exitosamente',
        data: data
      });
    } catch (error) {
      next(error);
    }
  },


// POST /api/events/notify-new-request 
notifyNewRequest: async (req, res, next) => {
  try {    
    const { 
      eventTitle, 
      eventDate, 
      eventTime, 
      department, 
      requesterName, 
      description,
      adminEmails,
    } = req.body;

    if (!eventTitle || !eventDate || !requesterName) {
      return res.status(400).json({
        success: false,
        message: 'Los campos "eventTitle", "eventDate" y "requesterName" son requeridos'
      });
    }

    // ✅ Restar un día a la fecha y formatear a DD-MM-YYYY
    const adjustDateForN8n = (dateString) => {
      const date = new Date(dateString + 'T12:00:00');
      date.setDate(date.getDate() - 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${day}-${month}-${year}`; // ✅ Formato DD-MM-YYYY
    };

    const adjustedDateForN8n = adjustDateForN8n(eventDate);

    // ✅ Enviar datos al webhook de n8n con fecha ajustada
    const n8nPayload = {
      eventTitle,
      eventDate: adjustedDateForN8n,
      eventTime,
      department,
      requesterName,
      description,
      adminEmails
    };

    try {
      const n8nResponse = await axios.post(
        'https://n8n-n8n.3htcbh.easypanel.host/webhook/calendarioccdt',
        n8nPayload
      );
    } catch (n8nError) {
      console.error('❌ Error al enviar datos a n8n:', n8nError.response?.data || n8nError.message);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar datos a n8n',
        error: n8nError.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notificación enviada correctamente a n8n',
      data: {
        eventTitle: eventTitle,
        adjustedDate: adjustedDateForN8n
      }
    });

  } catch (error) {
    console.error('❌ Error enviando notificaciones:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación',
      error: error.message
    });
  }
},

  // POST /api/events/notify-request-response - Notificar respuesta de solicitud
  notifyRequestResponse: async (req, res, next) => {
  try {    
    const { 
      eventTitle, 
      eventDate, 
      eventTime, 
      department, 
      requesterName,
      requesterEmail,
      estado,
      adminMessage,
      description
    } = req.body;

    if (!eventTitle || !eventDate || !requesterName || !requesterEmail || !estado) {
      return res.status(400).json({
        success: false,
        message: 'Los campos "eventTitle", "eventDate", "requesterName", "requesterEmail" y "estado" son requeridos'
      });
    }

    // ✅ Restar un día a la fecha y formatear a DD-MM-YYYY
    const adjustDateForN8n = (dateString) => {
      const date = new Date(dateString + 'T12:00:00');
      date.setDate(date.getDate() - 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${day}-${month}-${year}`;
    };

    const adjustedDateForN8n = adjustDateForN8n(eventDate);

    // ✅ Determinar estado y colores
    const isApproved = estado.toLowerCase() === 'aprobado';
    const statusColor = isApproved ? '#28a745' : '#dc3545';
    const statusText = isApproved ? 'APROBADA' : 'RECHAZADA';
    const statusEmoji = isApproved ? '✅' : '❌';

    // ✅ Enviar datos al webhook de n8n
    const n8nPayload = {
      eventTitle,
      eventDate: adjustedDateForN8n,
      eventTime,
      department,
      requesterName,
      requesterEmail,
      estado,
      adminMessage,
      description,
      statusColor,
      statusText,
      statusEmoji
    };

    try {
      const n8nResponse = await axios.post(
        'https://n8n-n8n.3htcbh.easypanel.host/webhook/respuestaccdt',
        n8nPayload
      );
    } catch (n8nError) {
      console.error('❌ Error al enviar datos a n8n:', n8nError.response?.data || n8nError.message);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar datos a n8n',
        error: n8nError.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notificación enviada correctamente a n8n',
      data: {
        recipient: requesterEmail,
        requesterName: requesterName,
        eventTitle: eventTitle,
        estado: estado,
        statusText: statusText,
        adjustedDate: adjustedDateForN8n
      }
    });

  } catch (error) {
    console.error('❌ Error enviando notificación de respuesta:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación',
      error: error.message
    });
  }
}
};

module.exports = eventsController;