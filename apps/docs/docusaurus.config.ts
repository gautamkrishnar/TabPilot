import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  title: "Tab Pilot Docs",
  tagline: "Real-time tab sync for engineering grooming",
  favicon: "img/logo.svg",

  url: "https://tabpilot.gkr.pw",
  baseUrl: "/docs/",

  organizationName: "gautamkrishnar",
  projectName: "tabpilot",
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/gautamkrishnar/tabpilot/tree/master/apps/docs/",
          routeBasePath: "/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/logo.svg",
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Tab Pilot",
      logo: {
        alt: "Tab Pilot Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://github.com/gautamkrishnar/tabpilot",
          position: "right",
          className: "header-github-link",
          "aria-label": "GitHub repository",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Introduction",
              to: "/",
            },
            {
              label: "Quick Start",
              to: "/self-hosting/quickstart",
            },
            {
              label: "Configuration",
              to: "/configuration/environment-variables",
            },
          ],
        },
        {
          title: "Product",
          items: [
            {
              label: "Try Tab Pilot Free",
              href: "https://tabpilot.gkr.pw/",
            },
            {
              label: "GitHub",
              href: "https://github.com/gautamkrishnar/tabpilot",
            },
          ],
        },
        {
          title: "Legal",
          items: [
            {
              label: "GPL-3.0 License",
              href: "https://github.com/gautamkrishnar/tabpilot/blob/master/LICENSE",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Tab Pilot. Built with Docusaurus. Released under GPL-3.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "yaml", "nginx", "json", "typescript"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
