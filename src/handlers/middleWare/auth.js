const { generatePolicy, grantAPIAccess } = require("../../utils/auth-utils");
const { logEvent, parseEventHeaders } = require("../../utils/lambda");
const { setAPICallsmetrics } = require("../metrics/index");

/**
 * Middleware to control access to API.
 *
 * @param {import('aws-lambda').APIGatewayAuthorizerEvent} event
 * @param {import('aws-lambda').APIGatewayAuthorizerWithContextHandler} context
 * @param {import('aws-lambda').APIGatewayAuthorizerCallback} callback
 * @returns {import('aws-lambda').APIGatewayAuthorizerResult}
 */
exports.handler = async (event, context, callback) => {
  const principalId = "client";
  try {
    const headers = parseEventHeaders(event);
    const response = await grantAPIAccess(headers);
    return callback(null, generatePolicy(principalId, "Allow", "*", response));
  } catch (error) {
    logEvent("error", error);
    const denyErrors = ["auth/invalid_token", "auth/expired_token"];

    if (denyErrors.includes(error.code)) {
      // 401 Unauthorized
      return callback("Unauthorized");
    }

    // 403 Forbidden
    return callback(null, generatePolicy(principalId, "Deny"));
  }
};
