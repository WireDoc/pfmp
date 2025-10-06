import '@testing-library/jest-dom';

const originalFetch = global.fetch.bind(global);

global.fetch = (async (input: any, init?: RequestInit) => {
	if (Array.isArray(input)) {
		const [resource] = input;
		if (typeof resource === 'string' && resource.startsWith('/src/')) {
			return new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
		}
	}
	return originalFetch(input as RequestInfo, init);
}) as typeof global.fetch;
