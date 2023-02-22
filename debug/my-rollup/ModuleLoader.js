import { resolveId } from './utils/resolveId';
import Module from './Module';

export class ModuleLoader {
	constructor(graph, modulesById, options, pluginDriver) {
		this.graph = graph;
		this.options = options;
		this.modulesById = modulesById;
		this.pluginDriver = pluginDriver;
	}

	// 添加入口模块
	async addEntryModules(unresolvedEntryModules, isUserDefined) {
		const newEntryModules = await this.extendLoadModulesPromise(
			Promise.all(
				unresolvedEntryModules.map(({ id }) => {
					return this.loadEntryModule(id, true);
				})
			).then(entryModules => {})
		);
		return {};
	}

	async extendLoadModulesPromise() {}

	// 加载入口模块
	async loadEntryModule(
		unresolvedId, // 未解析的 id
		isEntry, // 是否是入口
		importer, // 父亲
		implicitlyLoadedBefore
	) {
		// 解析 id
		const resolveIdResult = await resolveId(
			unresolvedId
			// importer,
			// this.options.preserveSymlinks,
			// this.pluginDriver,
			// this.resolveId,
			// null,
			// EMPTY_OBJECT,
			// true,
			// EMPTY_OBJECT
		);

		return this.fetchModule(
			this.getResolvedIdWithDefaults(
				typeof resolveIdResult === 'object' ? resolveIdResult : { id: resolveIdResult }
			),
			undefined,
			isEntry,
			false
		);
	}

	// 创建 module, 并将 module 存入到 Graph modulesById 中
	fetchModule(
		{ assertions, id, meta, moduleSideEffects, syntheticNamedExports },
		importer,
		isEntry,
		isPreload
	) {
		// 缓存模块，防止重复解析
		const existingModule = this.modulesById.get(id);
		if (existingModule instanceof Module) {
		}

		const module = new Module(
			this.graph,
			id,
			this.options,
			isEntry,
			moduleSideEffects,
			syntheticNamedExports,
			meta,
			assertions
		);

		this.modulesById.set(id, module);

		// 添加到 watch 列表中
		this.graph.watchFiles[id] = true;

		const loadPromise =
			//
			this.addModuleSource(id, importer, module)
				//
				.then(() => {
					return [this.getRe];
				});
	}

	addModuleSource(id, importer, module) {}

	getResolvedIdWithDefaults(resolvedId, assertions) {
		if (!resolvedId) {
			return null;
		}
		const external = resolvedId.external || false;

		return {
			assertions: resolvedId.assertions,
			external,
			id: resolveId.id,
			meta: resolveId.meta || {},
			// moduleSideEffects:
			resolvedBy: resolvedId.resolvedBy ?? 'rollup'
			// syntheticNamedExports
		};
	}
}
