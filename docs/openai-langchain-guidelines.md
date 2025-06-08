qqqq# Comprehensive OpenAI API & LangChain Integration Guidelines

## Table of Contents
1. [OpenAI API Guidelines](#openai-api-guidelines)
   - [Getting Started](#getting-started)
   - [API Fundamentals](#api-fundamentals)
   - [Advanced Features](#advanced-features)
   - [Best Practices](#best-practices)
2. [LangChain Integration](#langchain-integration)
   - [Setup and Installation](#setup-and-installation)
   - [Core Components](#core-components)
   - [Building Applications](#building-applications)
   - [Advanced Patterns](#advanced-patterns)

---

## OpenAI API Guidelines

### Getting Started

#### 1. API Key Setup

```python
import os
from openai import OpenAI

# Set via environment variable (recommended)
os.environ["OPENAI_API_KEY"] = "your-api-key-here"

# Or initialize with API key directly
client = OpenAI(api_key="your-api-key-here")
```

#### 2. Available APIs

OpenAI offers multiple API types:

- **Chat Completions API** - For conversational AI
- **Responses API** - New unified API with built-in tools
- **Embeddings API** - For text embeddings
- **Images API** - For image generation/editing
- **Audio API** - For speech-to-text and text-to-speech
- **Assistants API** - For persistent, stateful assistants
- **Fine-tuning API** - For customizing models

### API Fundamentals

#### 1. Chat Completions (Legacy, being replaced by Responses API)

```python
from openai import OpenAI

client = OpenAI()

# Basic chat completion
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is quantum computing?"}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)
```

#### 2. Responses API (New Recommended Approach)

```python
# The new Responses API combines features from Chat Completions and Assistants
response = client.responses.create(
    model="gpt-4o",
    input="Explain quantum computing in simple terms",
    tools=[
        {"type": "web_search"},  # Built-in web search
        {"type": "file_search"}, # Built-in file search
        {"type": "code_interpreter"}  # Built-in code execution
    ],
    temperature=0.7
)

# Process the response
for output in response.output:
    if output.get("type") == "message":
        print(output.get("content")[0].get("text"))
```

#### 3. Structured Outputs

```python
from pydantic import BaseModel
from typing import List

class Recipe(BaseModel):
    name: str
    ingredients: List[str]
    instructions: List[str]
    prep_time: int
    cook_time: int

# Using structured outputs
response = client.responses.create(
    model="gpt-4o",
    input="Create a recipe for chocolate chip cookies",
    response_format=Recipe
)

recipe = Recipe.model_validate_json(response.choices[0].message.content)
print(f"Recipe: {recipe.name}")
print(f"Total time: {recipe.prep_time + recipe.cook_time} minutes")
```

#### 4. Function Calling

```python
# Define functions
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
                },
                "required": ["location"]
            }
        }
    }
]

# Use function calling
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
    tools=tools,
    tool_choice="auto"
)

# Check if the model wants to call a function
if response.choices[0].message.tool_calls:
    for tool_call in response.choices[0].message.tool_calls:
        if tool_call.function.name == "get_weather":
            # Parse arguments and call your weather function
            args = json.loads(tool_call.function.arguments)
            weather_data = get_weather(args["location"])
```

### Advanced Features

#### 1. Streaming Responses

```python
# Stream chat completion
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a story about a robot"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="")
```

#### 2. Vision Capabilities

```python
# Analyze images
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg"
                    }
                }
            ]
        }
    ]
)
```

#### 3. Audio Generation

```python
# Text to speech
response = client.audio.speech.create(
    model="tts-1",
    voice="alloy",
    input="Hello, this is a test of the OpenAI audio API."
)

# Save audio file
response.stream_to_file("output.mp3")

# Speech to text
audio_file = open("speech.mp3", "rb")
transcript = client.audio.transcriptions.create(
    model="whisper-1",
    file=audio_file
)
print(transcript.text)
```

#### 4. Image Generation

```python
# Generate images
response = client.images.generate(
    model="dall-e-3",
    prompt="A futuristic city with flying cars",
    size="1024x1024",
    quality="standard",
    n=1
)

image_url = response.data[0].url
```

### Best Practices

#### 1. Error Handling

```python
from openai import OpenAI, RateLimitError, APIError
import time

def make_api_call_with_retry(client, **kwargs):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return client.chat.completions.create(**kwargs)
        except RateLimitError as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Rate limit hit. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise
        except APIError as e:
            print(f"API error: {e}")
            raise
```

#### 2. Token Management

```python
import tiktoken

def count_tokens(text, model="gpt-4o"):
    """Count tokens for a given text"""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

def truncate_to_token_limit(text, max_tokens=8000, model="gpt-4o"):
    """Truncate text to fit within token limit"""
    encoding = tiktoken.encoding_for_model(model)
    tokens = encoding.encode(text)
    if len(tokens) > max_tokens:
        tokens = tokens[:max_tokens]
        return encoding.decode(tokens)
    return text
```

#### 3. Cost Optimization

```python
class CostTracker:
    def __init__(self):
        self.costs = {
            "gpt-4o": {"input": 0.01, "output": 0.03},  # per 1K tokens
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015}
        }
        self.total_cost = 0
    
    def track_usage(self, model, input_tokens, output_tokens):
        if model in self.costs:
            input_cost = (input_tokens / 1000) * self.costs[model]["input"]
            output_cost = (output_tokens / 1000) * self.costs[model]["output"]
            cost = input_cost + output_cost
            self.total_cost += cost
            return cost
        return 0
    
    def get_total_cost(self):
        return self.total_cost
```

---

## LangChain Integration

### Setup and Installation

#### 1. Installation

```bash
# Core LangChain packages
pip install langchain langchain-openai langchain-community

# Additional dependencies
pip install chromadb faiss-cpu sentence-transformers
pip install unstructured pdf2image pytesseract
```

#### 2. Basic Configuration

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Initialize LLM
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.7,
    api_key="your-api-key",  # Or use OPENAI_API_KEY env var
)

# Initialize embeddings
embeddings = OpenAIEmbeddings()
```

### Core Components

#### 1. Prompt Templates

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage

# Simple prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant specialized in {domain}."),
    ("human", "{question}")
])

# With chat history
prompt_with_history = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder("chat_history"),
    ("human", "{question}")
])

# Use the prompt
chain = prompt | llm | StrOutputParser()
response = chain.invoke({
    "domain": "Python programming",
    "question": "How do I handle exceptions?"
})
```

#### 2. Output Parsers

```python
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import List

# Define output schema
class TopicAnalysis(BaseModel):
    topics: List[str] = Field(description="List of main topics")
    sentiment: str = Field(description="Overall sentiment")
    key_points: List[str] = Field(description="Key points discussed")

# Create parser
parser = JsonOutputParser(pydantic_object=TopicAnalysis)

# Create chain with parser
analysis_prompt = ChatPromptTemplate.from_messages([
    ("system", "Analyze the following text and extract topics, sentiment, and key points."),
    ("human", "{text}")
])

analysis_chain = analysis_prompt | llm | parser

# Use the chain
result = analysis_chain.invoke({
    "text": "LangChain is revolutionizing how we build LLM applications..."
})
print(f"Topics: {result['topics']}")
```

#### 3. Document Processing

```python
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

# Load documents
pdf_loader = PyPDFLoader("document.pdf")
documents = pdf_loader.load()

# Split documents
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    separators=["\n\n", "\n", " ", ""]
)
chunks = text_splitter.split_documents(documents)

# Create vector store
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db"
)
```

### Building Applications

#### 1. RAG (Retrieval Augmented Generation)

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import PromptTemplate

# Create retriever
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 3}
)

# RAG prompt
rag_prompt = PromptTemplate.from_template(
    """Answer the question based only on the following context:
    
    Context: {context}
    
    Question: {question}
    
    Answer: """
)

# Build RAG chain
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | rag_prompt
    | llm
    | StrOutputParser()
)

# Use the chain
answer = rag_chain.invoke("What is the main topic of the document?")
```

#### 2. Conversational Agents

```python
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain_core.tools import tool
from langchain.memory import ConversationBufferMemory

# Define custom tools
@tool
def calculate(expression: str) -> str:
    """Calculate a mathematical expression."""
    try:
        result = eval(expression)
        return f"The result is: {result}"
    except:
        return "Invalid expression"

@tool
def search_web(query: str) -> str:
    """Search the web for information."""
    # Implement web search logic
    return f"Search results for: {query}"

# Create agent
tools = [calculate, search_web]

agent_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant with access to tools."),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad")
])

agent = create_openai_tools_agent(llm, tools, agent_prompt)

# Create agent executor with memory
memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True
)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    verbose=True
)

# Use the agent
response = agent_executor.invoke({
    "input": "Calculate 25 * 4 and then search for information about the number 100"
})
```

#### 3. Multi-Chain Workflows

```python
from langchain_core.runnables import RunnableParallel, RunnableLambda

# Define individual chains
summarize_chain = (
    ChatPromptTemplate.from_template("Summarize this text: {text}")
    | llm
    | StrOutputParser()
)

extract_entities_chain = (
    ChatPromptTemplate.from_template("Extract all named entities from: {text}")
    | llm
    | StrOutputParser()
)

sentiment_chain = (
    ChatPromptTemplate.from_template("Analyze the sentiment of: {text}")
    | llm
    | StrOutputParser()
)

# Combine chains in parallel
analysis_chain = RunnableParallel({
    "summary": summarize_chain,
    "entities": extract_entities_chain,
    "sentiment": sentiment_chain
})

# Use the combined chain
results = analysis_chain.invoke({
    "text": "OpenAI announced GPT-4o today. The new model shows significant improvements..."
})
```

### Advanced Patterns

#### 1. Streaming with Callbacks

```python
from langchain_core.callbacks import StreamingStdOutCallbackHandler
from typing import Any, Dict, List

class CustomStreamHandler(StreamingStdOutCallbackHandler):
    def __init__(self):
        super().__init__()
        self.tokens = []
    
    def on_llm_new_token(self, token: str, **kwargs) -> None:
        self.tokens.append(token)
        print(token, end="", flush=True)
    
    def on_llm_end(self, response: Any, **kwargs) -> None:
        print("\n\nStreaming complete!")

# Use with streaming
streaming_llm = ChatOpenAI(
    model="gpt-4o",
    streaming=True,
    callbacks=[CustomStreamHandler()]
)

response = streaming_llm.invoke("Write a haiku about programming")
```

#### 2. Custom Retrievers

```python
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from typing import List
import numpy as np

class CustomRetriever(BaseRetriever):
    """Custom retriever with re-ranking"""
    
    def __init__(self, vectorstore, reranker_model=None):
        self.vectorstore = vectorstore
        self.reranker_model = reranker_model
    
    def _get_relevant_documents(self, query: str) -> List[Document]:
        # Initial retrieval
        docs = self.vectorstore.similarity_search(query, k=10)
        
        # Re-rank if model provided
        if self.reranker_model:
            # Implement re-ranking logic
            scores = self._rerank(query, docs)
            sorted_indices = np.argsort(scores)[::-1]
            docs = [docs[i] for i in sorted_indices[:5]]
        
        return docs
    
    def _rerank(self, query: str, docs: List[Document]) -> List[float]:
        # Implement re-ranking logic
        return [0.5] * len(docs)  # Placeholder
```

#### 3. LangChain with LangGraph for Complex Agents

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
import operator

# Define state
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    next_step: str

# Define nodes
def research_node(state: AgentState):
    # Perform research
    return {"messages": [AIMessage(content="Research complete")]}

def analyze_node(state: AgentState):
    # Perform analysis
    return {"messages": [AIMessage(content="Analysis complete")]}

def report_node(state: AgentState):
    # Generate report
    return {"messages": [AIMessage(content="Report generated")]}

# Build graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("research", research_node)
workflow.add_node("analyze", analyze_node)
workflow.add_node("report", report_node)

# Add edges
workflow.add_edge("research", "analyze")
workflow.add_edge("analyze", "report")
workflow.add_edge("report", END)

# Set entry point
workflow.set_entry_point("research")

# Compile
app = workflow.compile()
```

#### 4. Production Best Practices

```python
# 1. Caching
from langchain.cache import InMemoryCache
from langchain.globals import set_llm_cache

set_llm_cache(InMemoryCache())

# 2. Rate limiting
from langchain_core.rate_limiters import InMemoryRateLimiter

rate_limiter = InMemoryRateLimiter(
    requests_per_second=2,
    check_every_n_seconds=0.1,
    max_bucket_size=10,
)

llm = ChatOpenAI(
    model="gpt-4o",
    rate_limiter=rate_limiter
)

# 3. Observability with LangSmith
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-langsmith-key"

# 4. Error handling wrapper
def safe_chain_invoke(chain, input_data, default_response="An error occurred"):
    try:
        return chain.invoke(input_data)
    except Exception as e:
        print(f"Error in chain execution: {e}")
        return default_response
```

## Integration Tips

### 1. Choosing Between Direct OpenAI vs LangChain

**Use Direct OpenAI API when:**
- Building simple applications with straightforward API calls
- Need maximum performance with minimal overhead
- Working with OpenAI-specific features
- Building production systems with strict latency requirements

**Use LangChain when:**
- Building complex chains and workflows
- Need to integrate multiple data sources
- Want to use pre-built components and patterns
- Building RAG applications
- Need agent capabilities
- Want easy switching between different LLM providers

### 2. Migration Strategy

```python
# Easy migration from OpenAI to LangChain
class OpenAIToLangChainAdapter:
    def __init__(self, openai_client):
        self.openai_client = openai_client
        self.langchain_llm = ChatOpenAI()
    
    def chat_completion(self, messages, **kwargs):
        # Use OpenAI directly for simple calls
        if len(messages) <= 2 and not kwargs.get("tools"):
            return self.openai_client.chat.completions.create(
                messages=messages,
                **kwargs
            )
        
        # Use LangChain for complex scenarios
        else:
            prompt = ChatPromptTemplate.from_messages(messages)
            chain = prompt | self.langchain_llm
            return chain.invoke({})
```

### 3. Performance Optimization

```python
# Batch processing
from langchain_core.runnables import RunnableBatch

batch_chain = chain.batch(
    [{"question": q} for q in questions],
    config={"max_concurrency": 5}
)

# Async processing
async def process_async():
    tasks = [chain.ainvoke({"question": q}) for q in questions]
    results = await asyncio.gather(*tasks)
    return results
```

## Conclusion

This comprehensive guide covers the essential aspects of working with both the OpenAI API directly and through LangChain. The choice between them depends on your specific use case, complexity requirements, and development preferences. Both approaches have their strengths, and understanding both will make you a more effective AI application developer.

Key takeaways:
- Start with direct OpenAI API for simple use cases
- Move to LangChain as complexity increases
- Use the new Responses API for latest features
- Implement proper error handling and rate limiting
- Monitor costs and optimize token usage
- Consider caching and batch processing for production
- Use LangSmith for observability in LangChain applications