const { makeResponse } = require("../utils/lambda");

exports.get = async (event) => {
	try {
		// Some stuffs here
	} catch (error) {
		console.log(error);
		return makeResponse({ error }, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};

exports.list = async (event) => {
	try {
		// Some stuffs here
	} catch (error) {
		console.log(error);
		return makeResponse({ error }, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};

exports.post = async (event) => {
	try {
		// Some stuffs here
	} catch (error) {
		console.log(error);
		return makeResponse({ error }, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};

exports.put = async (event) => {
	try {
		// Some stuffs here
	} catch (error) {
		console.log(error);
		return makeResponse({ error }, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};
