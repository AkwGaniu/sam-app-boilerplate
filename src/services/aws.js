/* global require module process */
const AWS = require("aws-sdk");

AWS.config.update({ region: process.env.REGION });
AWS.config.apiVersions = {
  dynamodb: "2012-08-10",
  apigateway: "2015-07-09",
  apigatewaymanagementapi: "2018-11-29",
};

module.exports = AWS;
