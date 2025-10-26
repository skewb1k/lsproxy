import { spawn } from "node:child_process";
import {
	createMessageConnection,
	StreamMessageReader,
	StreamMessageWriter,
} from "vscode-jsonrpc/node";
import type { InitializeParams, InitializeResult } from "vscode-languageserver";
import { createConnection } from "vscode-languageserver/node";
import type { Logger } from "./logger";
import type { Script } from "./script";

export async function runProxy(
	args: string[],
	script: Script | null,
	logger: Logger,
): Promise<number> {
	return new Promise((resolve, reject) => {
		// TODO: handle server errors.
		const serverProc = spawn(args[0] as string, args.slice(1), {
			stdio: ["pipe", "pipe", "inherit"],
		});

		serverProc.on("error", (err) => {
			logger.logError("spawn", err);
			reject(err);
		});

		serverProc.on("exit", (code) => {
			reject(`Server unexpectedly exited with code ${code}`);
		});

		const server = createMessageConnection(
			new StreamMessageReader(serverProc.stdout),
			new StreamMessageWriter(serverProc.stdin),
		);

		const client = createConnection(
			new StreamMessageReader(process.stdin),
			new StreamMessageWriter(process.stdout),
		);

		client.onInitialize(async (params: InitializeParams) => {
			logger.logMessage("client", "request", "initialize", params);
			const handler = script?.client?.initialize;
			if (handler) {
				try {
					params = (await handler(params)) as InitializeParams;
				} catch (err) {
					logger.logError("initialize", err);
				}
			}
			let result = await server.sendRequest("initialize", params);
			const responseHandler = script?.server?.initialize;
			if (responseHandler !== undefined) {
				try {
					result = await responseHandler(result, params);
				} catch (err) {
					logger.logError("initialize", err);
				}
			}
			logger.logMessage("server", "response", "initialize", result);
			return result as InitializeResult;
		});

		client.onRequest(async (method, params) => {
			const handler = script?.client?.[method];
			if (handler) {
				try {
					params = await handler(params);
				} catch (err) {
					logger.logError(method, err);
				}
			}
			logger.logMessage("client", "request", method, params);
			let result = await server.sendRequest(method, params);
			const responseHandler = script?.server?.[method];
			if (responseHandler !== undefined) {
				try {
					result = await responseHandler(result, params);
				} catch (err) {
					logger.logError(method, err);
				}
			}
			logger.logMessage("server", "response", method, result);
			return result;
		});

		client.onNotification(async (method, params) => {
			const handler = script?.client?.[method];
			if (handler) {
				params = await handler(params);
			}
			logger.logMessage("client", "notification", method, params);
			server.sendNotification(method, params);
		});

		client.onInitialized(async (params) => {
			const handler = script?.client?.initialized;
			if (handler) {
				try {
					params = (await handler(params)) as InitializeParams;
				} catch (err) {
					logger.logError("initialized", err);
				}
			}
			logger.logMessage("client", "notification", "initialized", params);
			server.sendNotification("initialized", params);
		});

		client.onShutdown(async () => {
			logger.logMessage("client", "request", "shutdown", null);
			const result = await server.sendRequest("shutdown");
			logger.logMessage("server", "response", "shutdown", result);
		});

		client.onExit(() => {
			logger.logMessage("client", "notification", "exit", null);
			serverProc.kill();
			resolve(0);
		});

		server.onRequest(async (method, params) => {
			logger.logMessage("server", "request", method, params);
			const result = await client.sendRequest(method, params);
			logger.logMessage("client", "response", method, result);
			return result;
		});

		server.onNotification(async (method, params) => {
			const handler = script?.server?.[method];
			if (handler) {
				try {
					params = await handler(params);
				} catch (err) {
					logger.logError(method, err);
				}
			}
			logger.logMessage("server", "notification", method, params);
			client.sendNotification(method, params);
		});

		client.listen();
		server.listen();
	});
}
