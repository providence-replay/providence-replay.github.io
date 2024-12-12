---
next: 
  text: 'Future Work'
  link: '/future-work'
prev:
  text: 'Building Providence'
  link: '/building-providence'
---

# Design Decisions

## Precomputing Session Summaries

While prototyping Providence, we had to decide when to generate summaries with AI analysis. We chose to compute the summaries immediately after a session was marked complete using a worker in the codebase. This approach may initially seem like a waste of API calls and AI tokens - why not generate the summary only when a user requests it? We identified several reasons why precomputing summaries was the better choice.

First, precomputing summaries ensure a smoother workflow for developers. Users typically skim session summaries to get an initial feel for trends or issues. Waiting for an AI-generated summary to load at each session would disrupt this flow. The wait time of an API call to OpenAI is similar to prompting ChatGPT directly. A complicated question takes at least 3 or 4 seconds to receive a response. By precomputing, we make the captured data immediately accessible in the dashboard.

Second, precomputing summaries enable our multi-summary feature. Analyzing trends across selected sessions relies on the single-session summaries. If instead, raw rrweb data had to be analyzed on demand for each session chosen, the experience for our user would become slow and cumbersome. 

Finally, precomputing made our goal of building an RAG chatbot feasible. For the chatbot to function accurately, data with semantic meaning must be embedded. Embedding raw rrweb data was never an option (link to pre-processing). Instead, the pre-computed summaries become the raw material for the RAGs knowledgebase as they are embedded and stored in a vector database.

Providence balances efficiency and usability by precomputing summaries, enabling quick access to single and multi-session insights while supporting the developer's workflow.

## Building an Inactive Session Worker

Providence was designed with a philosophy of minimal intrusion, aiming to reduce the work required for the owner of the instrumented application. To achieve this, we wrapped the recording and transmission logic into an npm package, referred to as the agent. This ensures that the instrumented application only transmits data when new events occur and eliminates unnecessary network requests. By doing so, the application remains lightweight while maintaining efficient data capture.

To detect activity, the agent uses timers to determine whether the application is active. On the server side, a worker function monitors session activity, evaluating when the last batch of new events was added. If no new data arrives for five minutes, the session is marked as inactive. An alternative we considered was to use polling. The instrumented application would send ‘events’ every 5 seconds regardless if new events existed. In this case, 60 consecutive empty events would indicate a session was to be marked as inactive. This would be paired with a time-to-live value sent to Redis that could be reset with each non-empty batch of event data.

We chose our approach of the worker because it shifts complexity to the backend of Providence, avoids the need for ‘no-event’ transmissions from the application and anchors orchestration within Providence. 

# Challenges

## Importance of High Quality Summaries

The AI analysis that generates single-session summaries is one of the most frequently interacted with components of Providence. These summaries are crucial for immediate insights and serve as the foundation for multi-session summaries and the RAG chatbot knowledge base.

Initially, we considered focusing summaries exclusively on events that signaled user challenges. We thought identifying the friction points alone would be the most useful to the developer seeking to improve an application. However, excluding mundane interactions entirely, reduced the context of the whole session and made the summaries less useful for both the RAG and multi-session analyses. For the multi-session summaries and chatbot to identify trends, they need to have access to information about when the application is being used as it is expected to be used. Otherwise, the trends represent the user experience as negative, even when the experiences were mostly neutral.


### Data Challenges

Rrweb captures the entire DOM and its mutations as JSON data. This quickly grows in size. The OpenAI API currently accepts up to 400,000 characters per API call. Sessions longer than 5 minutes in our test application - a simple shopping cart - must be divided into smaller chunks and evaluated independently. The ratio between session duration and data size will vary based on the complexity of the instrumented application. 

### Chunking Data

Each API call to OpenAI is independent. When you break the data into chunks there is no automatic context between each API call. We tested two approaches to ensure a cohesive result from fragmented data.

Concurrent Analysis: All chunks are analyzed simultaneously, followed by a final call that concatenates the results and passes them back to the API with a prompt to build a single summary. This method is performant. The processing time is about two API calls, regardless of how many chunks are involved.

Iterative Analysis: Chunks are processed sequentially. An evolving or rolling summary is passed as context to subsequent calls, which add to the summary. This method mimics techniques for summarizing long books with LLMs but increases total processing time as the number of chunks grows.

The results were similar in quality during our testing, so we opted for the more performant concurrent analysis. 

### Refining Prompts for Effective Summaries

The structure of rrweb data poses additional challenges for generating useful summaries. We tested various prompt structures, pulling from research  [ref] (Co-Intelligence and https://platform.openai.com/docs/guides/prompt-generation ) and trial and error:
Priming the model by specifying its role (e.g., “You are a session replay analysis assistant…”). 
Clarifying what the model should prioritize (e.g., “Focus on user behaviors, technical issues, and significant interactions.”)
Tell it what to avoid (e.g., “Keep all summaries factual and derived from the provided data.”)

One significant challenge with prompt tuning is the variability in LLM outputs. Incremental changes to the prompt often led to small changes in the results. It is difficult to identify which changes improved the quality the most.

### The Evolution of the Summary

Early summaries, from a prompt that asks the LLM to write a summary tailored to a product manager, often included fabricated or irrelevant details:
[ format quotes - indented maybe italics ]

“Consistent successful API requests reflect effective application functionality, underlining its robustness and user dependability for expected outcomes.” 
No API requests occurred

“Data fetching latency has the potential to frustrate users” 
Shop items were hardcoded and loaded instantly.

By refining prompts, mostly by making directions more specific and adding guard rails, we achieved more accurate and actionable summaries:

“Frequent engagement with filtering and sorting options suggests a focused approach and effective interaction during the product search phase. However, a technical error ‘Warning: Cannot update a component while rendering a different component’ was observed, which may have disrupted the user’s flow and potentially caused confusion.” 
This summary correctly highlighted a technical issue while avoiding irrelevant speculation.


## Improving LLM Summaries with Preprocessing.

Initially, Providence passed raw rrweb data to an LLM for single-session analysis. While the JSON data only needed to be stringified for LLM compatibility, the raw data is formatted to be used with the rrweb replay function not for human readability. LLMs can interpret the raw data, but we explored preprocessing to improve response quality.

### Compile Metadata

The first step in preprocessing was to compile metadata, which was prepended to the JSON object. Metadata includes start and end times, session duration, and details about the instrumented application and device used. By programmatically calculating these values, we reduce the LLM’s workload, highlight key metrics, and ensure critical information is included in the analysis.

Other properties include ‘events’, ‘technical’, and ‘significant’. The ‘significant’ property captures notable events programmatically, based on predefined criteria. For example, unresponsive clicks close together are categorized as rage clicks and added as key-value pairs.

### Replace Coded Numbers with Words

The second preprocessing step recursively replaces rrweb ‘type’ numbers with their corresponding words. Initially, we included a reference key in the prompt, but replacing the values directly enabled the LLM to more consistently identify trends.

Preprocessing rrweb data improved the accuracy of session summaries, particularly in cases where very little occurs.

For static sessions, raw rrweb data often overemphasize trivial interactions. For example, in one 16-second session, where the mouse mostly stayed still and then happened to hover over two products, the summary read ‘The user demonstrated a particular interest in specific products, such as the "Bluetooth Speaker" and "Designer Jeans," navigating between product cards and detailed views purposefully.’ Summaries generated from the preprocessed data reduced exaggerated and incorrect conclusions. 

For longer sessions, preprocessing reduces hallucinated content. In one test session without network activity, the raw data summary started “Successful network tests demonstrated reliable API interactions.” The preprocessed data summary stayed focused on the actual significant events. 

There was an initial concern that the compute time of preprocessing would be noticeable. But 5 ms, this is trivial compared to the multiple API calls to OpenAI. Preprocessing does double the number of files stored in S3. The cost of S3 storage is typically low.


### Choosing the Right LLM

As discussed above, refining prompts and adjusting the guidance for analysis significantly impact the quality of session summaries. However, an even more critical factor is the choice of which LLM is used. The model influences clarity, accuracy, and depth of insight.

The gap in quality between models is akin to comparing an amateur and a professional artist. Give both the same still life and identical instructions and the professional will produce drastically better results. This gap in quality persists even if the professional is given worse directions than the amateur. Similarly, a well-designed prompt is essential. However, the capability of the LLM ultimately determines the quality of the results.

Investing in a stronger model can reduce errors, and provide deeper insights. The tradeoff of cost vs quality is an important consideration when scaling solutions. Providence was prototyped with OpenAI’s GPT-4o mini, described as the “affordable and intelligent small model for fast, lightweight tasks”. When we started paying more and using GPT-4o, which is described as the “high-intelligence flagship model for complex, multi-step tasks”, there was an increase in the quality of the responses. At the time of this writing, OpenAI has just released O1-Preview, a beta of the upcoming model. We tested single-session summary with O1-Preview and the results improved again. At this time, O1-Preview is 100 times more expensive than GPT-4o mini. For this reason, Providence is built with OpenAI’s GPT-4o. [ref] (https://platform.openai.com/docs/models/gpt-4o-mini )


## Building the RAG Chatbot

Providence aims to reduce the need to watch session replays by including a chatbot feature that allows users to query information about existing sessions. Providence’s decision to use single-session summaries for embedding and storage in the vector database is grounded in the principles of how Large Language Models and Retrieval-Augmented Generation work.

### LLM Overview

Traditional search engines rely on web crawlers and indexes to match user keywords to relevant information. For example, entering a query into Google generates results based on keyword matching across its indexed corpus of web pages. Similarly, early chatbots used rule-based systems to provide answers, responding with predefined parameters.

LLMs take this a step further. They maintain context across their training data and generate detailed responses by identifying semantically related information. When a prompt is entered, the LLM uses a nearest-neighbor algorithm to retrieve and synthesize information from its corpus, offering contextually based answers.


### Vector Data: Preserving Context

The corpus of an LLM refers to the expansive text data it was trained with. OpenAI’s ChatGPT-3.5 was trained on approximately 300 billion words, equivalent to 570GB of data [ref] (https://www.sciencefocus.com/future-technology/gpt-3 ). Storing and searching such massive datasets in plain text is inefficient, which is where embeddings come in.

Embeddings are vector representations of text. They are created by feeding natural language through an embedding model. These vectors are mathematical structures that encode the semantic meaning of the text. Text with similar meanings will have similar vector values, enabling efficient similarity-based searching.

While the concept of a vector can be visualized as an arrow with size and direction on an x/y plane, actual embeddings exist in much higher dimensions. OpenAI’s embedding model text-embedding-3-large generates vectors with 3,072 dimensions [ref] (https://platform.openai.com/docs/models#embeddings ). These vectors and their metadata are stored in vector databases, which are optimized for nearest-neighbor searches using algorithms like cosine similarity or dot product among others. The specifics of these algorithms are beyond the scope of this paper. 

### RAG in Action

RAG stands for Retrieval-Augmented Generation, which retrieves relevant information from stored data and augments generated answers based on this retrieved context. RAG combines an AI chat model with a vector database to enhance conversational capabilities and deliver contextually informed responses. Here is how it works:

Step 1 - User Input: The developer enters a prompt or question into the chatbot.
Step 2 - Embedding: The application embeds the prompt, using the same embedding mode as the stored data.
Step 3 - Vector Search: The embedded prompt performs a nearest-neighbor search in the vector database, retrieving relevant stored metadata from the embeddings.
Step 4 - LLM Response: The application passes the prompt and retrieved embeddings to the LLM. The instructions for the LLM (Providence uses OpenAI’s GPT-4o) are to generate a response to the question based on the provided context.
Step 5 - Output: The LLM crafts a detailed answer, which is presented to the user.


### Providence RAG chatbot:

The raw data collected by rrweb is unsuitable for embedding. A three-minute session can generate hundreds of thousands of characters. This would require extensive chunking to process, which risks losing context. More importantly, rrweb data, whether raw or preprocessed, lacks semantic meaning, rendering its embedding ineffective for similarity searches. For this reason, Providence uses single-session summaries as the chatbot’s knowledge base.

After generating a single-session summary, Providence embeds it using OpenAI’s text-embedding-3-small model. This model was chosen because having used the summaries, they are sufficiently small enough to work well in the ‘small’ embedding model. [ref] (https://www.datacamp.com/tutorial/exploring-text-embedding-3-large-new-openai-embeddings ). The resulting vector, along with metadata, is stored in a Qdrant database. These summaries are concise enough to avoid chunking and effectively represent the semantic meaning of the large JSON datasets they summarize. A tradeoff to using the summaries is that as a ‘summary,’ they are only part of the whole picture. It is possible that greater details added to the knowledge base could provide more useful answers. At this point, keeping the complexity lower, and using the summaries as they currently are is the choice that makes the most sense. By leveraging these embeddings, the chatbot can efficiently retrieve and provide relevant, context-aware responses to user queries.