// 1. Instalar dependencia
// npm install @sendgrid/mail express

const express = require('express');
const sgMail = require('@sendgrid/mail');

const app = express();
app.use(express.json());

// Configurar SendGrid con tu API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Reemplaza con tu API key real

// Endpoint de prueba para enviar email
app.post('/send-test-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    // Configuración del email
    const msg = {
      to: to || 'valentina.morales.paratore@gmail.com', // Email destino
      from: 'a19morales89@gmail.com', // Debe ser un email verificado en SendGrid
      subject: subject || 'Email de prueba desde mi API',
      text: text || 'Este es un email de prueba enviado desde mi backend con SendGrid',
      html: html || '<p>Este es un <strong>email de prueba</strong> enviado desde mi backend con SendGrid</p>'
    };

    // Enviar el email
    const response = await sgMail.send(msg);
    
    console.log('Email enviado exitosamente:', response[0].statusCode);
    
    res.status(200).json({
      success: true,
      message: 'Email enviado correctamente',
      statusCode: response[0].statusCode
    });

  } catch (error) {
    console.error('Error enviando email:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error al enviar email',
      error: error.message
    });
  }
});

// Endpoint adicional para probar conectividad
app.get('/test', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Ejemplo de uso con Postman:
/*
POST http://localhost:3000/send-test-email
Content-Type: application/json

{
  "to": "tu-email@gmail.com",
  "subject": "Prueba desde Postman",
  "text": "Este email fue enviado desde Postman",
  "html": "<h1>¡Funciona!</h1><p>Email enviado desde Postman correctamente</p>"
}
*/