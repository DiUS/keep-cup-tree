const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const awsMockSandbox = sinon.sandbox.create();

chai.use(sinonChai);

global.sinon = sinon;
global.expect = chai.expect;

global.DynamoDBMock = {
  scan: awsMockSandbox.stub(),
};
global.AWSMock = {
  DynamoDB: awsMockSandbox.stub().returns(DynamoDBMock),
};

beforeEach(() => {
  awsMockSandbox.reset();
});