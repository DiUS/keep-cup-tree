const proxyquire = require('proxyquire');
const keepCupTreeGetState = proxyquire('./keepCupTreeAddLeaf', {
  'aws-sdk': AWSMock,
});

describe('keepCupTreeAddLeaf', () => {

});
