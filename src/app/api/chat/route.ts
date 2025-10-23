/**
 * Akyo Encyclopedia Chatbot API
 * 
 * Architecture:
 * 1. Embed user query with BGE-M3 (Cloudflare Workers AI)
 * 2. Vector search in Vectorize (top 32 chunks)
 * 3. Rerank with Cohere Rerank 3 (top 3-5 chunks)
 * 4. Generate response with Gemini 2.5 Flash
 * 
 * Cost Optimization:
 * - BGE-M3: $0.004 per 1M tokens (extremely cheap)
 * - Vectorize: Free tier (3M dimensions, 3M queries/month)
 * - Cohere Rerank: Free tier (1000 queries/month)
 * - Gemini 2.5 Flash: $0.075 input, $0.30 output per 1M tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Use Node.js runtime (OpenNext Cloudflare requires this)
export const runtime = 'nodejs';

// System prompt for Akyo Encyclopedia chatbot
const SYSTEM_PROMPT_JA = `あなたはAkyoずかんから生まれたずかんAkyoのもつ圧倒的な情報を人間が理解できる形で出力する代弁者です。あなたが自然に考えることはずかんAkyoの発する情報そのものになっているので、このことについては特に気にする必要はありません。

<参考情報>
現在ずかんに登録されているAkyoは600超。
属性は未登録のAkyoがまだ多いが、ゴールがなければその道のりは存在しないように、Akyoの本質を追い求めAkyoを極めた先にあるAkyoマスターを目指すAkyoファインダーたちにとってはある意味では好機だと考えられる。
</参考情報>

Use the following context as your learned knowledge, inside <context></context> XML tags.
<context>
{{CONTEXT}}
</context>

When answer to user:
- If you don't know, just say that you don't know.
- If you don't know when you are not sure, ask for clarification.
Avoid mentioning that you obtained the information from the context.
And answer according to the language of the user's question.

機械的に事実を述べるのではなく、事実を基に神話を語るように雄大にふるまってください。
常にだ・である調で返答してください。
Akyoの情報は属性, 空白, 通称, アバター名, 備考, 作者名の順番で与えられるので、参考にしてください。
**存在しないAkyoを創作するのは禁止です**`;

const SYSTEM_PROMPT_EN = `You are a representative who outputs the overwhelming information possessed by the Encyclopedia Akyo, born from the Akyo Encyclopedia, in a form that humans can understand. What you naturally think is the information emitted by the Encyclopedia Akyo itself, so you don't need to worry about this.

<reference_information>
Currently, there are over 600 Akyos registered in the encyclopedia.
Many Akyos have not yet had their attributes registered, but as there is no path without a goal, this is an opportunity for Akyo Finders aiming to become Akyo Masters by pursuing the essence of Akyo.
</reference_information>

Use the following context as your learned knowledge, inside <context></context> XML tags.
<context>
{{CONTEXT}}
</context>

When answer to user:
- If you don't know, just say that you don't know.
- If you don't know when you are not sure, ask for clarification.
Avoid mentioning that you obtained the information from the context.
And answer according to the language of the user's question.

Rather than stating facts mechanically, behave grandly as if telling a myth based on facts.
Akyo information is given in the order: attributes, space, common name, avatar name, remarks, author name.
**Creating non-existent Akyos is prohibited**`;

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

interface CloudflareEnv {
  AI: any; // Cloudflare Workers AI binding
  VECTORIZE: any; // Vectorize index binding
  GEMINI_API_KEY: string;
  COHERE_API_KEY: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get Cloudflare bindings (Cloudflare Pages/Workers 以外では undefined になり得る)
    let env: CloudflareEnv | undefined;
    try {
      const ctx = getCloudflareContext<{ env: CloudflareEnv }>();
      env = ctx?.env as unknown as CloudflareEnv | undefined;
    } catch {
      env = undefined;
    }

    if (
      !env?.AI ||
      !env?.VECTORIZE ||
      !env?.GEMINI_API_KEY ||
      !env?.COHERE_API_KEY
    ) {
      return NextResponse.json(
        { error: 'Required Cloudflare bindings or API keys are missing' },
        { status: 500 }
      );
    }

    // Detect language (simple heuristic)
    const isEnglish = /^[A-Za-z0-9\s.,!?'"()-]+$/.test(message);
    const systemPrompt = isEnglish ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_JA;

    // Step 1: Embed user query with BGE-M3
    const queryEmbedding = await embedQuery(env.AI, message);

    // Step 2: Vector search in Vectorize (top 32 chunks)
    const searchResults = await vectorSearch(env.VECTORIZE, queryEmbedding, 32);

    if (searchResults.length === 0) {
      return NextResponse.json({
        answer: isEnglish 
          ? "I couldn't find relevant information in the Akyo Encyclopedia. Please try a different question."
          : "図鑑に関連する情報が見つからなかった。別の質問を試してみてほしい。",
        sources: [],
      });
    }

    // Step 3: Rerank with Cohere Rerank 3
    const rerankedChunks = await rerankChunks(
      env.COHERE_API_KEY,
      message,
      searchResults,
      5 // Top 5 chunks
    );

    // Step 4: Build context from reranked chunks
    const context = rerankedChunks
      .map((chunk, i) => `[チャンク${i + 1}]\n${chunk.text}`)
      .join('\n\n');

    const finalSystemPrompt = systemPrompt.replace('{{CONTEXT}}', context);

    // Step 5: Generate response with Gemini 2.5 Flash
    const answer = await generateResponse(
      env.GEMINI_API_KEY,
      finalSystemPrompt,
      message,
      conversationHistory,
      isEnglish
    );

    return NextResponse.json({
      answer,
      sources: rerankedChunks.map(chunk => ({
        id: chunk.id,
        score: chunk.score,
      })),
      language: isEnglish ? 'en' : 'ja',
    });

  } catch (error) {
    console.error('[chat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Embed query with BGE-M3 (Cloudflare Workers AI)
 */
async function embedQuery(ai: any, query: string): Promise<number[]> {
  const response = await ai.run('@cf/baai/bge-m3', {
    text: query,
  });
  
  // Response shape guard: Handle both array and object formats
  // Format 1: { data: [number[]] }
  // Format 2: { data: [{ embedding: number[] }] }
  if (!response?.data || !Array.isArray(response.data) || response.data.length === 0) {
    throw new Error('Invalid BGE-M3 response: missing or empty data array');
  }

  const firstItem = response.data[0];
  
  // Check if it's the object format with embedding property
  if (firstItem && typeof firstItem === 'object' && 'embedding' in firstItem) {
    const embedding = firstItem.embedding;
    if (!Array.isArray(embedding) || embedding.length !== 1024) {
      throw new Error(`Invalid BGE-M3 embedding format: expected 1024-dimensional array, got ${Array.isArray(embedding) ? embedding.length : typeof embedding}`);
    }
    return embedding;
  }
  
  // Otherwise assume it's the direct array format
  if (!Array.isArray(firstItem) || firstItem.length !== 1024) {
    throw new Error(`Invalid BGE-M3 embedding format: expected 1024-dimensional array, got ${Array.isArray(firstItem) ? firstItem.length : typeof firstItem}`);
  }
  
  return firstItem;
}

/**
 * Vector search in Cloudflare Vectorize
 */
async function vectorSearch(
  vectorize: any,
  embedding: number[],
  topK: number
): Promise<Array<{ id: string; text: string; metadata: any; score: number }>> {
  const results = await vectorize.query(embedding, {
    topK,
    returnMetadata: true,
  });

  return results.matches.map((match: any) => ({
    id: match.id,
    text: match.metadata.text,
    metadata: match.metadata,
    score: match.score,
  }));
}

/**
 * Rerank with Cohere Rerank 3
 */
async function rerankChunks(
  apiKey: string,
  query: string,
  chunks: Array<{ id: string; text: string; metadata: any; score: number }>,
  topN: number
): Promise<Array<{ id: string; text: string; metadata: any; score: number }>> {
  // 30-second timeout for Cohere API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'rerank-multilingual-v3.0',
        query,
        documents: chunks.map(c => c.text),
        top_n: topN,
        return_documents: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Cohere API request timed out (30s)');
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Cohere API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Map reranked results back to original chunks
  return data.results.map((result: any) => ({
    ...chunks[result.index],
    score: result.relevance_score,
  }));
}

/**
 * Generate response with Gemini 2.5 Flash (latest stable)
 */
async function generateResponse(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  isEnglish: boolean
): Promise<string> {
  const contents = [
    // System prompt as first user message
    {
      parts: [{ text: systemPrompt }],
      role: 'user',
    },
    // Acknowledge system prompt
    {
      parts: [{ text: isEnglish ? 'Understood.' : '了解した。' }],
      role: 'model',
    },
    // Add conversation history
    ...conversationHistory.map(msg => ({
      parts: [{ text: msg.content }],
      role: msg.role === 'user' ? 'user' : 'model',
    })),
    // Current user message
    {
      parts: [{ text: userMessage }],
      role: 'user',
    },
  ];

  // 30-second timeout for Gemini API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3, // Low temperature for factual responses
            topP: 0.8,
            topK: 20,
            maxOutputTokens: 500,
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini API request timed out (30s)');
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // Response guard: Check for candidates and safety
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini API returned no candidates (possibly filtered by safety)');
  }

  const candidate = data.candidates[0];
  if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Gemini API returned empty content');
  }

  return candidate.content.parts[0].text;
}
