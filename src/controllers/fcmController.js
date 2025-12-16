const { messaging } = require('../config/firebase');
const {supabase }= require('../config/supabase');

// Registrar token
exports.registrarToken = async (req, res) => {
  try {
    const { token, ua, plataforma, idLocal, usuario_id, role } = req.body;
    const usuarioId = usuario_id || '0643cac2-fb01-475d-aeee-ea53a81b6445'; 
    
   if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    // Verificar si el token ya existe
    const { data: existente, error: errorBusqueda } = await supabase
      .from('usuarios_tokens_fcm')
      .select('id')
      .eq('token', token)
      .single();

    if (errorBusqueda && errorBusqueda.code !== 'PGRST116') { 
      throw errorBusqueda;
    }

    if (existente) {
      // Actualizar token existente
      const { error: errorUpdate } = await supabase
        .from('usuarios_tokens_fcm')
        .update({
          usuario_id: usuarioId,
          user_agent: ua,
          plataforma: plataforma,
          //id_local: idLocal,
          //empresa_id: req.user.empresaId,
          activo: true,
          fecha_actualizacion: new Date().toISOString(),
          role: role
        })
        .eq('token', token);

      if (errorUpdate) throw errorUpdate;
    } else {
      // Insertar nuevo token
      const { error: errorInsert } = await supabase
        .from('usuarios_tokens_fcm')
        .insert({
          usuario_id: usuarioId,
          token: token,
          user_agent: ua,
          plataforma: plataforma,
         // id_local: idLocal,
          //empresa_id: req.user.empresaId
          role: role,
        });

      if (errorInsert) throw errorInsert;
    }

    res.json({ 
      success: true, 
      message: 'Token registrado correctamente' 
    });
  } catch (error) {
    console.error('Error registrando token:', error);
    res.status(500).json({ error: 'Error al registrar token' });
  }
};

// Eliminar token
exports.eliminarToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const { error } = await supabase
      .from('usuarios_tokens_fcm')
      .update({ activo: false })
      .eq('token', token);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Token eliminado correctamente' 
    });
  } catch (error) {
    console.error('Error eliminando token:', error);
    res.status(500).json({ error: 'Error al eliminar token' });
  }
};

// Suscribir a tema (sin cambios, usa Firebase directamente)
exports.suscribirATema = async (req, res) => {
  try {
    const { tokens, tema } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'Tokens requeridos' });
    }

    if (!tema) {
      return res.status(400).json({ error: 'Tema requerido' });
    }

    const response = await messaging.subscribeToTopic(tokens, tema);

    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: response.errors
    });
  } catch (error) {
    console.error('Error suscribiendo a tema:', error);
    res.status(500).json({ error: 'Error al suscribir a tema' });
  }
};

// Desuscribir de tema (sin cambios, usa Firebase directamente)
exports.desuscribirDeTema = async (req, res) => {
  try {
    const { tokens, tema } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'Tokens requeridos' });
    }

    if (!tema) {
      return res.status(400).json({ error: 'Tema requerido' });
    }

    const response = await messaging.unsubscribeFromTopic(tokens, tema);

    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: response.errors
    });
  } catch (error) {
    console.error('Error desuscribiendo de tema:', error);
    res.status(500).json({ error: 'Error al desuscribir de tema' });
  }
};