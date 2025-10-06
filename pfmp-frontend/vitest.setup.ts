import '@testing-library/jest-dom';

const originalFetch = globalThis.fetch?.bind(globalThis);

const interceptedFetch = (async (input: any, init?: RequestInit) => {
	const resource = Array.isArray(input)
		? input[0]
		: typeof input === 'string'
			? input
			: typeof input === 'object' && input !== null && 'url' in input
				? (input as Request).url
				: undefined;

	if (typeof resource === 'string' && resource.startsWith('/src/')) {
		return new Response('export {}\n', {
			status: 200,
			headers: { 'Content-Type': 'application/javascript' },
		});
	}

	if (originalFetch) {
		return originalFetch(input as RequestInfo, init);
	}

	return Promise.resolve(new Response(''));
}) as typeof globalThis.fetch;

globalThis.fetch = interceptedFetch;
if (typeof window !== 'undefined') {
	(window as typeof globalThis).fetch = interceptedFetch;
}
