import cjsModule from '../index.js';
import getPrivateFields from 'private-fields';
import * as Module from 'private-fields';
import test from 'tape';

test('default export', async (t) => {
	t.equal(cjsModule, getPrivateFields, 'CJS `module.exports` value is also the default export');
});

test('named exports', async (t) => {
	t.deepEqual(
		Object.keys(Module).sort(),
		['default', 'then'].sort(),
		'has expected named exports',
	);

	t.equal(await Module, getPrivateFields, 'module is a thenable that resolves to the default export');
});
