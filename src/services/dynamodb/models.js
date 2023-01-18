/*global require exports process */
const {
  UsersSchema
} = require("./schemas");

const stage = process.env.STAGE;

let prefix;
if (stage === "prod") prefix = "";
else if (stage === "staging") prefix = "staging_";
else prefix = "test_";

// Inquiries Model
exports.UsersModel = dynamoose.model(`${prefix}inquiries`, UsersSchema);
