---
prev: 
  text: 'Core Features of Providence'
  link: '/introducing-providence'
next:
  text: 'Design Decisions and Challenges'
  link: '/design-decisions-and-challenges'
---

# Architecture of Providence

<br>
<br>
<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 20px; margin-top: 20px;">
  <img src='/final_arch.png' alt='Benefits'/>
  <figcaption style="text-align: center; margin-top: 10px; font-style: italic;">
    Agent, a backend to handle data and requests, and a user dashboard.
  </figcaption>
</figure>
<br>

This section breaks down the interactions between the application architecture components. It details how data is collected, transformed, and stored as well as how a developer can interact with the collected data.

Much of the architecture of Providence is designed to handle data efficiently as it moves through various stages. Incoming data is captured, processed, analyzed, and stored. This pattern demonstrates an extract, transform, load (ETL) data pipeline.

## Agent: Sending Session Data to Providence

After the Providence infrastructure is established, the backend API URL and uniquely generated project ID are used to configure the Providence Agent’s target endpoint during instrumentation.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 20px; margin-top: 20px;">
  <img src='/agent.png' alt='Benefits'/>
</figure>

Instrumentation involves injecting the [Agent code](https://github.com/providence-replay/agent/blob/main/README.md), as an npm package, into the front end of the desired single-page web application, allowing session data to be captured. Additionally, several lines of code, including the endpoint URL are added to the application’s entry point. Conventionally, this might be in app.js for the front end of a JavaScript application.

### Using rrweb
The Providence agent uses the open-source library [rrweb](https://www.rrweb.io/). rrweb captures everything that happens in the DOM and is the foundation of many session replay tools. 

The DOM (Document Object Model) is the browser-generated, in-memory, representation of HTML. rrweb takes an initial snapshot of the entire DOM and then captures incremental snapshots for DOM mutations. The changes are referred to as events. Mouse and keyboard events are also recorded. This data is formatted as a JSON object and incrementally sent to the Providence backend, via an API call every five seconds.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 20px; margin-top: 20px;">
  <img src='/rrweb.png' alt='Benefits'/>
  <figcaption style="text-align: center; margin-top: 10px; font-style: italic;">
    rrweb captures the DOM as a JSON object.
  </figcaption>
</figure>

Privacy concerns are non-trivial in session replay. By default, rrweb will log most user text inputs. This means that a shopping cart’s payment processing steps would record credit card numbers.  Providence observes interactions while respecting user data privacy. In particular, Providence is configured to mask user text field inputs to protect user privacy.

By instrumenting an application, that application can now emit data to Providence’s API to receive. The backend architecture handles this incoming data.

## Providence Backend Architecture

### Dynamic Event Handling: Building Sessions in Real-Time

User activity of the instrumented application triggers the agent to create a session and generates a session ID. 

For each batch of event data that is received by Providence, two distinct tasks occur. The first focuses on the session's metadata. The backend checks if the session exists, and then updates or creates records stored in PostgreSQL. These records include the session ID, file name to be used when the full session is completed and stored, and several timestamps. 

The second part is handling the event data captured by the Providence agent. An active session generates and sends event data as a JSON object. Because the session event data is dynamic and incrementally assembled, an in-memory JSON store is used. Redis Stack enables efficient appending of JSON objects while maintaining the correct order of events.

### Active and Inactive Session Detection

Determining when a session is active or inactive/complete uses logic from both the agent and Providence’s backend. The agent uses a queue system to batch and send event data every 5 seconds while the session is active and progressing. If events are not being actively recorded (i.e., the user is not performing any inputs on the page), data transmission pauses until inputs resume. Data transmission will also pause immediately upon the page/tab becoming hidden.

There are two situations where the Agent will end the current session. The first is if the visible page receives no inputs for 3 minutes or more, and the second is if the page is hidden for 1 minute or more. In both of these situations, resuming activity before the time limit is reached resumes event capture and transmission in the same session. On the other hand, resuming inputs after the respective limit in either situation will trigger the creation of a new session and seamlessly start capture and transmission in that new session.

The backend’s inactive session worker monitors for session inactivity/staleness by checking the last timestamp for received event batches. The session is deemed inactive/stale if the last timestamp is over 5 minutes old, signaling the backend to initiate the process of completing the session.

### Completing a Session

When a session has been marked complete, the following processes occur to transform the data and load it into the appropriate data stores:

First, event data is retrieved from Redis and loaded in an AWS S3 bucket. Once that is confirmed, the session data is deleted from Redis. 

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/data_from_redis.png' alt='Benefits'/>
</figure>

Next, the raw session is transformed with the Providence preprocessing code, adding metadata and increasing semantic meaning to aid the AI analysis. Preprocessed data is also loaded into the S3 bucket.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/preprocessor.png' alt='Benefits'/>
</figure>

Then an API call is made to OpenAI. OpenAI analyzes preprocessed data to generate a summary of the session, which is stored in PostgreSQL. 

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/analyze_single_session.png' alt='Benefits'/>
</figure>

Finally, the summary text is once again sent to OpenAI via an API call and embedded using OpenAI’s text-embedding-3-small model. The embedding is stored in a Qdrant vector database, with the summary as metadata. These steps transform and load the data for the RAG chatbot’s use.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/summary_embedding.png' alt='Benefits'/>
</figure>

This chain of events ensures that session data is properly processed, analyzed, and stored in its various states. 

## Providence's Dashboard

### Single-Session Summaries and Replay
To load the dashboard, an SQL query in AWS RDS (Relational Database Service) fetches metadata for all inactive sessions. These are displayed in a list of cards. Selecting a session retrieves its summary and file name, enabling session replay functionality by fetching the corresponding raw rrweb data from S3. The rrweb library powers the replay functionality, allowing sessions to be reviewed as a video-like simulation directly from the captured JSON.

### Multi-Session Summaries
Sessions are selected by clicking on them in the sidebar([see above images](introducing-providence.md#multi-session-ai-summaries)). The texts of the selected session summaries are fetched from PostgreSQL and sent to OpenAI via an API call for multi-session analysis. The resulting insights sent in the response are displayed in the dashboard.

### RAG Chatbot
The chatbot uses embeddings stored in Qdrant for vector-based searches. When a user asks a question, it is embedded using OpenAI’s text-embedding-3-small model. A nearest-neighbor search identifies relevant summaries, which are passed as context to OpenAI to generate a response. The result is then displayed in the dashboard ([see above images](introducing-providence.md#rag-chatbot-ai-powered-insights-from-session-data)).

#### LLM Overview
Providence’s decision to use single-session summaries for embedding and storage in the vector database is grounded in the principles of how Large Language Models and Retrieval-Augmented Generation work.

Traditional search engines rely on web crawlers and indexes to generate a corpus of web pages to match keywords to relevant information. Similarly, early chatbots used rule-based systems to provide answers, responding with predefined parameters.

The corpus of an LLM refers to the expansive text data it was trained with. OpenAI’s ChatGPT-3.5 was trained on approximately 300 billion words, equivalent to 570GB of data<sub>[5](https://www.sciencefocus.com/future-technology/gpt-3)</sub>. Storing and searching such massive datasets in plain text is inefficient, which is where embeddings come in.

Embeddings are vector representations of text. They are created by feeding natural language through an embedding model. The vectors are mathematical structures that encode the semantic meaning of the text. Text with similar meanings will have similar vector values, enabling efficient similarity-based searching because similar embeddings are ‘closer’ to each other in the database.

LLMs maintain context across their training data and generate detailed responses by identifying semantically related information using embeddings. When a prompt is entered, the LLM uses a nearest-neighbor algorithm to retrieve and synthesize information from a vector database.

While the concept of a vector or embedding can be visualized as an arrow with size and direction on an x/y plane, actual embeddings exist in much higher dimensions. OpenAI’s embedding model text-embedding-3-large generates vectors with 3,072 dimensions<sub>[6](https://platform.openai.com/docs/models#embeddings)</sub>. These vectors and their metadata are stored in vector databases, which are optimized for nearest-neighbor searches using algorithms like cosine similarity or dot product among others. The specifics of these algorithms are beyond the scope of this case study. 

#### RAG in Action
RAG, Retrieval-Augmented Generation, retrieves relevant information from stored data and augments generated answers based on this retrieved context. RAG combines an AI chat model with a vector database to enhance conversational capabilities and deliver contextually informed responses. Here is how it works:

1. Input: The chatbot user enters a prompt or question into the chatbot.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/1d.png' alt='Benefits'/>
</figure>

2. Embedding: The application embeds the prompt, using the same embedding model as the stored data. In Providence, this is an API call to OpenAI.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/2d.png' alt='Benefits'/>
</figure>

3. Vector Search: A nearest-neighbor search is performed with the embedded prompt in the vector database, retrieving the stored metadata from returned embeddings.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/3d.png' alt='Benefits'/>
</figure>

4. LLM Response: The application passes the prompt and retrieves embeddings for the LLM. The instructions for the LLM (Providence uses OpenAI’s GPT-4o) are to generate a response to the question based on the provided context.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/4d.png' alt='Benefits'/>
</figure>

5. Output: The LLM crafts a detailed answer, which is presented in the dashboard.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/5d.png' alt='Benefits'/>
</figure>