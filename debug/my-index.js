const fs = require('node:fs');
const path = require('node:path');
const json = require('@rollup/plugin-json');
const { rollup } = require('./dist/rollup.cjs');

const inputOption = {
	input: path.resolve(__dirname, './main.js'),
	plugins: [json({})]
};
const outputOption = {
	dir: 'debug-dist'
};

(async function () {
	const bundle = await rollup(inputOption);

	bundle.write(outputOption);
})();
