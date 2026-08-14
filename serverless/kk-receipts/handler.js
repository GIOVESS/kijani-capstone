const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('http');

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.RECEIPTS_BUCKET || 'kijani-payments-receipts-staging';
const PROCESSOR_URL = process.env.PROCESSOR_URL || 'http://localhost:3002/internal/process-receipt';

function notifyProcessor(key) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ Records: [{ s3: { object: { key } } }] });
    const req = https.request(PROCESSOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      console.log(JSON.stringify({ msg: 'processor.notified', key, statusCode: res.statusCode }));
      resolve();
    });
    req.on('error', (err) => {
      console.log(JSON.stringify({ msg: 'processor.notify_failed', key, error: err.message }));
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

module.exports.generateReceipt = async (event) => {
  const body = JSON.parse(event.body);
  const { orderId, amount } = body;

  if (!orderId || amount === undefined) {
    return { statusCode: 400, body: JSON.stringify({ error: 'orderId and amount required' }) };
  }

  const receipt = { orderId, amount, generatedAt: new Date().toISOString() };
  const key = `receipts/${orderId}.json`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(receipt),
    ContentType: 'application/json',
  }));

  console.log(JSON.stringify({ msg: 'receipt.generated', orderId, key }));

  await notifyProcessor(key);

  return { statusCode: 200, body: JSON.stringify({ status: 'ok', key }) };
};
