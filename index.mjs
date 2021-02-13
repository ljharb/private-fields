import getPrivateFields from './index.js';

export function then(resolve) {
	return resolve(getPrivateFields);
}

export default getPrivateFields;
