const proxyquire = require('proxyquire');
const keepCupTreeGetState = proxyquire('./keepCupTreeGetState', {
  'aws-sdk': AWSMock,
});

describe('keepCupTreeGetState', () => {
  const callbackStub = sinon.stub();
  let clock;

  function getLastResponse() {
    const lastResponse = callbackStub.lastCall.args[1];
    return Object.assign({}, lastResponse, {
      body: JSON.parse(lastResponse.body)
    });
  }

  beforeEach(() => {
    callbackStub.reset();
    clock = sinon.useFakeTimers();

    process.env.SEED = '1';
    process.env.LEAF_HUE = '60';
    process.env.LEAF_COUNT_OFFSET = '0';
    process.env.POWER = '7';
    process.env.TRUNK_SL = '80%,20%';
  });

  afterEach(() => {
    clock.restore();
  });

  describe('callback metadata', () => {
    it('calls the callback with the correct success metadata', () => {
      DynamoDBMock.scan
        .withArgs({ TableName: 'KeepCupTree' })
        .callsArgWith(1, null, {
          Items: [{}]
        });

      keepCupTreeGetState.handler(null, null, callbackStub);
      expect(callbackStub).to.have.been.calledOnce.calledWith(null);

      const response = getLastResponse();
      expect(response).to.contain({
        isBase64Encoded: false,
        statusCode: 200,
      });
      expect(response.headers).to.contain({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      })
    });

    it('calls the callback with the correct error metadata', () => {
      const error = new Error();

      DynamoDBMock.scan
        .withArgs({ TableName: 'KeepCupTree' })
        .callsArgWith(1, error);

      keepCupTreeGetState.handler(null, null, callbackStub);
      expect(callbackStub).to.have.been.calledOnce.calledWith(error);

      const response = getLastResponse();
      expect(response).to.contain({
        isBase64Encoded: false,
        statusCode: 500,
      });
      expect(response.headers).to.contain({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      })
    });
  });

  it('retrieves the data from the database', () => {
    DynamoDBMock.scan
      .withArgs({ TableName: 'KeepCupTree' })
      .callsArgWith(1, null, { Items: [{}] });

    keepCupTreeGetState.handler(null, null, callbackStub);

    const response = getLastResponse();
    expect(response.statusCode).to.eql(200);
    expect(response.body).to.eql({
      ok: true,
      result: {
        seed: 1,
        cupsSaved: 1,
        leafHue: 60,
        power: 7,
        trunkSL: '80%,20%',
      }
    });
  });

  it('handles missing ENV vars', () => {
    delete process.env.SEED;
    delete process.env.LEAF_HUE;
    delete process.env.LEAF_COUNT_OFFSET;
    delete process.env.POWER;
    delete process.env.TRUNK_SL;

    DynamoDBMock.scan
      .withArgs({ TableName: 'KeepCupTree' })
      .callsArgWith(1, null, { Items: [] });

    keepCupTreeGetState.handler(null, null, callbackStub);

    const response = getLastResponse();
    expect(response.body.result).to.eql({
      seed: 1,
      cupsSaved: 0,
      leafHue: 80,
      power: 6,
      trunkSL: '80%,50%',
    });
  });

  it('counts leaves from multiple scans', () => {
    let scanFn;

    // First scan
    keepCupTreeGetState.handler(null, null, callbackStub);

    expect(DynamoDBMock.scan).to.have.been.calledOnce;
    scanFn = DynamoDBMock.scan.lastCall.args[1];
    scanFn(null, {
      Items: [{}, {}, {}],
      LastEvaluatedKey: 2,
    });

    // Second scan
    clock.tick(1);

    expect(DynamoDBMock.scan).to.have.been.calledTwice;
    expect(DynamoDBMock.scan.lastCall.args[0].ExclusiveStartKey).to.eq(2);
    scanFn = DynamoDBMock.scan.lastCall.args[1];
    scanFn(null, {
      Items: [{}, {}],
    });

    // Result
    const response = getLastResponse();
    expect(response.statusCode).to.eql(200);
    expect(response.body).to.eql({
      ok: true,
      result: {
        seed: 1,
        cupsSaved: 5,
        leafHue: 60,
        power: 7,
        trunkSL: '80%,20%',
      }
    });
  });
});
