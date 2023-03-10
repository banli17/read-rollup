const fs = require('node:fs');
const path = require('node:path');
const json = require('@rollup/plugin-json');
const rollup = require('../dist/rollup');

const inputOption = {
	input: './debug/main.js',
	plugins: [json({})]
};
const outputOption = {
	dir: 'debug-dist'
};

(async function () {
	const bundle = await rollup.rollup(inputOption);

	console.log(bundle);
	
	bundle.write(outputOption);
})();
