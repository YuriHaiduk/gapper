import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Icons are generated once from the source SVG and committed to `public/` (SPEC §22):
// `npm run generate-pwa-assets`. Apple and maskable icons get the logo's own dark background
// so iOS and Android masks never show white corners.
const background = '#111111';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, padding: 0.15, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
});
