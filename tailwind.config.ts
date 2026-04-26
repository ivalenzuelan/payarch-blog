/**
 * Tailwind v3 config — payarch
 * ----------------------------------------------------------------------------
 * All color tokens resolve to CSS custom properties defined in tokens.css.
 * This means dark mode is a single class swap on <html> and never requires
 * Tailwind dark: variants for color (you only need dark: for layout shifts).
 *
 * Usage examples:
 *   <body class="bg-paper text-ink-800">
 *   <a class="text-signal-600 hover:text-signal-700">
 *   <span class="bg-ink-100 text-ink-700">  // tag pill
 *   <div class="border border-hairline">
 *
 * Diagram colors are also exposed as Tailwind utilities so the same vocabulary
 * works in MDX inline elements:
 *   <span class="text-diagram-2">TAP</span>
 *
 * If you're on Tailwind v4, the equivalent goes in @theme inline { ... } in CSS.
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
    './public/**/*.html',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Foundation
        paper: 'var(--paper)',
        'paper-pure': 'var(--paper-pure)',

        ink: {
          100: 'var(--ink-100)',
          200: 'var(--ink-200)',
          300: 'var(--ink-300)',
          400: 'var(--ink-400)',
          500: 'var(--ink-500)',
          700: 'var(--ink-700)',
          800: 'var(--ink-800)',
          900: 'var(--ink-900)',
        },

        // Accent — the ONE color
        signal: {
          100: 'var(--signal-100)',
          200: 'var(--signal-200)',
          500: 'var(--signal-500)',
          600: 'var(--signal-600)',
          700: 'var(--signal-700)',
          DEFAULT: 'var(--signal-600)',
        },

        // Diagram categorical scale
        diagram: {
          1: 'var(--diagram-1)',
          2: 'var(--diagram-2)',
          3: 'var(--diagram-3)',
          4: 'var(--diagram-4)',
          5: 'var(--diagram-5)',
        },

        // Code syntax (rarely used as Tailwind classes — usually applied via
        // Shiki/Prism theme — but exposed for inline annotations)
        code: {
          bg: 'var(--code-bg)',
          fg: 'var(--code-fg)',
          keyword: 'var(--code-keyword)',
          string: 'var(--code-string)',
          number: 'var(--code-number)',
          comment: 'var(--code-comment)',
          function: 'var(--code-function)',
        },

        // Semantic
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },

      borderColor: {
        hairline: 'var(--ink-200)',
        emphasis: 'var(--ink-300)',
      },

      backgroundColor: {
        // Aliases that read well in markup
        page: 'var(--paper)',
        card: 'var(--paper-pure)',
        muted: 'var(--ink-100)',
      },

      boxShadow: {
        card: 'var(--shadow-card)',
      },

      // Typography plugin overrides — forces prose to use the token system
      typography: ({ theme }: { theme: (k: string) => string }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--ink-800)',
            '--tw-prose-headings': 'var(--ink-900)',
            '--tw-prose-lead': 'var(--ink-700)',
            '--tw-prose-links': 'var(--signal-600)',
            '--tw-prose-bold': 'var(--ink-900)',
            '--tw-prose-counters': 'var(--ink-500)',
            '--tw-prose-bullets': 'var(--ink-400)',
            '--tw-prose-hr': 'var(--ink-200)',
            '--tw-prose-quotes': 'var(--ink-700)',
            '--tw-prose-quote-borders': 'var(--ink-300)',
            '--tw-prose-captions': 'var(--ink-500)',
            '--tw-prose-code': 'var(--ink-900)',
            '--tw-prose-pre-code': 'var(--code-fg)',
            '--tw-prose-pre-bg': 'var(--code-bg)',
            '--tw-prose-th-borders': 'var(--ink-300)',
            '--tw-prose-td-borders': 'var(--ink-200)',

            // Link styling: signal blue, underlined, no surprise on hover
            'a': {
              textDecoration: 'underline',
              textDecorationThickness: '1px',
              textUnderlineOffset: '0.2em',
              fontWeight: 'inherit',
            },
            'a:hover': {
              color: 'var(--signal-700)',
              textDecorationThickness: '2px',
            },

            // Code: don't surround inline code with backticks (Tailwind default)
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            'code': {
              fontWeight: '500',
              backgroundColor: 'var(--code-bg)',
              padding: '0.1em 0.35em',
              borderRadius: '3px',
            },
          },
        },
      }),
    },
  },
  plugins: [
    // Add @tailwindcss/typography here in your actual config
  ],
};

export default config;
