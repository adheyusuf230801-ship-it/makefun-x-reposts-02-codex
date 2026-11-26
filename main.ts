import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Resolve the configured source and destination directories.
function resolveDirectories(): { sourceDirectory: string; outputDirectory: string } {
  return {
    sourceDirectory: process.env.MAKEFUN_BOT_DIR ?? '/bot',
    outputDirectory: process.env.MAKEFUN_OUTPUT_DIR ?? '/output',
  };
}

// Parse POSTS.json and require one to fifteen valid X post addresses.
function validatePostList(contents: Buffer): void {
  let value: unknown;

  try {
    value = JSON.parse(contents.toString('utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`POSTS.json is not valid JSON: ${detail}`);
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('POSTS.json must contain a JSON object.');
  }

  const posts = (value as { posts?: unknown }).posts;
  if (!Array.isArray(posts)) {
    throw new Error('POSTS.json must have a "posts" array.');
  }
  if (posts.length < 1 || posts.length > 15) {
    throw new Error('The "posts" array must contain between 1 and 15 entries.');
  }

  const addressPattern = /^https:\/\/(?:x\.com|twitter\.com)\/[A-Za-z0-9_]{1,15}\/status\/\d+$/;
  for (let index = 0; index < posts.length; index += 1) {
    if (typeof posts[index] !== 'string') {
      throw new Error(`The "posts" entry at index ${index} must be a string.`);
    }
    if (!addressPattern.test(posts[index])) {
      throw new Error(`The "posts" entry at index ${index} must be an X post address.`);
    }
  }
}

// Read and validate the original file bytes that will be copied.
function readValidatedPosts(sourceDirectory: string): Buffer {
  const contents = readFileSync(join(sourceDirectory, 'POSTS.json'));
  validatePostList(contents);
  return contents;
}

// Create the destination directory and write the original bytes unchanged.
function copyPosts(contents: Buffer, outputDirectory: string): void {
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, 'POSTS.json'), contents);
}

// Run the validation and copy, reporting failures with a nonzero exit status.
function main(): void {
  try {
    const { sourceDirectory, outputDirectory } = resolveDirectories();
    const contents = readValidatedPosts(sourceDirectory);
    copyPosts(contents, outputDirectory);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to process POSTS.json: ${message}`);
    process.exit(1);
  }
}

main();
