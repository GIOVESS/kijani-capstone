module.exports.notifyComplete = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.log(JSON.stringify({ msg: 'notifier.parse_failed', error: err.message }));
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid payload' }) };
  }

  const { key, orderId } = body;
  console.log(JSON.stringify({ msg: 'chain.complete', orderId, key }));

  return { statusCode: 200, body: JSON.stringify({ status: 'ok', notified: true }) };
};
