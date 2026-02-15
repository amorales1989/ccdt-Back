const { messaging } = require('../config/firebase');
const { supabase } = require('../config/supabase');
const MonitorService = require('./monitorService');

class NotificationService {
  // Enviar a un usuario específico por su ID
  async enviarAUsuario(usuarioId, notification, data = {}, link = '/') {
    try {

      // Obtener tokens activos del usuario
      const { data: rows, error } = await supabase
        .from('usuarios_tokens_fcm')
        .select('token')
        .eq('usuario_id', usuarioId)
        .eq('activo', true);

      if (error) throw error;

      const tokens = rows.map(r => r.token);

      if (tokens.length === 0) {
        console.log('⚠️ No hay tokens disponibles para el usuario:', usuarioId);
        return { success: false, message: 'Usuario no tiene dispositivos registrados' };
      }

      return await this.enviarMultiple(tokens, notification, data, link);
    } catch (error) {
      console.error('Error enviando a usuario:', error);
      throw error;
    }
  }
  // Enviar a empresa
  async enviarAEmpresa(empresaId, notification, data = {}, link = '/') {
    try {
      const { data: rows, error } = await supabase
        .from('usuarios_tokens_fcm')
        .select('token')
        .eq('empresa_id', empresaId)
        .eq('activo', true);

      if (error) throw error;

      const tokens = rows.map(r => r.token);

      if (tokens.length === 0) {
        console.log('No hay tokens para la empresa:', empresaId);
        return { success: false, message: 'No hay dispositivos registrados' };
      }

      return await this.enviarMultiple(tokens, notification, data, link);
    } catch (error) {
      console.error('Error enviando a empresa:', error);
      throw error;
    }
  }

  // Enviar a local específico
  async enviarALocal(localId, notification, data = {}, link = '/') {
    try {
      const { data: rows, error } = await supabase
        .from('usuarios_tokens_fcm')
        .select('token')
        .eq('id_local', localId)
        .eq('activo', true);

      if (error) throw error;

      const tokens = rows.map(r => r.token);

      if (tokens.length === 0) {
        console.log('No hay tokens para el local:', localId);
        return { success: false, message: 'No hay dispositivos registrados' };
      }

      return await this.enviarMultiple(tokens, notification, data, link);
    } catch (error) {
      console.error('Error enviando a local:', error);
      throw error;
    }
  }

  // Enviar a un tema (sin cambios)
  async enviarATema(tema, notification, data = {}, link = '/') {
    try {
      const message = {
        topic: tema,
        notification: {
          title: notification.titulo || notification.title,
          body: notification.cuerpo || notification.body
        },
        data: {
          ...data,
          tipo: data.tipo || 'general'
        },
        webpush: {
          fcmOptions: {
            link
          }
        }
      };

      const response = await messaging.send(message);

      // Monitorización
      await MonitorService.logNotification(`Topic: ${tema}`, 'success');

      return {
        success: true,
        messageId: response
      };
    } catch (error) {
      console.error('Error enviando a tema:', error);
      await MonitorService.logNotification(`Topic: ${tema}`, 'failure', error.message);
      throw error;
    }
  }

  // Enviar a usuarios por rol
  async enviarPorRol(rol, notification, data = {}, link = '/') {
    try {

      // Obtener tokens activos de usuarios con ese rol
      const { data: rows, error } = await supabase
        .from('usuarios_tokens_fcm')
        .select('token')
        .eq('role', rol)
        .eq('activo', true);

      if (error) throw error;

      const tokens = rows.map(r => r.token);

      if (tokens.length === 0) {
        console.log('⚠️ No hay tokens disponibles para el rol:', rol);
        return { success: false, message: 'No hay dispositivos registrados' };
      }

      return await this.enviarMultiple(tokens, notification, data, link);
    } catch (error) {
      console.error('Error enviando a usuarios por rol:', error);
      throw error;
    }
  }

  // Enviar a múltiples tokens
  async enviarMultiple(tokens, notification, data = {}, link = '/') {
    try {
      const batchSize = 500;
      const batches = [];

      for (let i = 0; i < tokens.length; i += batchSize) {
        batches.push(tokens.slice(i, i + batchSize));
      }

      const results = [];

      for (const batch of batches) {
        const message = {
          tokens: batch,
          notification: {
            title: notification.titulo || notification.title,
            body: notification.cuerpo || notification.body
          },
          data: {
            ...data,
            tipo: data.tipo || 'general',
            ...Object.keys(data).reduce((acc, key) => {
              acc[key] = String(data[key]);
              return acc;
            }, {})
          },
          webpush: {
            fcmOptions: {
              link
            }
          }
        };

        const response = await messaging.sendEachForMulticast(message);

        results.push(response);

        // Manejar tokens inválidos
        if (response.failureCount > 0) {
          const tokensInvalidos = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              tokensInvalidos.push(batch[idx]);
              console.error('Error en token:', batch[idx], resp.error);
            }
          });

          // Marcar tokens inválidos como inactivos en Supabase
          if (tokensInvalidos.length > 0) {
            const { error } = await supabase
              .from('usuarios_tokens_fcm')
              .update({ activo: false })
              .in('token', tokensInvalidos);

            if (error) {
              console.error('Error marcando tokens como inactivos:', error);
            }
          }
        }
      }

      const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
      const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0);

      console.log(`Notificaciones enviadas: ${totalSuccess} exitosas, ${totalFailure} fallidas`);

      // Monitorización
      if (totalFailure > 0) {
        await MonitorService.logNotification(data.tipo || 'multiple', 'partial_failure', `Éxito: ${totalSuccess}, Fallo: ${totalFailure}`);
      } else {
        await MonitorService.logNotification(data.tipo || 'multiple', 'success', `Total: ${totalSuccess}`);
      }

      return {
        success: true,
        successCount: totalSuccess,
        failureCount: totalFailure
      };
    } catch (error) {
      console.error('Error enviando notificaciones múltiples:', error);
      await MonitorService.logNotification(data.tipo || 'error_catch', 'failure', error.message);
      throw error;
    }
  }
}

module.exports = new NotificationService();