const { supabase } = require('../config/supabase');
const sgMail = require('@sendgrid/mail');

// Configurar SendGrid con tu API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

  // POST /api/events/send-email - Endpoint genérico para enviar emails
  sendEmail: async (req, res, next) => {
    try {
      const { to, subject, text, html } = req.body;

      // Validar datos requeridos
      if (!to || !subject) {
        const validationError = new Error('Los campos "to" y "subject" son requeridos');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Configuración del email
      const msg = {
        to: to,
        from: process.env.SENDGRID_FROM_EMAIL || 'a19morales89@gmail.com',
        subject: subject,
        text: text || 'Email enviado desde el sistema de solicitudes',
        html: html || `<p>${text || 'Email enviado desde el sistema de solicitudes'}</p>`
      };

      // Enviar el email
      const response = await sgMail.send(msg);
      
      console.log('Email enviado exitosamente:', response[0].statusCode);
      
      res.status(200).json({
        success: true,
        message: 'Email enviado correctamente',
        statusCode: response[0].statusCode,
        data: {
          messageId: response[0].headers['x-message-id'],
          to: to,
          subject: subject
        }
      });

    } catch (error) {
      console.error('Error enviando email:', error);
      
      // Manejar errores específicos de SendGrid
      if (error.response) {
        const { message, code } = error.response.body.errors[0] || {};
        return res.status(400).json({
          success: false,
          message: 'Error de SendGrid al enviar email',
          error: message || error.message,
          code: code
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno al enviar email',
        error: error.message
      });
    }
  },

  // POST /api/events/notify-new-request - Endpoint específico para notificar nueva solicitud
  notifyNewRequest: async (req, res, next) => {
    try {
      const { 
        eventTitle, 
        eventDate, 
        eventTime, 
        department, 
        requesterName, 
        description,
        adminEmails = [
          process.env.ADMIN_EMAIL || 'admin@tudominio.com'
        ]
      } = req.body;

      if (!eventTitle || !eventDate || !requesterName) {
        const validationError = new Error('Los campos "eventTitle", "eventDate" y "requesterName" son requeridos');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      // Template HTML para el email
      const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Nueva Solicitud de Evento</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
            .info-row { margin-bottom: 15px; padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #007bff; }
            .label { font-weight: bold; color: #495057; }
            .value { margin-top: 5px; }
            .description-box { background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px; border: 1px solid #dee2e6; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nueva Solicitud de Evento</h1>
              <p>Se ha registrado una nueva solicitud que requiere tu aprobación</p>
            </div>
            
            <div class="content">
              <div class="info-row">
                <div class="label">Título del Evento:</div>
                <div class="value"><strong>${eventTitle}</strong></div>
              </div>
              
              <div class="info-row">
                <div class="label">Fecha Solicitada:</div>
                <div class="value">${eventDate}</div>
              </div>
              
              <div class="info-row">
                <div class="label">Hora:</div>
                <div class="value">${eventTime || 'No especificada'}</div>
              </div>
              
              <div class="info-row">
                <div class="label">Departamento:</div>
                <div class="value">${department || 'No especificado'}</div>
              </div>
              
              <div class="info-row">
                <div class="label">Solicitante:</div>
                <div class="value">${requesterName}</div>
              </div>
              
              ${description ? `
                <div class="info-row">
                  <div class="label">Descripción:</div>
                  <div class="description-box">
                    ${description.replace(/\n/g, '<br>')}
                  </div>
                </div>
              ` : ''}
              
              <div class="footer">
                <p><strong>Acción requerida:</strong> Ingresa al sistema para revisar y aprobar/rechazar esta solicitud.</p>
                <p>Este email fue generado automáticamente por el sistema de gestión de eventos.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `Nueva Solicitud de Evento

Título: ${eventTitle}
Fecha: ${eventDate}
Hora: ${eventTime || 'No especificada'}
Departamento: ${department || 'No especificado'}
Solicitante: ${requesterName}

${description ? `Descripción: ${description}` : ''}

Esta solicitud requiere tu aprobación. Ingresa al sistema para revisarla.`;

      // Enviar email a todos los administradores
      const emailPromises = adminEmails.map(email => 
        sgMail.send({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'a19morales89@gmail.com',
          subject: `Nueva solicitud de evento: ${eventTitle}`,
          text: textContent,
          html: htmlTemplate
        })
      );

      const responses = await Promise.all(emailPromises);
      
      console.log(`Emails enviados exitosamente a ${adminEmails.length} administradores`);
      
      res.status(200).json({
        success: true,
        message: 'Notificaciones enviadas correctamente',
        data: {
          emailsSent: adminEmails.length,
          recipients: adminEmails,
          eventTitle: eventTitle
        }
      });

    } catch (error) {
      console.error('Error enviando notificaciones:', error);
      
      // Si hay error de SendGrid, registrarlo pero no fallar la creación del evento
      if (error.response) {
        console.error('SendGrid error:', error.response.body);
      }
      
      res.status(500).json({
        success: false,
        message: 'Error al enviar notificaciones por email',
        error: error.message
      });
    }
  }
};

module.exports = eventsController;