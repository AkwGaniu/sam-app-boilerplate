/*global exports require console process */
const { StatusCodes } = require("http-status-codes");
const validate = require("validate.js");
const errors = require("./errors");

/**
 * Create response to be sent to client
 *
 * @example
 * const error = makeResponse({ error: new Error('new error'), code: 'error-occured', data: { users:[]} })
 * @param {object} responseBody The response to be sent to the client
 * @param {*} responseBody.data - Data to be sent to the client. Can be any value
 * @param {object|null} responseBody.error - error sent to the client
 * @param {string=} responseBody.message - message sent to the client
 * @param {string=} responseBody.code - code sent to the client. Usually used if there is an error
 * @param {Number} statusCode - status code sent to the client. Defaults to 200
 */
exports.makeResponse = (responseBody, statusCode = StatusCodes.OK) => {
  const { error, code, data, message, ...rest } = responseBody;

  const body = {
    data: null,
    error: { name: "", message: "", code: "" },
    message: "",
    status: "",
  };
  let responseStatusCode = statusCode;

  if (error) {
    if (statusCode && statusCode === StatusCodes.OK) {
      responseStatusCode = StatusCodes.INTERNAL_SERVER_ERROR;
      body.error.code = "internal-server-error";
    }

    if (error instanceof errors.ParamMissingError) {
      responseStatusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    }

    if (error instanceof errors.FieldError) {
      responseStatusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    }

    if (error instanceof errors.NotFoundError) {
      responseStatusCode = StatusCodes.NOT_FOUND;
    }

    if (error instanceof errors.QueryError) {
      responseStatusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    }

    if (error instanceof errors.NotSupportedError) {
      responseStatusCode = StatusCodes.NOT_ACCEPTABLE;
    }

    if (error instanceof errors.BadRequestError) {
      responseStatusCode = StatusCodes.BAD_REQUEST;
    }

    if (error.name === "UserNotFoundException") {
      responseStatusCode = StatusCodes.NOT_FOUND;
    }

    if (error.name === "ValidationError") {
      responseStatusCode = StatusCodes.BAD_REQUEST;
    }

    if (error.name === "ConditionalCheckFailedException") {
      responseStatusCode = StatusCodes.BAD_REQUEST;
      error.message =
        "Condition request failed; This resource may not exist in the table";
    }

    if (error.name === "AmbulanceRequestError") {
      responseStatusCode = StatusCodes.BAD_REQUEST;
    }

    if (error.name === "SubscriptionError") {
      responseStatusCode = StatusCodes.BAD_REQUEST;
    }

    body.status = "error";
    body.error.name = error.name;
    body.error.message = error.message || "";
    body.error.code = error.code || code || "error";
    body.message = error.message || "";

    delete body.data; // Remove data object in error responses
  } else {
    body.status = "success";
    body.data = data;
    body.message = message;
    responseStatusCode = StatusCodes.OK;

    delete body.error; // Remove error object in success responses
  }

  return {
    headers: {
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Authorization, Accept, x-www-form-urlencoded, X-Cognito-Issuer, X-API-Key",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
    },
    statusCode: responseStatusCode,
    body: JSON.stringify({ ...rest, ...body }),
  };
};

/**
 * Returns a table name based of the event and the default table name
 * @param {import("aws-lambda").APIGatewayProxyEvent} event
 * @param {string} tableName default name of the table
 * @returns {string} name of the table
 */
exports.getDBTableName = (event, tableName) => {
  const { stage } = event.requestContext;
  if (stage === "prod") {
    return tableName;
  }
  return `${stage}_${tableName}`;
};

/**
 * Check if the required fields exist in the object
 * @param {Array} required Array of required fields
 * @param {object} reqBody Body of the request
 */
exports.checkRequiredValues = (required = [], reqBody) => {
  if (validate.isEmpty(reqBody)) {
    const e = new Error("Body is empty");
    e.name = "ValidationError";
    throw e;
  }

  const params = Object.keys(reqBody).filter((param) => reqBody[param] !== ""); // filter out empty strings

  const missing = required.filter((value) => !params.includes(value));

  if (missing.length) {
    throw new errors.ParamMissingError(missing);
  }

  return reqBody;
};

/**
 * Check if the required fields exist in the object
 * @param {Array} updateable Array of fields that can be updated
 * @param {object} reqBody Body of the request
 */
exports.getUpdateableFields = (updateables = [], reqBody) => {
  if (validate.isEmpty(reqBody)) {
    const e = new Error("Body is empty, no field(s) to update");
    e.name = "ValidationError";
    throw e;
  }

  let newReqBody = {};
  const bodyObjKeys = Object.keys(reqBody);
  updateables.forEach((key) => {
    if (bodyObjKeys.includes(key)) {
      newReqBody[key] = reqBody[key];
    }
  });
  return newReqBody;
};

/**
 * Check if the value of a field is among the possible values for that field
 * @param {string} fieldName name of the field to validate
 * @param {string|Number|Boolean} value value of the field
 * @param {Array<string|Number|Boolean>} possibleValues possible values for the field to check against
 * @returns {Boolean}
 */
exports.checkPossibleValues = (fieldName, value, possibleValues) => {
  const constraints = {
    [fieldName]: {
      inclusion: {
        within: possibleValues,
        message: `^'%{value}' is not a possible value for '${fieldName}'`,
      },
    },
  };
  const result = validate({ [fieldName]: value }, constraints);
  if (result) {
    const message = result[fieldName][0];
    throw new errors.FieldError(message);
  }
  return true;
};

exports.isSupported = this.checkPossibleValues;

/**
 * Detect the stage this function is executed in
 * @param {import("aws-lambda").APIGatewayProxyEvent} event
 * @returns {string} stage of the current event
 */
exports.getStage = (event) => {
  const { stage } = event.requestContext;
  return stage;
};

/**
 * Log event to cloud watch
 * @param {('info'|'error'|'warn')} type type of event
 * @param {string} message
 */
exports.logEvent = (type, message) => {
  if (!process.env.LOCAL) {
    switch (type) {
      case "info":
        console.info(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "error":
        console.error(message);
        break;

      default:
        console.info(message);
        break;
    }
  }
};

/**
 * Parse event query
 * @param {import("aws-lambda").APIGatewayProxyEvent} event
 */
exports.parseEventQueryParams = (event) => {
  const { queryStringParameters } = event;
  if (!queryStringParameters) {
    return { limit: process.env.DB_DEFAULT_LIMIT, start_at: undefined };
  }

  let { limit, start_at, last_key } = queryStringParameters;

  limit = limit ? parseInt(limit) : process.env.DB_DEFAULT_LIMIT;
  start_at = start_at ? JSON.parse(start_at) : undefined;
  last_key = last_key ? JSON.parse(last_key) : undefined;

  return { ...queryStringParameters, limit, start_at, last_key };
};

/**
 * Convert event headers to lowercase
 * @param {import("aws-lambda").APIGatewayProxyEvent} event
 */
exports.parseEventHeaders = (event) => {
  const { headers } = event;
  const headersLowerCase = {};
  Object.keys(headers).forEach((key) => {
    headersLowerCase[key.toLowerCase()] = headers[key];
  });
  return headersLowerCase;
};
