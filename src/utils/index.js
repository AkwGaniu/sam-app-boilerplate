/*global exports require process*/
const ngeohash = require("ngeohash");
const crypto = require("crypto");

/**
 * Generate an ID - which is a series of random characters
 * @param {Number} length - Number of characters in the id
 */
exports.generateID = (length = 16) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Detect stage from the table
 * @param {string} tableName name of the table
 */
exports.detectStageFromTableName = (tableName) => {
  if (tableName.includes("test")) return "test";

  if (tableName.includes("staging")) return "staging";

  return "prod";
};

/**
 * Compute geo hash from latitude and longitude
 * @param {Number|String} lat latitude
 * @param {Number|String} lng longitude
 */
exports.computeGeoHash = (lat, lng) => {
  const precision = process.env.GEOHASH_PRECISION || 8;
  const geohash = ngeohash.encode(lat, lng, precision);

  // geohash_key is required for database searches based on location
  const geohash_key = "geohash_key";
  return { geohash_key, geohash };
};

/**
 *  Check if 2 arrays are equal
 * @param {Array} arr1
 * @param {Array} arr2
 */
exports.isArrayEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }

  return true;
};

/**
 * Sort array by values
 * @param {Array} array Array to sort
 * @returns
 */
exports.sortArray = (array, sortBy) => {
  return array.sort((a, b) => {
    return new Date(b[sortBy]) - new Date(a[sortBy]);
  });
};

/**
 * Generate fake password
 * @param {Number} length - Number of characters in the password
 * @returns {String}
 */
exports.generatePassword = (length = 8) => {
  let charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";

  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
};