const MP_API = 'https://api.mercadopago.com';
const token = () => process.env.MP_ACCESS_TOKEN;

// Crea una preference de Checkout Pro. Devuelve { id, init_point }.
async function createPreference({ title, amount, externalReference, metadata }) {
  const apiUrl = process.env.API_PUBLIC_URL || 'https://ccdt-back.116.203.244.65.sslip.io';
  const appUrl = process.env.APP_PUBLIC_URL || 'https://ccdt.vercel.app';
  // Incluimos el secret en la URL para que MP lo reenvíe y el webhook pueda validarlo.
  const secretQs = process.env.MP_WEBHOOK_SECRET ? `?secret=${encodeURIComponent(process.env.MP_WEBHOOK_SECRET)}` : '';
  const body = {
    items: [{ title, quantity: 1, unit_price: Number(amount), currency_id: 'ARS' }],
    external_reference: externalReference,
    metadata: metadata || {},
    notification_url: `${apiUrl}/api/webhooks/mercadopago${secretQs}`,
    back_urls: {
      success: `${appUrl}/configuracion?payment=success`,
      failure: `${appUrl}/configuracion?payment=failure`,
      pending: `${appUrl}/configuracion?payment=pending`,
    },
    auto_return: 'approved',
  };
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`MP preference error: ${res.status} ${t}`); }
  const data = await res.json();
  return { id: data.id, init_point: data.init_point };
}

async function getPayment(paymentId) {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${token()}` },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`MP getPayment error: ${res.status} ${t}`); }
  return res.json();
}

// Crea una suscripción (débito automático). Devuelve { id, init_point }.
async function createPreapproval({ reason, amount, frequency, payerEmail, externalReference }) {
  if (!token()) throw new Error('MP_ACCESS_TOKEN no configurado');
  const apiUrl = process.env.API_PUBLIC_URL || 'https://ccdt-back.116.203.244.65.sslip.io';
  const appUrl = process.env.APP_PUBLIC_URL || 'https://ccdt.vercel.app';
  const secretQs = process.env.MP_WEBHOOK_SECRET ? `?secret=${encodeURIComponent(process.env.MP_WEBHOOK_SECRET)}` : '';
  const body = {
    reason,
    external_reference: externalReference,
    payer_email: payerEmail,
    back_url: `${appUrl}/configuracion?sub=success`,
    notification_url: `${apiUrl}/api/webhooks/mercadopago${secretQs}`,
    auto_recurring: {
      frequency,
      frequency_type: 'months',
      transaction_amount: Number(amount),
      currency_id: 'ARS',
    },
    status: 'pending',
  };
  const res = await fetch(`${MP_API}/preapproval`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`MP preapproval error: ${res.status} ${t}`); }
  const data = await res.json();
  return { id: data.id, init_point: data.init_point };
}

async function updatePreapprovalAmount(id, amount) {
  const res = await fetch(`${MP_API}/preapproval/${id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ auto_recurring: { transaction_amount: Number(amount), currency_id: 'ARS' } }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`MP updatePreapproval error: ${res.status} ${t}`); }
  return res.json();
}

async function getPreapproval(id) {
  const res = await fetch(`${MP_API}/preapproval/${id}`, {
    headers: { 'Authorization': `Bearer ${token()}` },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`MP getPreapproval error: ${res.status} ${t}`); }
  return res.json();
}

async function getAuthorizedPayment(id) {
  const res = await fetch(`${MP_API}/authorized_payments/${id}`, {
    headers: { 'Authorization': `Bearer ${token()}` },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`MP getAuthorizedPayment error: ${res.status} ${t}`); }
  return res.json();
}

module.exports = { createPreference, getPayment, createPreapproval, updatePreapprovalAmount, getPreapproval, getAuthorizedPayment };
