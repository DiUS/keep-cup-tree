const querystring = require('querystring');
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const getEnvVars = () => ({
  seed: parseInt(process.env.SEED, 10) || 1,
  leafHue: parseInt(process.env.LEAF_HUE || 80, 10),
  leafCountOffset: parseInt(process.env.LEAF_COUNT_OFFSET, 10) || 0,
  power: parseInt(process.env.POWER || 6, 10),
  trunkSL: process.env.TRUNK_SL || '80%,50%',
  dynamoTableName: process.env.DYNAMO_TABLE_NAME || 'KeepCupTree',
});

const jsonResponse = options => ({
  isBase64Encoded: options.isBase64Encoded || false,
  statusCode: options.statusCode || 200,
  headers: Object.assign({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }, options.headers),
  body: JSON.stringify(options.body || {}),
});

exports.handler = (event, context, callback) => {
  const envVars = getEnvVars();
  const scanParams = { TableName: envVars.dynamoTableName };

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
          seed: envVars.seed,
          cupsSaved: finalCount - envVars.leafCountOffset,
          leafHue: envVars.leafHue,
          power: envVars.power,
          trunkSL: envVars.trunkSL,
        }
      }
    }));
  }

  dynamodb.scan(scanParams, scan);
};