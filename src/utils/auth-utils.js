/*global require exports Buffer process */
const AWS = require("../services/aws");
const { promisify } = require("util");
const fetch = require("node-fetch");
const jwkToPem = require("jwk-to-pem");
const jsonwebtoken = require("jsonwebtoken");
const { makeResponse } = require("./lambda");
const { StatusCodes } = require("http-status-codes");
const { generatePassword } = require(".");
const cognito = new AWS.CognitoIdentityServiceProvider();

/**
 * Grant API access to request
 * @param {object} headers Request headers
 */
exports.grantAPIAccess = async (headers) => {
  try {
    const cognitoIssuer = headers["x-cognito-issuer"];
    const authorization = headers["authorization"];

    const token = authorization.split(" ")[1];
    const tokenSections = (token || "").split(".");
    if (tokenSections.length < 2) {
      throw AuthError("invalid_token", "Requested token is incomplete");
    }

    const headerJSON = Buffer.from(tokenSections[0], "base64").toString("utf8");
    const header = JSON.parse(headerJSON);
    const keys = await getPublicKeys(cognitoIssuer);
    const key = keys[header.kid];
    if (key === undefined) {
      throw AuthError("invalid_token", "Claims made for unknown kid");
    }

    const claims = await verifyPromised(token, key.pem);
    return { claims: JSON.stringify(claims) };
  } catch (error) {
    const message = `${error.name} - ${error.message}`;
    if (error.name === "TokenExpiredError")
      throw AuthError("expired_token", message);

    if (error.name === "JsonWebTokenError")
      throw AuthError("invalid_token", message);

    throw error;
  }
};

/**
 * Generate IAM policy to access API
 * @param {string} principalId
 * @param {('Allow'|'Deny')} effect
 * @param {string} resouce The event.methodArn. Set as a default value of '*'.
 * This is a workaround to this [error](https://stackoverflow.com/questions/50331588/aws-api-gateway-custom-authorizer-strange-showing-error)
 * @param {object} context Addition information to add to application
 * @returns {import('aws-lambda').APIGatewayAuthorizerResult}
 */
exports.generatePolicy = function (
  principalId,
  effect,
  resource = "*",
  context = {}
) {
  const authResponse = {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context, // Optional output with custom properties of the String, Number or Boolean type.
  };

  return authResponse;
};

/**
 * Get user claims from the event.requestContext.authorizer
 * User claims require JSON parsing, as it's a stringified JSON object
 * @param {import("aws-lambda").APIGatewayProxyEvent} event
 */
exports.getUserClaims = (event) => {
  const { authorizer } = event.requestContext;
  if (authorizer && authorizer.claims) {
    return JSON.parse(authorizer.claims);
  }

  const e = new Error("No claims found in request");
  e.code = "authorizer_error";
  throw e;
};

/**
 * Get user id from the event.requestContext.authorizer.
 * @param {import("aws-lambda").APIGatewayProxyEvent} event
 */
exports.getUserID = (event) => {
  const { sub } = this.getUserClaims(event);
  return sub;
};

/**
 * Check if user is allowed to access this resource
 * This usually applies to resources specific to a logged in user
 * @param {import("aws-lambda").APIGatewayProxyEvent} event
 * @param {string} userId
 */
exports.isUserAllowed = (event, userId) => {
  const { sub } = this.getUserClaims(event);
  if (sub === userId) return true;

  const error = AuthError(
    "not_allowed",
    `User ${userId} is not the same as user who has a claim to this resource: ${sub}`
  );

  return makeResponse({ error }, StatusCodes.FORBIDDEN);
};

exports.isDispatcher = async (userId) => {
  return cognitoAdminGetUser({ userId }, process.env.DISPATCHER_POOL_ID);
};

exports.isERAAdmin = async (userId) => {
  return cognitoAdminGetUser({ userId }, process.env.ERA_ADMIN_POOL_ID);
};

exports.isResponder = async (userId) => {
  return cognitoAdminGetUser({ userId }, process.env.RESPONDER_POOL_ID);
};

exports.isAmbulanceProvider = async (userId) => {
  return cognitoAdminGetUser(
    { userId },
    process.env.AMBULANCE_PROVIDER_POOL_ID
  );
};

exports.isHospitalAdmin = async (userId) => {
  return cognitoAdminGetUser({ userId }, process.env.HOSPITAL_ADMIN_POOL_ID);
};

exports.isERARegisteredUser = async (userId) => {
  return cognitoAdminGetUser({ userId }, process.env.USER_POOL_ID);
};

exports.hasDispatcherAccess = (event) => {
  const userID = this.getUserID(event);
  return this.isDispatcher(userID);
};

exports.hasAmbulanceProviderAccess = (event) => {
  const userID = this.getUserID(event);
  return this.isAmbulanceProvider(userID);
};

exports.hasAmbulanceProviderResponderAccess = async (event) => {
  const userID = this.getUserID(event);
  return this.isResponder(userID);
};

/**
 * Get user information from cognito user pool
 * @param {object} options
 * @param {string} userId the user pool id
 * @param {string} poolId cognito user pool
 */
const cognitoAdminGetUser = async ({ userId }, poolId) => {
  const user = await cognito
    .adminGetUser({
      UserPoolId: poolId,
      Username: userId,
    })
    .promise();

  switch (user.UserStatus) {
    case "UNCONFIRMED":
      throw AuthError(
        "unconfirmed_user",
        "User has been created but not confirmed"
      );

    case "ARCHIVED":
      throw AuthError("archived_user", "User is no longer active");

    case "COMPROMISED":
      throw AuthError(
        "compromised_user",
        "User is disabled due to a potential security threat."
      );

    case "UNKNOWN":
      throw AuthError("unknown_user", "User status is unknown");

    case "RESET_REQUIRED":
      throw AuthError(
        "reset_required_user",
        "User is confirmed, but the user must request a code and reset his or her password before he or she can sign in"
      );

    case "FORCE_CHANGE_PASSWORD":
      throw AuthError(
        "force_change_password",
        "The user is confirmed and the user can sign in using a temporary password, but on first sign-in, the user must change his or her password to a new value before doing anything else"
      );

    case "CONFIRMED":
      return parseUser(user);

    default:
      throw AuthError("unknown_user", "User status is unknown");
  }
};

/**
 * Create a user in a cognito user pool
 * @param {object} options
 * @param {string} options.email the email of the user
 * @param {string} options.phoneNumber the phone number of the user; may not always be required
 * @param {string} poolId the user pool to create the user in
 */
exports.cognitoAdminCreateUser = async ({ email, phoneNumber }, poolId) => {
  const UserAttributes = [
    {
      Name: "email",
      Value: email,
    },
    {
      Name: "email_verified",
      Value: "True",
    },
  ];

  if (phoneNumber) {
    UserAttributes.push({ Name: "phone_number", Value: phoneNumber });
    UserAttributes.push({ Name: "phone_number_verified", Value: "True" });
  }

  const { User } = await cognito
    .adminCreateUser({
      UserPoolId: poolId,
      Username: email,
      DesiredDeliveryMediums: ["EMAIL", "SMS"],
      UserAttributes,
      TemporaryPassword: generatePassword(),
    })
    .promise();

  return parseUser(User);
};

/**
 * List users in a user pool
 * @param {string} poolId the user pool to create the user in
 */
exports.cognitoAdminListUsers = async (poolId) => {
  let users = [];
  let pagToken;

  const cognitoUsers = await cognito
    .listUsers({
      UserPoolId: poolId,
    })
    .promise();

  users = [...cognitoUsers.Users];
  pagToken = cognitoUsers.PaginationToken;

  // This is to fetch all users from cognito. Cognito only returns maximum of 60 records on each call.
  // this implementation can be improved on later if we consider pagination.
  if (cognitoUsers.Users.length === 60) {
    let n = 0;
    while (n === 0) {
      // eslint-disable-next-line no-await-in-loop
      const newUsers = await cognito
        .listUsers({
          UserPoolId: poolId,
          PaginationToken: pagToken,
        })
        .promise();

      users = [...users, ...newUsers.Users];

      if (newUsers.Users.length < 60) n = 2;

      if (n > 0) break;
    }
  }

  users = users.map((user) => parseUser(user));
  return users;
};

/**
 * Delete a user in a cognito user pool
 * @param {object} options the user pool to create the user in
 * @param {string} options.userId the user pool to create the user in
 * @param {string} poolId the user pool to create the user in
 */
exports.cognitoAdminDeleteUser = async ({ userId }, poolId) => {
  return cognito
    .adminDeleteUser({
      UserPoolId: poolId,
      Username: userId,
    })
    .promise();
};

const getPublicKeys = async (cognitoIssuer) => {
  const url = `${cognitoIssuer}/.well-known/jwks.json`;
  const response = await fetch(url, { method: "get" });
  const publicKeys = await response.json();

  return publicKeys.keys.reduce((total, currentValue) => {
    const pem = jwkToPem(currentValue);
    total[currentValue.kid] = { instance: currentValue, pem };
    return total;
  }, {});
};

const verifyPromised = promisify(jsonwebtoken.verify.bind(jsonwebtoken));

/**
 * Generate Auth Error
 * @param {('invalid_token'|'')} code Error message code
 * @param {string} message Message of the error
 * @returns
 */
const AuthError = (code, message) => {
  const error = new Error(message);
  error.name = "AuthError";
  error.code = `auth/${code}`;
  return error;
};

/**
 * Parse user from cognito response
 * @param {AWS.CognitoIdentityServiceProvider.AdminGetUserResponse|AWS.CognitoIdentityServiceProvider.UserType} User
 */
const parseUser = (User) => {
  const userAttributes = User["UserAttributes"] || User["Attributes"];
  const attributes = _parseUserAttributes(userAttributes);

  return {
    id: attributes.sub,
    username: User.Username,
    attributes,
    status: User.UserStatus,
    enabled: User.Enabled,
    created_at: User.UserCreateDate,
    updated_at: User.UserLastModifiedDate,
  };
};

/**
 * Parse user attributes
 * @param {AWS.CognitoIdentityServiceProvider.AdminGetUserResponse.UserAttributes} Attributes
 */
const _parseUserAttributes = (Attributes) => {
  return Attributes.reduce((acc, item) => {
    acc[item.Name] = item.Value;
    return acc;
  }, {});
};
