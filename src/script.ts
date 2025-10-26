export type Script = {
	client?: Record<
		string,
		(params: unknown) => Promise<object | unknown[] | undefined>
	>;
	server?: Record<
		string,
		(
			result: unknown,
			originalParams?: unknown,
		) => Promise<object | unknown[] | undefined>
	>;
};

export async function loadScript(scriptPath: string) {
	try {
		const mod = await import(`${scriptPath}?update=${Date.now()}`);
		return {
			client: mod.client ?? {},
			server: mod.server ?? {},
		};
	} catch (err) {
		throw new Error(`Failed to load script from ${scriptPath}: ${err}`);
	}
}
