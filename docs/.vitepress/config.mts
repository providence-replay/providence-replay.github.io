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
            text: "Providence", 
            link: "/introducing-providence",
            collapsed: true,
            items: [
              { text: "Features", link: "/introducing-providence#core-features-of-providence" },
            ]
          },
          { 
            text: "Architecture", 
            link: "/building-providence",
            collapsed: true,
            items: [
              { text: "Agent", link: "/building-providence#agent-sending-session-data-to-providence" },
              { text: "Backend", link: "/building-providence#providence-backend-architecture" },
              { text: "Dashboard", link: "/building-providence#providence-s-dashboard" },
            ]
        },
        { 
          text: "Design Decisions and Challenges", 
          link: "/design-decisions-and-challenges",
          collapsed: true,
          items: [
          { text: "Precomputing Summaries", link: "/design-decisions-and-challenges#precomputing-summaries"},
          { text: "Increasing Context for AI", link: "/design-decisions-and-challenges#increasing-context-for-ai"},
          { text: "Detecting Session Inactivity", link: "/design-decisions-and-challenges#detecting-session-inactivity-with-providence-s-worker"},
          { text: "RAG Chatbot", link: "/design-decisions-and-challenges#retrieval-augmented-generation-chatbot"},
          ]
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
  },

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon' }]
  ]
})
