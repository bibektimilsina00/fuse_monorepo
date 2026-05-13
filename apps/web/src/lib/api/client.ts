import axios, { AxiosRequestConfig } from 'axios'
import { z } from 'zod'

/**
 * Fuse API Client
 * 
 * A wrapper around axios that provides type-safe requests and response 
 * validation using Zod.
 */

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Perform a type-safe API request and validate the response against a Zod schema.
 * 
 * @param schema - The Zod schema to validate the response against
 * @param config - Axios request configuration
 * @returns The validated and typed response data
 */
export async function requestJson<T>(
  schema: z.ZodSchema<T>,
  config: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.request(config)
  
  // Validate the response against the provided schema
  const result = schema.safeParse(response.data)
  
  if (!result.success) {
    console.error('API Response Validation Failed:', result.error)
    throw new Error('API contract violation: The server returned an unexpected response format.')
  }
  
  return result.data
}

export default apiClient
