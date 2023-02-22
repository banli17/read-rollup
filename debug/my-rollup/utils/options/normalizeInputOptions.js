export async function normalizeInputOptions(config) {
	const unsetOptions = new Set();

	const context = config.context ?? 'undefined';

	const options = {
		input: getInput(config)
	};

	return {
		options
	};
}

// 将 input 转为数组形式
const getInput = config => {
	const configInput = config.input;
	return configInput == null ? [] : typeof configInput === 'string' ? [configInput] : configInput;
};
