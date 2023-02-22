export default {
	entries: [
		{
			input: './my-rollup/rollup/rollup',
		}
	],
	rollup: {
		commonjs: true,
		emitCJS: true,
		cjsBridge: true,
	}
};
