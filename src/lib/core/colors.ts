/**
 * payarch — color tokens for diagram rendering
 * ----------------------------------------------------------------------------
 * Mirror of tokens.css for use in payarch-core diagram generation.
 *
 * Two modes are exported because SVG diagrams are often rendered into BOTH
 * the live site (where CSS custom properties resolve at runtime) AND into
 * static OG images / PDF reports (where CSS variables don't resolve and you
 * need real hex values baked in).
 *
 * Use `cssVars()` for inline SVG embedded in the site — colors then follow
 * the user's light/dark preference automatically.
 *
 * Use `light` or `dark` directly for static exports (OG images, PDF reports,
 * embeds on third-party sites).
 *
 * IMPORTANT: System-to-color assignments are stable across the publication.
 * Once "TAP = diagram-2 (teal)" is established in one post, every subsequent
 * post uses the same mapping. Update SYSTEM_COLORS, not individual diagrams.
 */

export const light = {
  // Foundation
  paper:       '#F8F7F4',
  paperPure:   '#FFFFFF',

  ink: {
    100: '#EEF0F2',
    200: '#DEE1E5',
    300: '#BCC1C8',
    400: '#858B95',
    500: '#5C636E',
    700: '#2A2F37',
    800: '#15181D',
    900: '#0B0D10',
  },

  signal: {
    100: '#E5ECFB',
    200: '#C9D6F7',
    500: '#4673E5',
    600: '#2855D6',
    700: '#1B3FB8',
  },

  diagram: {
    1: '#2855D6',  // signal blue   — primary system in focus
    2: '#00857A',  // deep teal
    3: '#B35C00',  // burnt amber
    4: '#6B3FA0',  // muted violet
    5: '#8C8C8C',  // warm gray     — out-of-scope / disabled
  },

  semantic: {
    success: '#166534',
    warning: '#92400E',
    danger:  '#991B1B',
  },
} as const;

export const dark = {
  paper:       '#0F1115',
  paperPure:   '#15181D',

  ink: {
    100: '#1A1D22',
    200: '#25292F',
    300: '#3A3F47',
    400: '#6B7280',
    500: '#8A929E',
    700: '#B3B9C2',
    800: '#DCE0E6',
    900: '#F2F4F7',
  },

  signal: {
    100: '#15224A',
    200: '#1B3FB8',
    500: '#92AEF5',
    600: '#6E92F0',
    700: '#4673E5',
  },

  diagram: {
    1: '#6E92F0',
    2: '#2DA89B',
    3: '#D08A3D',
    4: '#9777C9',
    5: '#6B7280',
  },

  semantic: {
    success: '#4ADE80',
    warning: '#FBBF24',
    danger:  '#F87171',
  },
} as const;

/**
 * CSS variable references — for SVG embedded inline in the site.
 * Colors will follow the user's theme preference automatically.
 */
export const cssVars = {
  paper:       'var(--paper)',
  paperPure:   'var(--paper-pure)',

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

  signal: {
    100: 'var(--signal-100)',
    200: 'var(--signal-200)',
    500: 'var(--signal-500)',
    600: 'var(--signal-600)',
    700: 'var(--signal-700)',
  },

  diagram: {
    1: 'var(--diagram-1)',
    2: 'var(--diagram-2)',
    3: 'var(--diagram-3)',
    4: 'var(--diagram-4)',
    5: 'var(--diagram-5)',
  },

  semantic: {
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger:  'var(--danger)',
  },
} as const;

/* ============================================================================
 * Stable system → color assignments
 * ----------------------------------------------------------------------------
 * The whole point of having a categorical scale is consistency across posts.
 * Add new entries here as new systems appear in payarch coverage. NEVER
 * reassign an existing entry — readers learn the color vocabulary.
 * ========================================================================= */

export const SYSTEM_COLORS = {
  // Visa stack
  'vic-api':        'diagram-1',  // primary credential lifecycle
  'tap':            'diagram-2',  // cryptographic identity layer
  'vdcap':          'diagram-3',  // economics / interchange
  'visanet':        'diagram-4',  // network routing
  'issuer':         'diagram-4',  // network party (shares hue with visanet)

  // Mastercard stack — distinct from Visa; reuse hues only where roles match
  'agent-pay':      'diagram-1',
  'mastercard-net': 'diagram-4',

  // Cross-rail / protocol
  'ap2':            'diagram-2',
  'x402':           'diagram-3',
  'iso8583':        'diagram-4',  // message format = network layer

  // Roles
  'agent':          'diagram-1',
  'consumer':       'signal',     // the actor with intent — uses accent color
  'merchant':       'diagram-2',
  'acquirer':       'diagram-4',
  'cloudflare':     'diagram-3',  // edge / verifier role

  // Out-of-scope
  'not-in-scope':   'diagram-5',
} as const;

export type SystemKey = keyof typeof SYSTEM_COLORS;

/**
 * Resolve a system name to an actual color value.
 * Pass mode = 'css' for site-embedded SVG; 'light' or 'dark' for static export.
 */
export function colorForSystem(
  system: SystemKey,
  mode: 'css' | 'light' | 'dark' = 'css',
): string {
  const tokenKey = SYSTEM_COLORS[system];
  const palette = mode === 'css' ? cssVars : mode === 'dark' ? dark : light;

  if (tokenKey === 'signal') {
    return palette.signal[600];
  }

  // tokenKey is in form 'diagram-N'
  const n = Number(tokenKey.split('-')[1]) as 1 | 2 | 3 | 4 | 5;
  return palette.diagram[n];
}

/**
 * Diagram-rendering rule: never rely on color alone.
 * Pair every system color with one of these distinguishers so colorblind /
 * grayscale readers can still parse the diagram.
 */
export const SYSTEM_PATTERNS = {
  'vic-api':        { stroke: 'solid',     marker: 'square'   },
  'tap':            { stroke: 'solid',     marker: 'circle'   },
  'vdcap':          { stroke: 'dashed',    marker: 'diamond'  },
  'visanet':        { stroke: 'solid',     marker: 'hexagon'  },
  'issuer':         { stroke: 'solid',     marker: 'hexagon'  },
  'agent-pay':      { stroke: 'solid',     marker: 'square'   },
  'mastercard-net': { stroke: 'solid',     marker: 'hexagon'  },
  'ap2':            { stroke: 'dotted',    marker: 'circle'   },
  'x402':           { stroke: 'dot-dash',  marker: 'diamond'  },
  'iso8583':        { stroke: 'solid',     marker: 'hexagon'  },
  'agent':          { stroke: 'solid',     marker: 'square'   },
  'consumer':       { stroke: 'solid',     marker: 'circle'   },
  'merchant':       { stroke: 'solid',     marker: 'square'   },
  'acquirer':       { stroke: 'solid',     marker: 'hexagon'  },
  'cloudflare':     { stroke: 'dashed',    marker: 'diamond'  },
  'not-in-scope':   { stroke: 'dotted',    marker: 'square'   },
} as const;
