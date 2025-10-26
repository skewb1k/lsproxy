#!/usr/bin/env bun

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { Logger } from "./logger";
import { runProxy } from "./proxy";
import { loadScript } from "./script";

type Flags = {
	scriptPath: string | null;
};

// Parses command-line flags. `args` array is left with only positional arguments.
function parseFlags(args: string[]): Flags {
	const flags: Flags = { scriptPath: null };
	while (args.length > 0) {
		if (args[0] === "-s") {
			args.shift();
			flags.scriptPath = args.shift() ?? null;
			if (!flags.scriptPath) {
				throw new Error("Missing value after -s");
			}
			continue;
		}
		break;
	}
	if (args.length === 0) {
		throw new Error("No command given to run");
	}
	return flags;
}

async function main(): Promise<number> {
	let exitCode = 0;

	const home = process.env.HOME;
	if (!home) throw new Error("failed to get $HOME");

	const stateHome = join(home, ".local", "state");

	const logDir = join(stateHome, "lsproxy");
	await mkdir(logDir, { recursive: true });
	const logPath = join(logDir, "log.json");
	const logStream = createWriteStream(logPath, { flags: "a" });
	const logger = new Logger(logStream);

	try {
		const args = process.argv.slice(2);
		let { scriptPath } = parseFlags(args);
		if (scriptPath === null) {
			scriptPath = join(home, ".config", "lsproxy", "script.js");
		}
		const script = scriptPath ? await loadScript(scriptPath) : null;
		exitCode = await runProxy(args, script, logger);
	} catch (err) {
		console.log(String(err));
		exitCode = 1;
	}

	logger.close();
	return exitCode;
}

process.exit(await main());
