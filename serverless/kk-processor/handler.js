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
  }

  return { statusCode: 200, body: JSON.stringify({ status: 'ok', recordCount: records.length }) };
};
