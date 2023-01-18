/* global require module process */
const { generateID } = require("../../utils");
const AWS = require("../aws");
const schemas = require("./schemas");

/**
 * Initialize dynamodb document client
 * @returns {import("aws-sdk").DynamoDB.DocumentClient}
 */
const initDB = () => new AWS.DynamoDB.DocumentClient();

/**
 * Set the table name with the appropriate prefix
 * Particularly used when using a query directly
 * @param {string} table name of the table
 */
const setTableName = (table) => {
  const stage = process.env.STAGE;

  let prefix;
  if (stage === "prod") prefix = "";
  else if (stage === "staging") prefix = "staging_";
  else prefix = "test_";

  return `${prefix}${table}`;
};

/**
 * A condition to check if the item exits in the table
 * @param {string} hashKeyName name of the hash key or id
 * @example { condition: itemExistsInTable("hospital_id") }
 *
 */
const itemExistsInTable = (hashKeyName) => {
  return new schemas.dynamoose.Condition().attribute(hashKeyName).exists();
};

const generateKeyID = () => `cas-${generateID()}`;

module.exports = {
	initDB,
	setTableName,
	itemExistsInTable,
	generateKeyID,
};
