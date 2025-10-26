import type { WriteStream } from "node:fs";

export class Logger {
	private stream: WriteStream;

	constructor(stream: WriteStream) {
		this.stream = stream;
	}

	logMessage(
		from: "client" | "server",
		kind: "request" | "notification" | "response",
		method: string,
		body: unknown,
	) {
		this.stream.write(`${JSON.stringify({ from, kind, method, body })}\n`);
	}

	logError(method: string, err: unknown) {
		this.stream.write(`${JSON.stringify({ method, err: String(err) })}\n`);
	}

	write(raw: string | Buffer) {
		this.stream.write(raw);
	}

	close() {
		this.stream.close();
	}
}
