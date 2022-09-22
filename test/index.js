'use strict';

const test = require('tape');
const inspect = require('object-inspect');
const hasPrivateFields = require('has-private-fields');
const symbolDescription = require('symbol.prototype.description');
const { hasPrivateMethods, hasPrivateAccessors } = hasPrivateFields;
const v = require('es-value-fixtures');

const getPrivateFields = require('../');

function hasIdentity(value) {
	return value && (typeof value === 'object' || typeof value === 'function' || typeof value === 'symbol');
}

function testField(t, instance, value, name, field, accessorType) {
	if (accessorType || hasIdentity(value)) {
		const expected = typeof value === 'symbol' ? Symbol(symbolDescription(value)) : value;

		const { clonedValue } = field;

		// values with identity
		if (accessorType) {
			t.deepLooseEqual(
				field,
				{
					name,
					[accessorType]: {
						type: 'function',
						description: value,
					},
				},
				`${inspect(instance)} has the expected ${name} private field: set to a ${accessorType} function with toString ${inspect(value)}: ${inspect(expected)}`,
			);
		} else if (typeof value === 'function') {
			t.deepLooseEqual(
				field,
				{
					name,
					type: 'function',
					description: field.description,
				},
				`${inspect(instance)} has the expected ${name} private field: set to a function with toString ${inspect(expected)}`,
			);
			// eslint-disable-next-line prefer-named-capture-group
			t.match(field.description, new RegExp(`#?${value.toString().replace(/([()./])/g, '\\$1')}$`));
		} else {
			t.deepLooseEqual(
				field,
				{
					name,
					clonedValue: field.clonedValue,
				},
				`${inspect(instance)} has the expected ${name} private field: set to a clone of identity-value ${inspect(value)}: ${inspect(expected)}`,
			);

			t.notEqual(clonedValue, value, 'returned value does not have the same identity');

			const expectedTypeof = typeof value === 'function' ? 'object' : typeof clonedValue;
			t.equal(
				typeof clonedValue,
				expectedTypeof,
				`${inspect(clonedValue)} has the expected \`typeof\`: ${inspect(expectedTypeof)}`,
			);
		}

		if (typeof value === 'symbol') {
			t.equal(
				symbolDescription(value),
				symbolDescription(clonedValue),
				`${inspect(clonedValue)} has the same Symbol description as ${inspect(value)}`,
			);
		} else if (!accessorType && clonedValue) {
			t.deepEqual(
				Object.keys(value),
				Object.keys(clonedValue),
				`${inspect(clonedValue)} has the same object keys as ${inspect(value)}`,
			);

			const valueEntriesNoID = Object.entries(value).filter(([, val]) => !hasIdentity(val));
			t.deepEqual(
				valueEntriesNoID.map(([, val]) => val),
				valueEntriesNoID.map(([k]) => clonedValue[k]),
				`${inspect(clonedValue)} has the same non-identity entries as ${inspect(value)}`,
			);

			const valueEntriesWithID = Object.entries(value).filter(([, val]) => hasIdentity(val));
			t.deepEqual(
				valueEntriesWithID.map(() => ({})),
				valueEntriesWithID.map(([k]) => clonedValue[k]),
				`${inspect(clonedValue)} has the same non-identity entries as ${inspect(value)}`,
			);
		}
	} else {
		t.deepEqual(
			field,
			{
				name,
				value,
			},
			`${inspect(instance)} has the expected ${name} private fields: set to non-identity-value ${inspect(value)}`,
		);
		t.equal(field.value, value, 'returned value has the same identity');
	}
}

test('getPrivateFields', async (t) => {
	t.equal(typeof getPrivateFields, 'function', 'is a function');

	const noPrivateFields = [
		{},
		[],
		() => {},
		function () {},
		class {},
		new class {}(),
	];
	for (const x of noPrivateFields) {
		t.deepEqual(await getPrivateFields(x), [], `${inspect(x)} has no private fields`);
	}

	const X = Function('return class X { }')();
	t.deepEqual(await getPrivateFields(X), [], `${inspect(X)} has no private fields`);

	t.test('private fields support', { skip: !hasPrivateFields() }, async (st) => {
		const NoFields = Function(`
            return class NoFields {};
        `)();
		st.deepEqual(await getPrivateFields(new NoFields()), [], `${inspect(NoFields)} instance has no private fields`);

		await Promise.all(v.primitives.concat(
			v.objects,
			{ sentinel: true },
		).map(async (value) => {
			const C = Function('x', `
                return class C {
                    #empty;
                    #x = x;
                };
            `)(value);

			const instance = new C();
			const fields = await getPrivateFields(instance);

			st.equal(fields.length, 2, `${inspect(value)}: 2 fields returned`);
			const [emptyField, xField] = fields;
			st.deepEqual(
				emptyField,
				{
					name: '#empty',
					value: undefined,
				},
				`${inspect(instance)} has the expected #empty private field`,
			);

			testField(st, instance, value, '#x', xField);
		}));

		st.test('private methods', { skip: !hasPrivateMethods() }, async (s2t) => {
			await Promise.all(v.primitives.concat(
				v.objects,
				{ sentinel: true },
			).map(async (value) => {
				const C = Function('x', `
                    return class C {
                        #x = x;
                        #get() { return this.#x; };
                        get() { return this.#x; }; // just to have the similar toString as #get()
                        #y = x;
                    };
                `)(value);

				const instance = new C();
				const fields = await getPrivateFields(instance);

				s2t.equal(fields.length, 3, `${inspect(value)}: 3 private fields returned`);
				const [getMethod, xField, yField] = fields;

				testField(s2t, instance, C.prototype.get, '#get', getMethod);
				testField(s2t, instance, value, '#x', xField);
				testField(s2t, instance, value, '#y', yField);
			}));

			s2t.end();
		});

		st.test('private accessors', { skip: !hasPrivateAccessors() }, async (s2t) => {
			await Promise.all(v.primitives.concat(
				v.objects,
				{ sentinel: true },
			).map(async (value) => {
				const C = Function('x', `
                    return class C {
                        #x = x;
                        get #get() { return x; };
                        set #set(v) { this.#y = v; }
                        #y = x;
                    };
                `)(value);

				const instance = new C();
				const fields = await getPrivateFields(instance);

				s2t.equal(fields.length, 4, `${inspect(value)}: 4 private fields returned`);
				const [getAccessor, setMutator, xField, yField] = fields;

				testField(s2t, instance, value, '#x', xField);
				testField(s2t, instance, value, '#y', yField);
				testField(s2t, instance, 'get #get() { return x; }', '#get', getAccessor, 'get');
				testField(s2t, instance, 'set #set(v) { this.#y = v; }', '#set', setMutator, 'set');
			}));

			s2t.end();
		});
	});
});
