import Graph from '../Graph';

export default function rollup(rawInputOptions) {
	return rollupInternal(rawInputOptions, null);
}

async function rollupInternal(rawInputOptions, watcher) {
	// 1. 处理输入配置
	const { options: inputOptions } = await getInputOptions(rawInputOptions);

	// 2. 生成 graph
	const graph = new Graph(inputOptions);

	// 3. 调用 graph.build
	await graph.build();

	const result = {
		generate(rawOutputOption) {},
		write(rawOutputOption) {}
	};

	return result;
}

async function getInputOptions(rawInputOptions) {
	const { options } = await normalizeInputOptions(rawInputOptions);
	return {
		options
	};
}

async function normalizeInputOptions(inputOptions) {
	const options
	return options
}
