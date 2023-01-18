/*global module */

class CustomError extends Error {
  constructor(name, message) {
    super(name, message);
    this.name = name;
    this.message = message;
  }
}

class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "AuthError";
    this.code = `auth/${code}`;
  }
}

class NotFoundError extends CustomError {
  constructor(message) {
    const name = "NotFoundError";
    super(name, message);
  }
}

class QueryError extends CustomError {
  constructor(message) {
    const name = "QueryError";
    super(name, message);
  }
}

class ParamMissingError extends CustomError {
  /**
   * Error thrown for missing parameters
   * @param {Array<string>} params Missing parameters
   */
  constructor(params = []) {
    const message = `Please specify the following parameters in body: ${params.join(
      ", "
    )}`;
    const name = "ParamMissingError";

    super(name, message);
  }
}

class AttributeError extends CustomError {
  /**
   * Error thrown for wrong attribute
   * @param {string} message
   */
  constructor(message) {
    const name = "AttributeError";
    super(name, message);
  }
}

class FieldError extends CustomError {
  constructor(message) {
    const name = "FieldError";
    super(name, message);
  }
}

class NotSupportedError extends CustomError {
  constructor(message) {
    const name = "NotSupportedError";
    super(name, message);
  }
}

class NoAvailableResponder extends CustomError {
  constructor(message) {
    const name = "NoAvailableResponder";
    super(name, message);
  }
}

class NoAvailableHospitalAdmin extends CustomError {
  constructor(message) {
    const name = "NoAvailableHospitalAdmin";
    super(name, message);
  }
}

class ResponderError extends CustomError {
  constructor(message) {
    const name = "ResponderError";
    super(name, message);
  }
}

class BadRequestError extends CustomError {
  constructor(message) {
    const name = "BadRequestError";
    super(name, message);
  }
}

module.exports = {
  AuthError,
  NotFoundError,
  QueryError,
  ParamMissingError,
  FieldError,
  AttributeError,
  NotSupportedError,
  NoAvailableHospitalAdmin,
  NoAvailableResponder,
  ResponderError,
  BadRequestError,
};
