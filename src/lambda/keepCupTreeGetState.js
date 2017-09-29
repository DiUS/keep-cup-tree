const querystring = require('querystring');
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

function jsonResponse(options) {
  return {
    isBase64Encoded: options.isBase64Encoded || false,
    statusCode: options.statusCode || 200,
    headers: Object.assign({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }, options.headers),
    body: JSON.stringify(options.body || {})
  };
}

exports.handler = (event, context, callback) => {
  const scanParams = { TableName: 'KeepCupTree' };

  let finalCount = 0;
  function scan(err, data) {
    if (err) {
      callback(err, jsonResponse({
        statusCode: 500,
        body: { ok: false, result: 'Could not load data' }
      }));
      return;
    }

    if (data.Items.length > 0) {
      finalCount += data.Items.length;
      if (data.LastEvaluatedKey) {
        scanParams.ExclusiveStartKey = data.LastEvaluatedKey;
        setTimeout(function () {
          dynamodb.scan(scanParams, scan);
        });
        return;
      }
    }

    callback(err, jsonResponse({
      body: {
        ok: true,
        result: {
          seed: parseInt(process.env.SEED, 10),
          cupsSaved: finalCount - 128, // 1st tree done
          leafHue: parseInt(process.env.LEAF_HUE || 80, 10),
          power: parseInt(process.env.POWER || 6, 10),
          trunkSL: process.env.TRUNK_SL || '80%,50%'
        }
      }
    }));
  }

  dynamodb.scan(scanParams, scan);
};