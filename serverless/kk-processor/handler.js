const http = require('http');

const NOTIFIER_URL = process.env.NOTIFIER_URL || 'http://localhost:3002/internal/notify-complete';

function notifyComplete(key, orderId) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ key, orderId });
    const req = http.request(NOTIFIER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      console.log(JSON.stringify({ msg: 'notifier.notified', key, statusCode: res.statusCode }));
      resolve();
    });
    req.on('error', (err) => {
      console.log(JSON.stringify({ msg: 'notifier.notify_failed', key, error: err.message }));
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

module.exports.processReceipt = async (event) => {
  console.log(JSON.stringify({ msg: 'processor.received', bodyLength: event.body ? event.body.length : 0 }));

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.log(JSON.stringify({ msg: 'processor.parse_failed', error: err.message }));
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid payload' }) };
  }

  const records = body.Records || [];
  for (const record of records) {
    const key = record.s3 && record.s3.object && record.s3.object.key;
    console.log(JSON.stringify({ msg: 'receipt.processed', key }));
    const orderId = key ? key.replace('receipts/', '').replace('.json', '') : undefined;
    await notifyComplete(key, orderId);
  }

  return { statusCode: 200, body: JSON.stringify({ status: 'ok', recordCount: records.length }) };
};
