const { supabase } = require('../config/supabase');
const nodemailer = require('nodemailer');

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
  console.log('verificacion')
  if (error) {
    console.error('Error Gmail SMTP:', error);
  } else {
    console.log('Gmail SMTP configurado correctamente');
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
    console.log('Entro a notifyNewRequest');
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

      const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      };

      const formattedDate = formatDate(eventDate);

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
                <div class="value">${formattedDate}</div>
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

      // ✅ ENVIAR CON RESEND (mucho más rápido y confiable)
      const emailPromises = adminEmails.map(email => 
        resend.emails.send({
          from: 'Sistema CCDT <onboarding@resend.dev>', // Email verificado por Resend
          to: email,
          subject: `Nueva solicitud de evento: ${eventTitle}`,
          html: htmlTemplate
        })
      );

      const responses = await Promise.all(emailPromises);
      console.log('Emails enviados:', responses);
      
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
      
      res.status(500).json({
        success: false,
        message: 'Error al enviar notificaciones por email',
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
      estado, // 'aprobado' o 'rechazado'
      adminMessage, // Mensaje opcional del administrador
      description
    } = req.body;

    // Validaciones
    if (!eventTitle || !eventDate || !requesterName || !requesterEmail || !estado) {
      return res.status(400).json({
        success: false,
        message: 'Los campos "eventTitle", "eventDate", "requesterName", "requesterEmail" y "estado" son requeridos'
      });
    }

    // Formatear la fecha de YYYY-MM-DD a DD/MM/YYYY
    const formatDate = (dateString) => {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    };

    const formattedDate = formatDate(eventDate);

    // Determinar el color y mensaje según el estado
    const isApproved = estado.toLowerCase() === 'aprobado';
    const statusColor = isApproved ? '#28a745' : '#dc3545';
    const statusText = isApproved ? 'APROBADA' : 'RECHAZADA';
    const statusEmoji = isApproved ? '✅' : '❌';

    // Template HTML para el email
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Respuesta a tu Solicitud de Evento</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .status-badge { background-color: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 20px; display: inline-block; margin-top: 10px; font-size: 18px; font-weight: bold; }
          .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-row { margin-bottom: 15px; padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid ${statusColor}; }
          .label { font-weight: bold; color: #495057; }
          .value { margin-top: 5px; }
          .message-box { background-color: #fff3cd; padding: 15px; border-radius: 4px; margin-top: 15px; border-left: 4px solid #ffc107; }
          .description-box { background-color: white; padding: 15px; border-radius: 4px; margin-top: 10px; border: 1px solid #dee2e6; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; }
          .greeting { font-size: 16px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusEmoji} Solicitud ${statusText}</h1>
            <div class="status-badge">Tu solicitud ha sido ${estado.toLowerCase()}</div>
          </div>
          
          <div class="content">
            <div class="greeting">
              <p>Hola <strong>${requesterName}</strong>,</p>
              <p>Te informamos que tu solicitud de evento ha sido <strong>${estado.toLowerCase()}</strong>.</p>
            </div>

            <div class="info-row">
              <div class="label">Título del Evento:</div>
              <div class="value"><strong>${eventTitle}</strong></div>
            </div>
            
            <div class="info-row">
              <div class="label">Fecha Solicitada:</div>
              <div class="value">${formattedDate}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Hora:</div>
              <div class="value">${eventTime || 'No especificada'}</div>
            </div>
            
            <div class="info-row">
              <div class="label">Departamento:</div>
              <div class="value">${department || 'No especificado'}</div>
            </div>

            ${description ? `
              <div class="info-row">
                <div class="label">Descripción:</div>
                <div class="description-box">
                  ${description.replace(/\n/g, '<br>')}
                </div>
              </div>
            ` : ''}
            
            ${adminMessage ? `
              <div class="message-box">
                <div class="label">📝 Mensaje del Administrador:</div>
                <div class="value" style="margin-top: 10px;">
                  ${adminMessage.replace(/\n/g, '<br>')}
                </div>
              </div>
            ` : ''}

            ${isApproved ? `
              <div style="background-color: #d4edda; padding: 15px; border-radius: 4px; margin-top: 15px; border-left: 4px solid #28a745;">
                <p style="margin: 0; color: #155724;">
                  <strong>¡Excelente noticia!</strong> Tu evento ha sido confirmado. Por favor, coordina los detalles finales con tu departamento.
                </p>
              </div>
            ` : `
              <div style="background-color: #f8d7da; padding: 15px; border-radius: 4px; margin-top: 15px; border-left: 4px solid #dc3545;">
                <p style="margin: 0; color: #721c24;">
                  Lamentablemente tu solicitud no pudo ser aprobada en esta ocasión. Si tienes dudas, por favor contacta con la administración.
                </p>
              </div>
            `}
            
            <div class="footer">
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
              <p>Este email fue generado automáticamente por el sistema de gestión de eventos CCDT.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email al solicitante usando Nodemailer
    const info = await transporter.sendMail({
      from: '"Sistema CCDT" <comunidadcristianadontorcuato@gmail.com>',
      to: requesterEmail,
      subject: `${statusEmoji} Tu solicitud "${eventTitle}" ha sido ${estado.toLowerCase()}`,
      html: htmlTemplate
    });
    
    res.status(200).json({
      success: true,
      message: 'Notificación enviada correctamente al solicitante',
      data: {
        recipient: requesterEmail,
        requesterName: requesterName,
        eventTitle: eventTitle,
        estado: estado,
        messageId: info.messageId
      }
    });

  } catch (error) {
    console.error('Error enviando notificación de respuesta:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación por email',
      error: error.message
    });
  }
}
};

module.exports = eventsController;