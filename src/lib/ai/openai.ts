import OpenAI from 'openai'
import { getRequiredEnv } from '@/lib/env'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: getRequiredEnv('OPENAI_API_KEY'),
    })
  }
  return _client
}

export function getAiModel(): string {
  return process.env.AI_MODEL ?? 'gpt-4.1-mini'
}
