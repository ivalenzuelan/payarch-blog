import type { APIRoute } from 'astro';
import { SITE_URL } from '../consts';

export const GET: APIRoute = () => {
	const site = new URL(SITE_URL);
	const body = [
		'User-agent: *',
		'Allow: /',
		'',
		`Sitemap: ${new URL('/sitemap-index.xml', site).toString()}`,
		`Host: ${site.host}`,
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};
