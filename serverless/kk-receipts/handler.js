const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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

module.exports.generateReceipt = async (event) => {
  const body = JSON.parse(event.body);
  const { orderId, amount } = body;

  if (!orderId || amount === undefined) {
    return { statusCode: 400, body: JSON.stringify({ error: 'orderId and amount required' }) };
  }

  const receipt = {
    orderId,
    amount,
    generatedAt: new Date().toISOString(),
  };

  const key = `receipts/${orderId}.json`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(receipt),
    ContentType: 'application/json',
  }));

  console.log(JSON.stringify({ msg: 'receipt.generated', orderId, key }));

  return { statusCode: 200, body: JSON.stringify({ status: 'ok', key }) };
};
