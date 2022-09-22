# private-fields <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

[![dependency status][deps-svg]][deps-url]
[![dev dependency status][dev-deps-svg]][dev-deps-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

What private fields, methods, or accessors does this class have?

:warning: :rotating_light: :warning: **DISCLAIMER** This capability - observing the existence, name, and in many cases, contents of class private fields/methods/accessors - is not supposed to exist. The inability to in any way interact with private fields is a critical part of their design in the JavaScript language, and is the only thing that makes them truly "private".

This is possible because node, in v12.5+ as of this writing, directly exposes the v8 engine's internal debugger protocol via the core `inspector` module. This should not be exposed to runtime code - it's meant for Chrome's devtools to be able to use, for debugging only. It will not work in any other environment.

Please _do not_ use this for any non-debugging purpose. Private fields, methods, and accessors, just like closed-over variables, variable names, or function argument names, are an _internal implementation detail_, and they can and likely will be changed in a non-semver-major update, because by definition they are not breaking changes - since they're not observable. Consider yourself warned.

*Note*: this package will work down to node v8.3, but private fields support was added in node v12.0, and private methods/accessors were added in node v14.6.

## Getting started

```sh
npm install --save private-fields
```

## Usage/Examples

```js
import getPrivateFields from 'private-fields';
import assert from 'assert';

const objectValue = { a: 1 };
const symbolValue = Symbol.iterator;
class C {
	#x;
	#y = 3;
	#foo() {}
	get #z() {}
	set #z(v) {}

	#object = objectValue;
	#symbol = symbolValue;
}

const fields = await getPrivateFields(new C());
assert.deepEqual(fields, [
	{
		name: '#foo',
		type: 'function',
		description: '#foo() {}', // functions are not provided, but their toString is
	},
	{
		name: '#z',
		get: { type: 'function', description: 'get #z() {}' },
		set: { type: 'function', description: 'set #z(v) {}' },
	},
	{
		name: '#x',
		value: undefined,
	},
	{
		name: '#y',
		value: 3,
	},
	{
		name: '#object',
		clonedValue: { a: 1 },
	},
	{
		name: '#symbol',
		clonedValue: Symbol(Symbol.iterator),
	},
]);

const [, , , , object, symbol] = fields;

assert.notEqual(object, objectValue); // the original object is not provided
assert.deepEqual(object, objectValue); // but its properties are cloned

assert.notEqual(symbol.clonedValue, Symbol.iterator); // symbols are not provided
assert.equal(symbol.description, Symbol.iterator.description); // but a symbol with the same description is
```

## Tests
Simply clone the repo, `npm install`, and run `npm test`

[package-url]: https://npmjs.org/package/private-fields
[npm-version-svg]: https://versionbadg.es/ljharb/private-fields.svg
[deps-svg]: https://david-dm.org/ljharb/private-fields.svg
[deps-url]: https://david-dm.org/ljharb/private-fields
[dev-deps-svg]: https://david-dm.org/ljharb/private-fields/dev-status.svg
[dev-deps-url]: https://david-dm.org/ljharb/private-fields#info=devDependencies
[npm-badge-png]: https://nodei.co/npm/private-fields.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/private-fields.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/private-fields.svg
[downloads-url]: https://npm-stat.com/charts.html?package=private-fields
