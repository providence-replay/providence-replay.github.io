import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  appearance: 'force-auto',
  title: "Providence",
  description: "Providence: An Open-Source Session Replay Tool with AI Integration",
  themeConfig: {
    outline: {
      level: [2, 4],
      label: 'On this page'
    },
    logo: "/logo.png",
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Case Study', link: '/background' },
      { text: 'Team', link: '/team' },
    ],

    sidebar: [
      {
        text: "Case Study",
        collapsed: true,
        items: [
          { 
            text: "Background", 
            link: "/background#introduction",
            collapsed: false,
            items: [
              { text: "Introduction", link: "/background#introduction" },
              { text: "Observability", link: "/background#observability-metrics-for-applications" },
              { text: "Session Replay", link: "/background#session-replay-frontend-observability" },
              { text: "Existing Solutions", link: "/background#providence-vs-existing-session-replay-tools" },
            ]
          },
          { 
            text: "Introducing Providence", 
            link: "/introducing-providence",
            collapsed: true,
            items: [
              { text: "Features", link: "/introducing-providence#core-features-of-providence" },
            ]
          },
          { 
            text: "Building Providence", 
            link: "/building-providence",
            collapsed: true,
            items: [
              { text: "Architecture", link: "/building-providence#architecture" },
              { text: "Backend", link: "/building-providence#backend-architecture" },
              { text: "Frontend", link: "/building-providence#frontend-architecture" },
            ]
        },
        { 
          text: "Design Decisions and Challenges", 
          link: "/design-decisions-and-challenges",
          collapsed: true,
          items: [
          { 
            text: "Design Decisions",
            link: "/design-decisions-and-challenges#design-decisions"
          },
          { 
            text: "Challenges",
            link: "/design-decisions-and-challenges#challenges"
          }]
         },
        { 
          text: "Future Work", 
          link: "/future-work",
          collapsed: true,
          items: [
            {
              text: "Audit Logging",
              link: "/future-work#audit-logging"
            },
            {
              text: "Schema Evolution and Versioning",
              link: "/future-work#schema-evolution-and-versioning"
            },
            {
              text: "Support for More Languages",
              link: "/future-work#support-for-more-languages"
            },
          ]
        },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/providence-replay' }
    ]
  }
})
