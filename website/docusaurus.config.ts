import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'BlueBubbles CLI',
  tagline: 'Curated terminal UX with generated BlueBubbles API reference',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },
  url: 'https://anmho.github.io',
  baseUrl: '/bluebubbles-cli/',
  organizationName: 'anmho',
  projectName: 'bluebubbles-cli',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          docItemComponent: '@theme/ApiItem',
          editUrl: 'https://github.com/anmho/bluebubbles-cli/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'classic',
        config: {
          bluebubbles: {
            specPath: '../docs/openapi.yaml',
            outputDir: 'docs/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
            },
          },
        },
      },
    ],
  ],
  themes: ['docusaurus-theme-openapi-docs'],
  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'BlueBubbles CLI',
      logo: {
        alt: 'BlueBubbles CLI',
        src: 'img/logo.svg',
      },
      items: [
        {to: '/', label: 'Docs', position: 'left'},
        {to: '/api', label: 'API Reference', position: 'left'},
        {
          href: 'https://github.com/anmho/bluebubbles-cli',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Quickstart', to: '/quickstart'},
            {label: 'CLI Reference', to: '/cli-reference'},
            {label: 'API Reference', to: '/api'},
          ],
        },
        {
          title: 'Project',
          items: [{label: 'GitHub', href: 'https://github.com/anmho/bluebubbles-cli'}],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} BlueBubbles CLI.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
