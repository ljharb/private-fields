'use strict';

const hasOwn = require('hasown');
const inspect = require('object-inspect');
const hasPrivateFields = require('has-private-fields')();
const inspector = hasPrivateFields && require('inspector'); // eslint-disable-line global-require

const getThis = function () {
	delete global.$getThis;
	return this; // eslint-disable-line no-invalid-this
};

module.exports = async function getPrivateFields(object) {
	if (!hasPrivateFields) {
		return [];
	}

	const session = new inspector.Session();
	session.connect();

	const post = (command, arg) => new Promise((resolve, reject) => {
		session.post(command, arg, (err, response) => {
			if (err) {
				reject(err);
			} else {
				resolve(response);
			}
		});
	});

	const getReceiver = (objectId) => {
		global.$getThis = getThis;
		return post('Runtime.callFunctionOn', {
			functionDeclaration: '$getThis',
			objectId,
			returnByValue: true,
		});
	};

	global.$object = () => {
		delete global.$object;
		return object;
	};
	const { result: { objectId } } = await post(
		'Runtime.evaluate',
		{ expression: '$object()' },
	);

	const { privateProperties } = await post(
		'Runtime.getProperties',
		{ objectId },
	);

	const properties = await Promise.all((privateProperties || []).map(async (field) => {
		const {
			name,
			get,
			set,
			value: v,
		} = field;

		let value;
		let clonedValue;
		let functionData;
		if (!get && !set) {
			const {
				type,
				description,
				objectId: valueID,
				unserializableValue,
			} = v;

			if (hasOwn(v, 'value')) {
				({ value } = v);
			} else if (hasOwn(v, 'unserializableValue')) {
				if (unserializableValue === 'Infinity') {
					value = Infinity;
				} else if (unserializableValue === '-Infinity') {
					value = -Infinity;
				} else if (unserializableValue === '-0') {
					value = -0;
				} else if (type === 'bigint') {
					value = BigInt(unserializableValue.slice(0, -1));
				} else {
					throw new SyntaxError(`Unknown unserializable value found! Please report this: ${inspect(field)}`);
				}
			} else if (type === 'object') {
				// get a structured clone of the actual private field object value
				const { result } = await getReceiver(valueID);
				({ value: clonedValue } = result);
			} else if (type === 'symbol') {
				// eslint-disable-next-line no-restricted-properties
				clonedValue = Symbol.for(description.slice(7, -1)); // description.slice('Symbol('.length, -')'.length);
			} else if (type === 'function') {
				functionData = { type, description };
			}
		} else {
			/* eslint require-atomic-updates: 0, no-param-reassign: 0 */

			// get a structured clone of the actual private accessor function
			if (get) {
				get.clonedValue = await getReceiver(get.objectId).value;
			}

			if (set) {
				set.clonedValue = await getReceiver(set.objectId).value;
			}
		}
		return {
			name,
			...get && {
				get: {
					type: get.type,
					description: get.description,
				},
			},
			...set && {
				set: {
					type: set.type,
					description: set.description,
				},
			},
			...!get && !set && {
				...clonedValue ? { clonedValue } : functionData || { value },
			},
		};
	}));
	session.disconnect();
	return properties;
};
