---
prev: 
  text: 'Introducing Providence'
  link: '/introducing-providence'
next:
  text: 'Design Decisions and Challenges'
  link: '/design-decisions-and-challenges'
---

# Architecture

This section breaks down the roles between the backend and frontend architecture. It details how data is collected, transformed and stored as well as how a developer is able to interact with the collected data.
draft image: caption: division between backend, which handle incoming data, and the frontend, which allows developers to interact with the data.

## Backend Architecture

The architecture of a session replay application like Providence is designed to handle data efficiently as it moves through various stages. Incoming data is captured, processed analyzed, and stored. This pattern demonstrates an extract, transform, load, (ETL) pipeline. Each backend component of Providence isolates one of these actions. 

### Data Capture

When a new project is set up in Providence, a unique URL is generated. This becomes the server endpoint to which session data is sent through a backend API call. 

A single-page application is then instrumented with Providence, allowing it to capture session data. Instrumenting is achieved by adding the agent code via an npm package and adding about a dozen lines of code, including the endpoint URL, to the application’s entry point.
Conventionally, this would be in app.js for the front end of a JavaScript application. (link to README) 

#### Using rrweb

The Providence agent uses the open-source rrweb (ref https://www.rrweb.io/) library to “record and replay the web” (rrweb). rrweb captures everything that happens in the DOM. It is the foundation of many session replay tools. 

The DOM (Document Object Model) is the browser-generated, in-memory, representation of HTML. rrweb takes an initial snapshot of the entire DOM and then captures incremental snapshots for DOM mutations. The changes are referred to as events. Mouse and keyboard events are also taken. This data is formatted as a JSON object.

#### Dynamic Event Handling: Building Sessions in Real-Time

User activity of the instrumented application triggers the agent to create a session, which generates a unique session ID. Session events are incrementally sent to the Providence backend, via an API call every five seconds. Five seconds is common across leading session replay providers.

As Providence extracts the session data, two distinct tasks must occur. The first focuses on the session's metadata. The backend checks if the session exists, and updates or creates records stored in PostgreSQL. These records include the session ID, file name to be used when the full session is completed and stored, and several timestamps. 

The second part is handling the event data captured by the Providence agent and rrweb. An active session generates and sends event data, which is appended to any existing data. Because the session event data is dynamic and incrementally assembled, an in-memory JSON store is used. Redis Stack enables efficient appending of JSON objects while maintaining the correct order of events. 

### Active and Inactive Session Detection

Determining when a session is active or inactive uses logic from both the agent and Providence’s backend. The agent includes timers that check for specific conditions: Whether the tab is visible or active. If the tab is inactive for 30 seconds, data transmission pauses. If the tab is active, the event data is sent every 5 seconds.

The inactive session worker monitors for inactivity by checking the timestamp for data added to Redis. The session is deemed inactive if no data is received for over 90 seconds, signaling the backend to initiate the steps taken for all complete sessions.

### Completing a Session

When a session has been marked complete, the following processes occur to transform the data, and load it into appropriate data stores.

First, event data is retrieved from Redis and loaded in an S3 bucket. Once that is confirmed, the session data is deleted from Redis. Then the raw session is transformed with the Providence preprocessing code. Preprocessed data is also loaded into the S3 bucket.

Then an API call is made to OpenAI. OpenAI analyzes preprocessed data to generate a summary, which is stored in PostgreSQL. Finally, the summary text is once again sent to OpenAI via an API call and embedded using OpenAI’s text-embedding-3-small model. The embedding is stored in a Qdrant vector database, with the summary as metadata.

This chain of events ensures that session data is processed, analyzed, and stored in its various states. 

## Frontend Architecture

The Providence dashboard was developed in React and is where developers interact with session data. Each dashboard component is an interface between the developer and the session data which it fetches and displays.

### Single-Session Summaries

To load, an SQL query in AWS RDS (Relational Database Service) fetches metadata for all inactive sessions displayed in a list. Selecting a session retrieves its summary and file name, enabling session replay functionality by fetching the corresponding raw rrweb data from S3. The rrweb library powers the replay functionality, allowing sessions to be reviewed as a video-like simulation directly from the captured JSON.

### Multi-Session Summaries

Sessions are selected by clicking on them in the sidebar. The selected session summaries are fetched from PostgreSQL and sent to OpenAI via an API call for multi-session analysis. The resulting insights are displayed in the dashboard.

### Chatbot

The chatbot uses embeddings stored in Qdrant for vector-based searches. When a user asks a question, it is embedded using OpenAI’s text-embedding-3-small model. A nearest-neighbor search identifies relevant summaries, which are passed as context to OpenAI to generate a response. The result is then displayed in the dashboard. An expanded description of how the chatbot works is found in the section ‘RAG in action’ (link to rag in action).

The backend and frontend of Providence have distinct roles. While the backend ultimately ensures the right data makes it to the right places, the frontend allows developers to interact with that data in order to improve their own products. 

