import * as acorn from 'acorn';
import { ModuleLoader } from './ModuleLoader';

// 标准化入口
function normalizeEntryModules(entryModules) {
	// 如果是数组
	if (Array.isArray(entryModules)) {
		return entryModules.map(id => {
			return {
				fileName: null,
				id,
				name: null
			};
		});
	}
	// 如果是对象  {main: 'src/index.js'}
	return Object.entries(entryModules).map(([name, id]) => {
		return {
			fileName: null,
			id, // src/index.js
			name // 入口名 main
		};
	});
}

export default class Graph {
	implicitEntryModules = new Set();
	modulesById = new Map(); // 模块 map
	watchFiles = Object.create(null);
	
	constructor(options) {
		this.options = options;
		this.entryModules = null;
		// this.acornParser = acorn.Parser.extend([])
		this.moduleLoader = new ModuleLoader(this, this.modulesById);
	}

	async build() {
		await this.generateModuleGraph();
	}

	async generateModuleGraph() {
		({ entryModules: this.entryModules, implicitEntryModules: this.implicitEntryModules } =
			await this.moduleLoader.addEntryModules(normalizeEntryModules(this.options.input), true));
	}
}
