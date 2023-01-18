const dynamoose = require("dynamoose");

const { states } = require("./enums");
const { generateID } = require("../../utils");

const defaults = {
	saveUnknown: false,
	timestamps: {
		createdAt: "createdAt",
		updatedAt: null,
	},
};

// Resuable schema items
/**
 * Set the default value for a given type of string/Number
 * @param {(Number|String|Boolean)} type type of field
 * @param {Object} options
 * @param {Boolean} options.useZero Use 0 for Number types
 * @param {Boolean} options.required is required
 * @param {Boolean} options.default default value
 * @param {Array<string>} options.enumValues enum values if required
 */
const setType = (type, options = {}) => {
	const { useZero, enumValues } = options;
	const required = options.required ? true : false;
	const useNull = options.required ? false : true;

	const defaultSetting = { required };

	switch (type) {
		case Number:
			return {
				type: useNull ? [Number, dynamoose.NULL] : Number,
				default: useZero ? 0 : null,
				enum: enumValues,
				...defaultSetting,
			};

		case String:
			return {
				type: useNull ? [String, dynamoose.NULL] : String,
				default: options.default || null,
				enum: enumValues,
				...defaultSetting,
			};

		case Boolean:
			return { type: Boolean, default: false, ...defaultSetting };

		default:
			return {
				type: [String, dynamoose.NULL],
				default: null,
				enum: enumValues,
				...defaultSetting,
			};
	}
};

// const time_lapsed = { type: Number, default: 0 };
const action_taken = {
	type: Array,
	schema: [{ type: String, enum: caseActionTaken }],
	default: ["other"],
};

// const mutableDateType = [dynamoose.NULL, Number, Date]; // date type that can be null, number or date

exports.UsersSchema = new dynamoose.Schema(
	{
		user_id: { type: String, hashKey: true },
		email: {
			type: String,
			required: true,
			index: {
				global: true,
				name: "email-index",
				rangeKey: "registration_datetime",
				throughput: { read: 1, write: 1 },
			},
		},
		first_name: setType(String, { required: true }),
		last_name: setType(String, { required: true }),
		phone_number: setType(String, { required: true }),
		phone_number_2: setType(String),
		date_of_birth: {
			type: [Number, String],
			default: "null",
			required: false,
		},
		gender: setType(String, { default: "undefined" }),
		subscription_id: {
			type: Number,
			required: true,
			index: {
				global: true,
				name: "subscription_id-index",
				rangeKey: "registration_datetime",
        profile_image_url: setType(String),
				throughput: { read: 1, write: 1 },
			},
		},
		transaction_id: [String, dynamoose.NULL],
		is_subscriber: setType(Boolean),
		subscription_start_date: [Date, dynamoose.NULL],
    subscription_end_date: [Date, dynamoose.NULL],

		registration_datetime_pk: {
			// This field is created to support querying by request create time in a sorted order
			type: String,
			required: true,
			default: "registration_datetime_pk",
			forceDefault: true,
			index: {
				global: true,
				name: "registration_datetime-index",
				rangeKey: "registration_datetime",
				throughput: { read: 1, write: 1 },
			},
		},
		status: {
			type: String,
			enum: ["active", "inactive"],
			default: "active",
		},
	},
	{
		saveUnknown: false,
		timestamps: {
			createdAt: "registration_datetime",
			updatedAt: null,
		},
	}
);

exports.dynamoose = dynamoose;