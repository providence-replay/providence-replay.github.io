---
prev: false
next:
  text: 'Introducing Providence?'
  link: '/introducing-providence'
---

# Introduction

Providence is an open-source session replay tool for single-page applications that uncovers insights from user interactions. By incorporating AI session analysis, aggregated season trends, and an RAG chatbot for contextual exploration, Providence helps developers understand and improve user experiences.

This document is a deep dive into the benefits of session replay, the fact that gaining these benefits is time-consuming, how Providence alleviates those challenges with integrated AI, and how it was built.

## Observability

As a session replay tool, Providence is also an observability tool. Observability software aids in understanding how applications perform in the wild. Among other things, they may highlight user friction points and identify technical issues.  It is about gathering data to gain insight into the internal state of a system. This is crucial for application developers, product managers, and other company stakeholders as the ways things can go wrong in an application are numerous. 

In backend observability, telemetry metrics including response times, error rates, and request volumes trace the journey of data and requests through a system. Additional insights come from error logs and network calls to track how requests either flow between components or fail to do so. 

### Session Replay

Session replay provides a powerful complement to telemetry data for frontend observability. 
Watching an application being used is a direct way approach to understanding what actions lead to confusion or errors. With session replay, developers can watch a reconstruction of the DOM states, which simulates a video of the application in use. The developer can then see what the user sees as they interact with the instrumented application. The video-like replay will show changes in the DOM, mouse actions, and scrolls. Often network requests and error notifications are added to session data to build a more complete picture of the user experience. See ‘using rrweb’ (link to section) for details on how session replay works.

Privacy concerns are non-trivial to session replay. The most popular open-source library, rrweb, will log most user text inputs by default. Typically, session replays require user consent, often obtained through a user consent agreement upon first interactions with the site or application.  Our goal is to observe interactions while respecting user data privacy and complying with legal standards. Providence is configured to mask user text field inputs to protect user privacy.

#### Replay Benefits

Common use cases for session replay include improving user experience, diagnosing bugs, optimizing user conversions, and providing an auditable record for compliance in certain industries. By linking error occurrences to session data, developers can see the user actions that led to an error, making debugging faster and more accurate. AI-powered insights can enhance this by identifying common patterns or anomalies across sessions. Many of today’s popular session replay tools have powerful debugging features.

In traditional product development, understanding how users interact often relied on surveys or controlled observation. Software development has a unique opportunity for direct observation, allowing teams to see both successful interactions and friction points that would be difficult to gather otherwise. Additionally, while complaints might surface glaring issues, feedback for smoothly functioning areas is rare without direct user observation. Session replay fills this gap and enables data-driven product decisions.

#### Replay Shortcomings

Despite its benefits, companies report not utilizing session replays because viewing many replays takes time, making it impractical for most companies. Microsoft Clarity has an existing session replay product with AI integration. In their blog, they write ‘While session replays add incredible arsenal to an experimenter’s toolkit, they do have a drawback: they’re extremely time-consuming to take in[ref].’ (this will be a numbered link to refs) Similarly, at Session Stack AI, potential customers reported, ‘We don’t really want to invest in session replay because we don’t have time to watch the replays[ref].’  We built Providence to gain insights from session data while minimizing the need to watch the replays. 

## Existing Solutions

There are many existing observability solutions in the market today. FullStory and LogRocket offer session replay that is bundled with other tools such as heatmaps, error tracking, funnels, conversions, and a plethora of advanced metrics. Microsoft Clarity provides a more targeted observability tool, providing session replay along with supplemental metrics. However, the drawback for Clarity, LogRocket, and FullStory is that user interaction data is stored with the session replay company's infrastructure. 

rrweb is an open-source tool that provides session recording and replay to allow you to host your data but does not offer many features and is difficult to configure. Providence aims to provide a self-hosted, open-source, and easy-to-configure product.
