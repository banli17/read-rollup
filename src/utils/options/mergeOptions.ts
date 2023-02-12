import type {
	ExternalOption,
	InputOptions,
	MergedRollupOptions,
	OutputOptions,
	RollupCache,
	RollupOptions,
	WarningHandler
} from '../../rollup/types';
import { ensureArray } from '../ensureArray';
import { URL_OUTPUT_GENERATEDCODE, URL_TREESHAKE } from '../urls';
import type { CommandConfigObject } from './normalizeInputOptions';
import {
	defaultOnWarn,
	generatedCodePresets,
	type GenericConfigObject,
	normalizePluginOption,
	objectifyOption,
	objectifyOptionWithPresets,
	treeshakePresets,
	warnUnknownOptions
} from './options';

export const commandAliases: { [key: string]: string } = {
	c: 'config',
	d: 'dir',
	e: 'external',
	f: 'format',
	g: 'globals',
	h: 'help',
	i: 'input',
	m: 'sourcemap',
	n: 'name',
	o: 'file',
	p: 'plugin',
	v: 'version',
	w: 'watch'
};

const EMPTY_COMMAND_OPTIONS = { external: [], globals: undefined };

export async function mergeOptions(
	config: RollupOptions,
	rawCommandOptions: GenericConfigObject = EMPTY_COMMAND_OPTIONS,
	defaultOnWarnHandler: WarningHandler = defaultOnWarn
): Promise<MergedRollupOptions> {
	const command = getCommandOptions(rawCommandOptions);
	const inputOptions = await mergeInputOptions(config, command, defaultOnWarnHandler);
	const warn = inputOptions.onwarn as WarningHandler;
	if (command.output) {
		Object.assign(command, command.output);
	}
	const outputOptionsArray = ensureArray(config.output);
	if (outputOptionsArray.length === 0) outputOptionsArray.push({});
	const outputOptions = await Promise.all(
		outputOptionsArray.map(singleOutputOptions =>
			mergeOutputOptions(singleOutputOptions, command, warn)
		)
	);

	warnUnknownOptions(
		command,
		[
			...Object.keys(inputOptions),
			...Object.keys(outputOptions[0]).filter(option => option !== 'sourcemapPathTransform'),
			...Object.keys(commandAliases),
			'bundleConfigAsCjs',
			'config',
			'environment',
			'plugin',
			'silent',
			'failAfterWarnings',
			'stdin',
			'waitForBundleInput',
			'configPlugin'
		],
		'CLI flags',
		warn,
		/^_$|output$|config/
	);
	(inputOptions as MergedRollupOptions).output = outputOptions;
	return inputOptions as MergedRollupOptions;
}

function getCommandOptions(rawCommandOptions: GenericConfigObject): CommandConfigObject {
	const external =
		rawCommandOptions.external && typeof rawCommandOptions.external === 'string'
			? rawCommandOptions.external.split(',')
			: [];
	return {
		...rawCommandOptions,
		external,
		globals:
			typeof rawCommandOptions.globals === 'string'
				? rawCommandOptions.globals.split(',').reduce((globals, globalDefinition) => {
						const [id, variableName] = globalDefinition.split(':');
						globals[id] = variableName;
						if (!external.includes(id)) {
							external.push(id);
						}
						return globals;
				  }, Object.create(null))
				: undefined
	};
}

type CompleteInputOptions<U extends keyof InputOptions> = {
	[K in U]: InputOptions[K];
};

async function mergeInputOptions(
	config: InputOptions,
	overrides: CommandConfigObject,
	defaultOnWarnHandler: WarningHandler
): Promise<InputOptions> {
	const getOption = (name: keyof InputOptions): any => overrides[name] ?? config[name];
	const inputOptions: CompleteInputOptions<keyof InputOptions> = {
		acorn: getOption('acorn'),
		acornInjectPlugins: config.acornInjectPlugins as
			| (() => unknown)[]
			| (() => unknown)
			| undefined,
		cache: config.cache as false | RollupCache | undefined,
		context: getOption('context'),
		experimentalCacheExpiry: getOption('experimentalCacheExpiry'),
		external: getExternal(config, overrides),
		inlineDynamicImports: getOption('inlineDynamicImports'),
		input: getOption('input') || [],
		makeAbsoluteExternalsRelative: getOption('makeAbsoluteExternalsRelative'),
		manualChunks: getOption('manualChunks'),
		maxParallelFileOps: getOption('maxParallelFileOps'),
		maxParallelFileReads: getOption('maxParallelFileReads'),
		moduleContext: getOption('moduleContext'),
		onwarn: getOnWarn(config, defaultOnWarnHandler),
		perf: getOption('perf'),
		plugins: await normalizePluginOption(config.plugins),
		preserveEntrySignatures: getOption('preserveEntrySignatures'),
		preserveModules: getOption('preserveModules'),
		preserveSymlinks: getOption('preserveSymlinks'),
		shimMissingExports: getOption('shimMissingExports'),
		strictDeprecations: getOption('strictDeprecations'),
		treeshake: getObjectOption(
			config,
			overrides,
			'treeshake',
			objectifyOptionWithPresets(treeshakePresets, 'treeshake', URL_TREESHAKE, 'false, true, ')
		),
		watch: getWatch(config, overrides)
	};

	warnUnknownOptions(
		config,
		Object.keys(inputOptions),
		'input options',
		inputOptions.onwarn as WarningHandler,
		/^output$/
	);
	return inputOptions;
}

const getExternal = (config: InputOptions, overrides: CommandConfigObject): ExternalOption => {
	const configExternal = config.external;
	return typeof configExternal === 'function'
		? (source: string, importer: string | undefined, isResolved: boolean) =>
				configExternal(source, importer, isResolved) || overrides.external.includes(source)
		: [...ensureArray(configExternal), ...overrides.external];
};

const getOnWarn = (config: InputOptions, defaultOnWarnHandler: WarningHandler): WarningHandler =>
	config.onwarn ? warning => config.onwarn!(warning, defaultOnWarnHandler) : defaultOnWarnHandler;

const getObjectOption = <T extends object>(
	config: T,
	overrides: T,
	name: keyof T,
	objectifyValue = objectifyOption
) => {
	const commandOption = normalizeObjectOptionValue(overrides[name], objectifyValue);
	const configOption = normalizeObjectOptionValue(config[name], objectifyValue);
	if (commandOption !== undefined) {
		return commandOption && { ...configOption, ...commandOption };
	}
	return configOption;
};

export const getWatch = (config: InputOptions, overrides: InputOptions) =>
	config.watch !== false && getObjectOption(config, overrides, 'watch');

export const isWatchEnabled = (optionValue: unknown): boolean => {
	if (Array.isArray(optionValue)) {
		return optionValue.reduce(
			(result, value) => (typeof value === 'boolean' ? value : result),
			false
		);
	}
	return optionValue === true;
};

export const normalizeObjectOptionValue = (
	optionValue: unknown,
	objectifyValue: (value: unknown) => Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
	if (!optionValue) {
		return optionValue as undefined;
	}
	if (Array.isArray(optionValue)) {
		return optionValue.reduce(
			(result, value) => value && result && { ...result, ...objectifyValue(value) },
			{}
		);
	}
	return objectifyValue(optionValue);
};

type CompleteOutputOptions<U extends keyof OutputOptions> = {
	[K in U]: OutputOptions[K];
};

async function mergeOutputOptions(
	config: OutputOptions,
	overrides: OutputOptions,
	warn: WarningHandler
): Promise<OutputOptions> {
	const getOption = (name: keyof OutputOptions): any => overrides[name] ?? config[name];
	const outputOptions: CompleteOutputOptions<keyof OutputOptions> = {
		amd: getObjectOption(config, overrides, 'amd'),
		assetFileNames: getOption('assetFileNames'),
		banner: getOption('banner'),
		chunkFileNames: getOption('chunkFileNames'),
		compact: getOption('compact'),
		dir: getOption('dir'),
		dynamicImportFunction: getOption('dynamicImportFunction'),
		dynamicImportInCjs: getOption('dynamicImportInCjs'),
		entryFileNames: getOption('entryFileNames'),
		esModule: getOption('esModule'),
		experimentalDeepDynamicChunkOptimization: getOption('experimentalDeepDynamicChunkOptimization'),
		experimentalMinChunkSize: getOption('experimentalMinChunkSize'),
		exports: getOption('exports'),
		extend: getOption('extend'),
		externalImportAssertions: getOption('externalImportAssertions'),
		externalLiveBindings: getOption('externalLiveBindings'),
		file: getOption('file'),
		footer: getOption('footer'),
		format: getOption('format'),
		freeze: getOption('freeze'),
		generatedCode: getObjectOption(
			config,
			overrides,
			'generatedCode',
			objectifyOptionWithPresets(
				generatedCodePresets,
				'output.generatedCode',
				URL_OUTPUT_GENERATEDCODE,
				''
			)
		),
		globals: getOption('globals'),
		hoistTransitiveImports: getOption('hoistTransitiveImports'),
		indent: getOption('indent'),
		inlineDynamicImports: getOption('inlineDynamicImports'),
		interop: getOption('interop'),
		intro: getOption('intro'),
		manualChunks: getOption('manualChunks'),
		minifyInternalExports: getOption('minifyInternalExports'),
		name: getOption('name'),
		namespaceToStringTag: getOption('namespaceToStringTag'),
		noConflict: getOption('noConflict'),
		outro: getOption('outro'),
		paths: getOption('paths'),
		plugins: await normalizePluginOption(config.plugins),
		preferConst: getOption('preferConst'),
		preserveModules: getOption('preserveModules'),
		preserveModulesRoot: getOption('preserveModulesRoot'),
		sanitizeFileName: getOption('sanitizeFileName'),
		sourcemap: getOption('sourcemap'),
		sourcemapBaseUrl: getOption('sourcemapBaseUrl'),
		sourcemapExcludeSources: getOption('sourcemapExcludeSources'),
		sourcemapFile: getOption('sourcemapFile'),
		sourcemapPathTransform: getOption('sourcemapPathTransform'),
		strict: getOption('strict'),
		systemNullSetters: getOption('systemNullSetters'),
		validate: getOption('validate')
	};

	warnUnknownOptions(config, Object.keys(outputOptions), 'output options', warn);
	return outputOptions;
}