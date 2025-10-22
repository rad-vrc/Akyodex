#!/usr/bin/env node
/**
 * Upload prepared data to Cloudflare Vectorize
 * 
 * This script:
 * 1. Reads vectorize-data.json
 * 2. Generates embeddings using Cloudflare Workers AI (BGE-M3)
 * 3. Uploads vectors to Vectorize in batches
 * 
 * Prerequisites:
 * - CLOUDFLARE_ACCOUNT_ID environment variable
 * - CLOUDFLARE_API_TOKEN environment variable
 * - Vectorize index "akyo-index" created
 * 
 * Usage:
 *   CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_API_TOKEN=yyy node scripts/upload-to-vectorize.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Configuration
const VECTORIZE_INDEX_NAME = 'akyo-index';
const BATCH_SIZE = 100; // Process 100 records at a time
const EMBEDDING_MODEL = '@cf/baai/bge-m3'; // BGE-M3 multilingual model

// Get credentials from environment
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('❌ Error: Missing environment variables');
  console.error('   Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
  console.error('\nExample:');
  console.error('  export CLOUDFLARE_ACCOUNT_ID=your-account-id');
  console.error('  export CLOUDFLARE_API_TOKEN=your-api-token');
  process.exit(1);
}

// Load data
console.log('📂 Loading vectorize-data.json...');
const dataPath = join(projectRoot, 'data/vectorize-data.json');
const vectorData = JSON.parse(readFileSync(dataPath, 'utf-8'));
console.log(`✅ Loaded ${vectorData.length} records`);

/**
 * Generate embeddings using Workers AI
 */
async function generateEmbeddings(texts) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${EMBEDDING_MODEL}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts, // BGE-M3 supports batch processing
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Workers AI API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  // Workers AI returns { result: { data: [[embedding1], [embedding2], ...] } }
  if (!result.success || !result.result || !result.result.data) {
    throw new Error('Unexpected Workers AI response format');
  }

  return result.result.data; // Array of embeddings
}

/**
 * Upload vectors to Vectorize
 */
async function uploadVectors(vectors) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/vectorize/v2/indexes/${VECTORIZE_INDEX_NAME}/insert`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vectors,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vectorize API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Chunk array into batches
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Main upload process
 */
async function main() {
  console.log('\n🚀 Starting upload process...\n');
  
  const batches = chunkArray(vectorData, BATCH_SIZE);
  let totalProcessed = 0;
  let totalErrors = 0;

  for (const [batchIndex, batch] of batches.entries()) {
    const batchNum = batchIndex + 1;
    const totalBatches = batches.length;
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} records)`);
    
    try {
      // Step 1: Generate embeddings
      console.log('  🔄 Generating embeddings with BGE-M3...');
      const texts = batch.map(item => item.text);
      const embeddings = await generateEmbeddings(texts);
      
      if (embeddings.length !== batch.length) {
        throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${embeddings.length}`);
      }
      
      console.log(`  ✅ Generated ${embeddings.length} embeddings`);
      
      // Step 2: Prepare vectors for Vectorize
      const vectors = batch.map((item, idx) => ({
        id: item.id,
        values: embeddings[idx],
        metadata: {
          text: item.text, // Store full text for retrieval
          ...item.metadata,
        },
      }));
      
      // Step 3: Upload to Vectorize
      console.log('  🔄 Uploading to Vectorize...');
      await uploadVectors(vectors);
      console.log(`  ✅ Uploaded batch ${batchNum}/${totalBatches}`);
      
      totalProcessed += batch.length;
      
      // Rate limiting: wait a bit between batches
      if (batchNum < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
      }
      
    } catch (error) {
      console.error(`  ❌ Error in batch ${batchNum}:`, error.message);
      totalErrors += batch.length;
    }
  }
  
  console.log('\n\n📊 Upload Summary:');
  console.log(`  ✅ Successfully processed: ${totalProcessed} records`);
  console.log(`  ❌ Errors: ${totalErrors} records`);
  console.log(`  📈 Success rate: ${Math.round((totalProcessed / vectorData.length) * 100)}%`);
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Some records failed to upload. Check errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All records uploaded successfully!');
    console.log('\n🚀 Next steps:');
    console.log('  1. Add Vectorize binding to wrangler.toml:');
    console.log('     [[vectorize]]');
    console.log('     binding = "VECTORIZE"');
    console.log('     index_name = "akyo-index"');
    console.log('  2. Add environment variables for API keys');
    console.log('  3. Deploy and test the chatbot');
  }
}

// Run
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
