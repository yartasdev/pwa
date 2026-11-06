import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '@yartasdev/pwa',
  description: 'Generate PWA icons, Apple touch icons and iOS splash screens from a single image.',
  base: '/pwa/',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Options', link: '/options' },
      { text: 'API', link: '/api' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@yartasdev/pwa' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Output', link: '/guide/output' },
          { text: 'Options', link: '/options' },
          { text: 'API', link: '/api' },
          { text: 'Limitations', link: '/limitations' },
          { text: 'Development', link: '/development' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/yartasdev/pwa' }],
    search: { provider: 'local' },
    outline: [2, 3],
    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2026 yartasdev',
    },
  },
});
