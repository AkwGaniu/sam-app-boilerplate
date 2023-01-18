const { makeResponse } = require("../utils/lambda");

exports.get = async (event) => {
	try {
		// Some stuffs here
		console.log("=====>", 'we got here')

		return makeResponse({ message: "Success" }, StatusCodes);
	} catch (error) {
		console.log(error);
		return makeResponse({ error });
	}
};

exports.list = async (event) => {
	try {
		// Some stuffs here
		console.log("=====>", "we got here");
	} catch (error) {
		console.log(error);
	}
};

exports.post = async (event) => {
	try {
		// Some stuffs here
	} catch (error) {
		console.log(error);
	}
};

exports.delete = async (event) => {
	try {
		// Some stuffs here
	} catch (error) {
		console.log(error);
	}
};
