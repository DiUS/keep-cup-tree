const querystring = require('querystring');
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const individualMessages = [
  '@mention your friends next time!',
  'Don\'t forget to post a picture!',
  'Check out our progress at http://keepcuptree.test.dius.com.au'
];

let envVars = { initialised: false };

function isAuthorized(request) {
  return request.token === envVars.slackToken
    || request.token === envVars.tonyToken;
}

function jsonResponse(options) {
  return {
    isBase64Encoded: options.isBase64Encoded || false,
    statusCode: options.statusCode || 200,
    headers: Object.assign({
      'Content-Type': 'application/json'
    }, options.headers),
    body: JSON.stringify(options.body || {})
  };
}

function processEvent(event, context, callback) {
  const request = querystring.parse(event.body);
  console.log('Parsed slack request:', request);

  if (!isAuthorized(request)) {
    callback(null, jsonResponse({
      statusCode: 403,
      body: {
        ok: false,
        result: 'Not authorized'
      }
    }));
    return;
  }

  if (request.channel_name !== 'keep_cup_tree') {
    callback(null, jsonResponse({
      body: {
        ok: false,
        text: 'You can only do that in the #keep_cup_tree channel!'
      }
    }));
    return;
  }

  if (!request.user_name) {
    callback(null, jsonResponse({
      statusCode: 400,
      body: {
        ok: false,
        text: 'Missing required parameter "user_name"'
      }
    }));
    return;
  }

  if (typeof request.text !== 'string') {
    callback(null, jsonResponse({
      statusCode: 400,
      body: {
        ok: false,
        text: 'Missing required parameter "text"'
      }
    }));
    return;
  }

  const drinker = request.user_name;
  const conspirators = [];
  (request.text.match(/@[a-z0-9][a-z0-9._-]+/g) || [])
    .forEach(function (c) {
      const userName = c.substr(1);
      if (userName !== drinker && conspirators.indexOf(userName) < 0) {
        conspirators.push(userName);
      }
    });

  const submissionDate = Date.now()
    + '-'
    + Array.from({ length: 5 }, function () {
      return Math.floor(Math.random() * 16).toString('16');
    }).join('');

  const item = {
    submission_date: { S: submissionDate },
    drinker: { S: drinker },
    conspirators: {
      S: conspirators.length > 0
        ? conspirators.join(',')
        : '[none]'
    }
  };

  if (request.token === envVars.tonyToken) {
    callback(null, jsonResponse({
      body: {
        ok: true,
        text: 'Valid, but testing only',
        item: item
      }
    }));
    return;
  }

  dynamodb.putItem({
    TableName: 'KeepCupTree',
    Item : item
  }, function (err, data) {
    if (err) {
      callback(err, jsonResponse({
        body: {
          text: 'There was a problem saving your entry to the database. Please tell @iknowcss.'
        }
      }));
    } else {
      let bodyText = 'Nice job <@' + drinker + '>! I\'ll add a leaf to the tree. '
        + individualMessages[Math.floor(Math.random() * individualMessages.length)]
      if (conspirators.length > 0) {
        if (conspirators.length === 1) {
          bodyText += ' Don\'t let your friend forget to tell me about theirs!'
        } else {
          bodyText += ' Don\'t let your '
            + conspirators.length
            + ' friends forget to tell me about theirs!';
        }
      }

      callback(null, jsonResponse({
        body: {
          response_type: 'in_channel',
          text: bodyText,
          // "attachments": [
          //   {
          //     "text":"Partly cloudy today and tomorrow"
          //   }
          // ]
        }
      }));
    }
  });
}

const kms = new AWS.KMS();
function decrypt(encrypted) {
  return new Promise((res, rej) => {
    kms.decrypt({ CiphertextBlob: new Buffer(encrypted, 'base64') }, (err, data) => {
      if (err) {
        console.error('Decrypt error:', err);
        rej(err);
      } else {
        res(data.Plaintext.toString('ascii'));
      }
    });
  });
}

exports.handler = (event, context, callback) => {
  if (!envVars.initialised) {
    console.info('Decrypting secrets');
    Promise.all([
      decrypt(process.env.SLACK_TOKEN),
      decrypt(process.env.TONY_TOKEN),
    ])
      .then((values) => {
        envVars = {
          initialised: true,
          slackToken: values[0],
          tonyToken: values[1],
        };
        processEvent(event, context, callback);
      })
      .catch(() => {
        callback(null, jsonResponse({
          statusCode: 500,
          body: {
            ok: false,
            result: 'Could not decrypt secrets',
          }
        }));
      });
  } else {
    processEvent(event, context, callback);
  }
};
