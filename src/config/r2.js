const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 (API compatible con S3). Se usa para el material didactico:
// archivos grandes (hasta 50MB) que en Supabase Storage consumian el 1GB y el
// egress del plan free. R2 da 10GB y egress $0.
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const R2_BUCKET = process.env.R2_BUCKET || 'ccdt-material';
// URL publica del bucket (dominio propio o el r2.dev del bucket). Sin barra final.
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

const isR2Configured = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);

const r2Client = isR2Configured
    ? new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        // El SDK v3 agrega un checksum CRC32 por defecto. En una URL firmada ese
        // checksum se calcula sobre un body vacio y R2 rechaza el PUT real por
        // mismatch, asi que solo lo mandamos cuando la operacion lo exige.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY
        }
    })
    : null;

module.exports = { r2Client, R2_BUCKET, R2_PUBLIC_URL, isR2Configured };
