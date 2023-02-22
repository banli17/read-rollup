import { basename, dirname } from 'path';
import { lstat, readdir, realpath } from './fs';
import { resolve } from './path';

export async function resolveId(
	source,
	importer,
	preserveSymlinks, // 保持维护符号连接
	pluginDriver,
	moduleLoaderResolveId,
	skip,
	customOptions,
	isEntry,
	assertions
) {
	// todo: 插件 resolveId
	// todo: external modules

	// todo: resolve 解析路径正确?? 如果在其他目录运行命令, 入口文件解析是否正确??
	return addJsExtensionIfNecessary(
		importer ? resolve(dirname(importer, source)) : resolve(source), 
		preserveSymlinks // 保持连接
	);
}

// 尝试 链接 -> .mjs -> .js, 不支持 .cjs
async function addJsExtensionIfNecessary(file, preserveSymlinks) {
	return (
		(await findFile(file, preserveSymlinks)) ??
		(await findFile(file + '.mjs', preserveSymlinks)) ??
		(await findFile(file + '.js', preserveSymlinks))
	);
}

// 查找文件, preserveSymlinks 表示是否使用符号链接
async function findFile(file, preserveSymlinks) {
	try {
		const stats = await lstat(file);

		// 寻找真实指向的文件
		if (!preserveSymlinks && stats.isSymbolicLink()) {
			return await findFile(await realpath(file), preserveSymlinks);
		}

		// 使用符号链接，或是文件
		if ((preserveSymlinks && stats.isSymbolicLink()) || stats.isFile()) {
			//
			const name = basename(file);
			const files = await readdir(dirname(file));
			console.log('ggg', files, name)
			if (files.includes(name)) {
				return file;
			}
		}
	} catch {
		// supress
	}
}
