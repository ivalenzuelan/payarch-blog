import {
	PERSON_EMAIL,
	PERSON_GITHUB_URL,
	PERSON_NAME,
	PERSON_ROLE,
	SITE_DESCRIPTION,
	SITE_KEYWORDS,
	SITE_TITLE,
	SITE_URL,
} from '../consts';

export type BreadcrumbItem = {
	name: string;
	url: string;
};

export type ListItemInput = {
	name: string;
	url: string;
	description?: string;
	datePublished?: Date;
};

export function buildFullTitle(title: string) {
	if (!title.trim()) return SITE_TITLE;
	return title.toLowerCase().includes(SITE_TITLE.toLowerCase()) ? title : `${title} | ${SITE_TITLE}`;
}

export function getAbsoluteUrl(pathOrUrl: string) {
	return new URL(pathOrUrl, SITE_URL).toString();
}

export function mergeKeywords(extraKeywords: string[] = []) {
	return Array.from(new Set([...SITE_KEYWORDS, ...extraKeywords.filter(Boolean)]));
}

export function estimateReadingTime(text: string) {
	const plainText = text
		.replace(/^---[\s\S]*?---/, ' ')
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`[^`]*`/g, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
		.replace(/[#>*_\-\n\r]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	const wordCount = plainText ? plainText.split(' ').length : 0;
	return Math.max(1, Math.ceil(wordCount / 225));
}

export function buildPersonSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: PERSON_NAME,
		url: SITE_URL,
		jobTitle: PERSON_ROLE,
		email: PERSON_EMAIL,
		sameAs: [PERSON_GITHUB_URL],
	};
}

export function buildWebsiteSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_TITLE,
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		inLanguage: 'en-US',
		keywords: mergeKeywords().join(', '),
		publisher: {
			'@type': 'Person',
			name: PERSON_NAME,
			url: SITE_URL,
		},
	};
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

export function buildCollectionPageSchema({
	title,
	description,
	url,
	items,
}: {
	title: string;
	description: string;
	url: string;
	items: ListItemInput[];
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: title,
		description,
		url,
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: items.map((item, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				item: {
					'@type': 'Article',
					'@id': item.url,
					url: item.url,
					name: item.name,
					description: item.description,
					datePublished: item.datePublished?.toISOString(),
				},
			})),
		},
		isPartOf: {
			'@type': 'WebSite',
			name: SITE_TITLE,
			url: SITE_URL,
		},
	};
}

export function buildBlogPostingSchema({
	title,
	description,
	url,
	datePublished,
	dateModified,
	image,
	tags = [],
}: {
	title: string;
	description: string;
	url: string;
	datePublished: Date;
	dateModified?: Date;
	image: string;
	tags?: string[];
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: title,
		description,
		url,
		mainEntityOfPage: url,
		inLanguage: 'en-US',
		datePublished: datePublished.toISOString(),
		dateModified: (dateModified ?? datePublished).toISOString(),
		image: [image],
		keywords: mergeKeywords(tags).join(', '),
		articleSection: tags[0] ?? 'Agentic payments',
		author: {
			'@type': 'Person',
			name: PERSON_NAME,
			url: SITE_URL,
		},
		publisher: {
			'@type': 'Person',
			name: PERSON_NAME,
			url: SITE_URL,
		},
		isPartOf: {
			'@type': 'Blog',
			name: `${SITE_TITLE} blog`,
			url: getAbsoluteUrl('/blog/'),
		},
		about: tags.map((tag) => ({
			'@type': 'Thing',
			name: tag,
		})),
	};
}
