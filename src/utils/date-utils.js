/* eslint-disable no-undef */
/**
 * Get number of days between a previous or future date and current date
 * @param {Object} payload.date - Previous or future date
 * @param {Boolean} payload.previous - A truthy or falsy value to determine whether to get the number of days before or after the current date
 * @param {Object} payload - Object to configure the function
 * @returns {Number}
 */
exports.getNumberOfDays = ({ date, previous }) => {
  const currentDate = new Date();
  const existingDate = new Date(date);
  let timeInMilisec;
  if (previous) {
    timeInMilisec = currentDate.getTime() - existingDate.getTime();
  } else {
    timeInMilisec = existingDate.getTime() - currentDate.getTime();
  }
  return Math.ceil(timeInMilisec / (1000 * 60 * 60 * 24));
};

/**
 * Add days to current date
 * @param {Number} payload.days The number of days to add to the current date
 * @param {Boolean} payload.future A truthy or falsy value to determine wether to add or subtract from the current date
 * @param {Object} payload - Function config
 * @returns {Date}
 */
exports.setDate = ({ days, future }) => {
  const today = new Date();
  let newDate;
  if (future) {
    newDate = today.setDate(today.getDate() + days);
  } else {
    newDate = today.setDate(today.getDate() - days);
  }
  return newDate;
};
