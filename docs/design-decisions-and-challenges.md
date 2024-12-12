---
next: 
  text: 'Future Work'
  link: '/future-work'
prev:
  text: 'Architecture'
  link: '/building-providence'
---

# Design Decisions and Challenges

## Precomputing Summaries

While prototyping Providence, we had to decide when to generate summaries with AI analysis. We chose to compute the summaries immediately after a session was marked complete, rather than compute them upon a user’s request. This was driven by a need for single-session summaries as part of the RAG chatbot and to enable the ability to summarize multiple sessions.

For the chatbot to function accurately, data with semantic meaning must be embedded, which raw rrweb data lacks. The pre-computed single-session summaries are the raw material for the RAG’s knowledge base when they are embedded and then stored in a vector database. When sessions are selected in the multi-session summary feature, it is the pre-computed summaries that are sent in an API call to OpenAI for analysis.

Finally, precomputing summaries also ensures a smoother workflow for the users of Providence. Users typically skim session summaries to get an initial feel for trends or issues. Waiting several seconds for an API call to OpenAI is similar to prompting ChatGPT directly, which in our opinion creates a choppy and disruptive experience.

While precomputing involves a trade-off in terms of up-front computing resources, it is critical for ensuring seamless interactions and unlocking the full value of Providence’s features.

## Increasing Context for AI

Initially, we considered focusing summaries exclusively on events that signaled user challenges. We thought identifying the friction points alone would be the most useful for a product designer seeking to improve an application. However, excluding mundane interactions entirely, reduced the context of the whole session and made the summaries less useful for both the RAG and multi-session analyses. For the multi-session summaries and chatbot to identify trends, they need to also know when the application is being used as it is expected to be used. Otherwise, the trends represent the user experience as negative, even when the experiences were mostly neutral.

### Overcoming Data Challenges in Session Replay

rrweb captures the entire DOM and its mutations as JSON data. This quickly grows in size. The OpenAI API currently accepts up to 400,000 characters per API call. The ratio between session duration and data size will vary based on the complexity of the instrumented application. Sessions longer than 5 minutes in our test application, a simple shopping cart, must be divided into smaller chunks and evaluated independently. 

Each API call to OpenAI is independent. When you break the data into chunks there is no automatic context between each API call. We tested two approaches to ensure a cohesive result from fragmented data.

Concurrent Analysis: All chunks are analyzed simultaneously, followed by a final call that concatenates the results and passes them back to the API with a prompt to build a single summary. This method is performant. The processing time is about two API calls, regardless of how many chunks are involved.

Iterative Analysis: Process chunks sequentially. An evolving or rolling summary is passed as context with subsequent chunk analysis, which adds to the summary. This method mimics techniques for summarizing long books with LLMs. It increases total processing time as the number of chunks grows. The chunks must be processed synchronously. N chunks, require N synchronous calls to OpenAI, which each take three or four seconds.

We passed the same, multi-chunk session data into functions built from each approach and reviewed the summaries for accuracy and clarity. The summaries were very similar. We opted for the concurrent analysis because it consistently processes all the chunks in about the time it takes to make two API calls to OpenAI. 

### Optimizing AI Prompts for Effective Summaries

The structure of rrweb data poses additional challenges for generating useful summaries. We tested various prompt structures, pulling from research<sub>[7](https://platform.openai.com/docs/guides/prompt-generation)</sub> and trial and error:
* Priming the model by specifying its role (e.g., “You are a session replay analysis assistant…”). 
* Clarifying what the model should prioritize (e.g., “Focus on user behaviors, technical issues, and significant interactions.”)
* Tell it what to avoid (e.g., “Keep all summaries factual and derived from the provided data.”)

One significant challenge with prompt tuning is the variability in LLM outputs. Incremental changes to the prompt often led to small changes in the results. It is difficult to identify which changes improved the quality the most.

Early summaries, from a prompt that asks the LLM to write a summary tailored to a product manager, often included fabricated or irrelevant details, often referred to as hallucinations. Here are two examples. 

In the first, no API requests occurred and yet the summary confidently discusses them:
“Consistent successful API requests reflect effective application functionality, underlining its robustness and user dependability for expected outcomes.”

In the second example, shop items had been hardcoded into the instrumented application and loaded instantly. The AI summary speculates on latency that did not exist: 
“Data fetching latency has the potential to frustrate users”

The prompt was refined over dozens of iterations. In the end, it is primed with a role (‘you are a session replay analysis assistant’), its focus is directed (‘focus on user behaviors and patters, technical issues or errors…’) and several guardrails are stipulated (‘keep all summaries factual and drive from the data’). This ultimately achieved more accurate and actionable summaries. The next quote correctly highlighted technical issues while avoiding irrelevant speculation:
“Frequent engagement with filtering and sorting options suggests a focused approach and effective interaction during the product search phase. However, a technical error ‘Warning: Cannot update a component while rendering a different component’ was observed, which may have disrupted the user’s flow and potentially caused confusion.” 

### Preprocessing rrweb Data to Improve LLM Accuracy

Initially, Providence passed raw rrweb data to an LLM for single-session analysis. While the JSON data only needed to be stringified for LLM compatibility, the raw data is formatted to be used with the rrweb replay function not for human readability. Although LLMs can interpret the raw data with some thorough prompt engineering, we instead implemented a preprocessing step on the data before it is sent. This improves the data's interpretability and the quality and consistency of the response.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/rrweb_rawData.png' alt='Benefits'/>
  <figcaption style="text-align: center; margin-top: 10px; font-style: italic;">
    Raw rrweb is formatted for the rrweb player and has no semantic meaning.
  </figcaption>
</figure>

In particular, an issue that arose was that in sessions with very little activity, summaries based on raw rrweb data often overemphasize trivial interactions. For example, in one 16-second session, where the mouse mostly stayed still and then happened to hover over two products, the summary read: ‘The user demonstrated a particular interest in specific products, such as the "Bluetooth Speaker" and "Designer Jeans," navigating between product cards and detailed views purposefully.’ Summaries generated from the preprocessed data reduced exaggerated and incorrect conclusions. 

For longer sessions, preprocessing reduces hallucinated content. In one test session without network activity, the raw data summary began with “Successful network tests demonstrated reliable API interactions.” The preprocessed data summary of this same session stayed focused on actual happenings without hallucinating the non-existent network activity.

### How the Preprocessor Works

The SessionProcessor class orchestrates the transformation of the raw data by iteratively constructing a new and methodically structured object, ProcessedSession, using many specialized processors each responsible for a certain aspect or type of rrweb event.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/processed_session.png' alt='Benefits'/>
  <figcaption style="text-align: center; margin-top: 10px; font-style: italic;">
    The ProcessedSession object structure
  </figcaption>
</figure>

The processors each analyze and derive semantic meaning from the events and add this information to the overall ProcessedSession. For instance, rather than numeric event types and numeric DOM node types, these numbers are converted back into their human-readable meanings during the transformation process.

<figure style="display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 40px; margin-bottom: 30px; margin-top: 30px;">
  <div style="flex: 1; text-align: center;">
    <img src='/raw_rrweb_JSON.png' alt='Benefits' style="max-width: 100%;"/>
  </div>
  <div style="flex: 1; text-align: center;">
    <img src='/processed_rrweb_JSON.png' alt='Benefits' style="max-width: 100%;"/>
  </div>
</figure>
<div style="text-align: center; margin-top: 10px; font-style: italic;">
  Raw rrweb data vs preprocessed data
</div>

In addition to simple number-to-string mappings, the preprocessor identifies numerous patterns such as rage clicks (5+ clicks within a second), network failures, console errors, etc., and transforms those data patterns into meaningful descriptions such as "User showed signs of frustration with form submission." The descriptors in this semantic layer were crafted manually by the Providence team and developed with three key objectives: technical accuracy (they need to be factually correct), universal relevance (they need to make sense in general terms and use fallback defaults when unaccounted for scenarios arise), and optimization for LLM comprehension (they need to aid in the goal of helping the LLM interpret the overall session).

The preprocessing flow begins by analyzing timestamps to establish session boundaries before processing the rrweb Meta event and FullSnapshot event which come first in the event stream. After the initial metadata and full snapshots are established, the preprocessor iterates over the remaining events sending each to its dedicated processor. The numeric identifiers are mapped to descriptive strings, and any detected patterns or significant events trigger the addition of semantic descriptors to the ProcessedSession. Each processor contributes to building a comprehensive new object designed to be accurate to the data and better interpreted by LLMs.

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/two_significant_events.png' alt='Benefits'/>
  <figcaption style="text-align: center; margin-top: 10px; font-style: italic;">
    Two ‘significant’ events were identified during preprocessing
  </figcaption>
</figure>

<figure style="display: flex; flex-direction: column; justify-content: center; align-items: center; margin-bottom: 30px; margin-top: 30px;">
  <img src='/technical_events.png' alt='Benefits'/>
  <figcaption style="text-align: center; margin-top: 10px; font-style: italic;">
    Errors captured during preprocessing. Note the third item was also included as a significant event above
  </figcaption>
</figure>

There was an initial concern that the compute time of preprocessing would be noticeable. We averaged this time out to 5ms using ~3-minute sessions which is trivial compared to other steps in the pipeline such as the API calls over the wire to OpenAI. While preprocessing does double the number of files stored in S3 -- one file for the raw data and one file for the processed data per session -- S3’s low storage costs (~0.001 cents/month per session accessed ~10 times/week) make this a minor trade-off compared to the improved session analysis it allows.

### LLM Selection: Balancing Cost, Accuracy, and Depth of Insight
As discussed above, refining prompts and adjusting the guidance for analysis significantly impact the quality of session summaries. However, LLM choice also influences clarity, accuracy, and depth of insight.

Providence was prototyped with OpenAI’s GPT-4o mini, described as the “affordable and intelligent small model for fast, lightweight tasks”. When we started paying more and using GPT-4o, which is described as the “high-intelligence flagship model for complex, multi-step tasks”, there was an increase in the quality of the response and a decrease in hallucinations making the increased cost justifiable.<sub>[8](https://platform.openai.com/docs/models/gpt-4o-mini)</sub>

## Detecting Session Inactivity with Providence’s Worker
Providence was designed with a philosophy of minimal intrusion, aiming to reduce the work required for the owner of the instrumented application. To achieve this, we wrapped the recording and transmission logic into an npm package, referred to as the agent. This ensures that the instrumented application only transmits data when new events occur and eliminates unnecessary network requests. By doing so, the application remains lightweight while maintaining efficient data capture.

To detect activity, the agent maintains a queue which the rrweb library will add to upon recording any events. The agent then simply determines whether the queue is empty or not and uses that answer to transmit data. The agent also uses programmatic timers coupled with browser API event listeners to perform various timeout logic such as determining if the page has been hidden for some time and ending that particular session.  On the server side, a worker function monitors session activity, evaluating when the last batch of new events was added. If no new data arrives for five minutes, the session is marked as inactive. An alternative we considered was to use polling. The instrumented application would make requests every 5 seconds regardless if any new events were recorded and in the queue. In this case, 60 consecutive empty batches arriving in the backend would indicate an inactive session. This would be paired with a time-to-live value sent to Redis that could be reset with each non-empty batch of event data.

We chose our approach of the worker because it shifts complexity to the backend of Providence, avoids the need for ‘no-event’ transmissions from the application, and anchors orchestration within Providence. 

## Retrieval-Augmented Generation Chatbot
The raw data collected by rrweb is unsuitable for embedding. A three-minute session can generate hundreds of thousands of characters. This would require extensive chunking to process, which risks losing context. More importantly, rrweb data, whether raw or preprocessed, lacks semantic meaning and cohesion the way a plaintext summary does, rendering its embedding ineffective for similarity searches against other plaintext user queries. For this reason, Providence uses the single-session summaries as the chatbot’s knowledge base.

After generating a single-session summary, Providence embeds it using OpenAI’s text-embedding-3-small model. This model was chosen because having used the summaries, they are sufficiently small enough to work well in the ‘small’ embedding model.<sub>[9](https://www.datacamp.com/tutorial/exploring-text-embedding-3-large-new-openai-embeddings)</sub> The resulting vector, along with metadata, is stored in a Qdrant vector database. These summaries are concise enough to avoid chunking and effectively represent the semantic meaning and overall narrative of the large JSON datasets they summarize. A tradeoff to using the summaries is that as a ‘summary,’ they are only part of the whole picture. The single-session summaries we currently generate are concise by design, to quickly understand the user journey. It is possible that generating a larger summary with room for an extended narrative and greater details and using that for the knowledge base could provide more useful answers to chatbot questions. At this point, we have not tested using two summaries. For this reason, we are continuing to use the lower complexity, more concise single summary approach. By leveraging these embeddings, the chatbot can efficiently retrieve and provide relevant, context-aware responses to queries.