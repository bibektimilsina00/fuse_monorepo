import type { ToolConfig } from '../types'

export const httpRequestTool: ToolConfig = {
  id: 'http_request',
  name: 'HTTP Request',
  description: 'Make an HTTP request to any URL',
  category: 'builtin',
  icon: 'Globe',
  color: '#2563eb',
  properties: [
    {
      name: 'url',
      label: 'URL',
      type: 'string',
      required: true,
      placeholder: 'https://api.example.com/endpoint',
    },
    {
      name: 'method',
      label: 'Method',
      type: 'options',
      default: 'GET',
      visibility: 'user-only',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' },
      ],
    },
    {
      name: 'headers',
      label: 'Headers',
      type: 'key-value',
      visibility: 'user-only',
      description: 'HTTP request headers.',
    },
    {
      name: 'body',
      label: 'Body',
      type: 'json',
      description: 'Request body as JSON.',
      condition: { field: 'method', value: ['POST', 'PUT', 'PATCH'] },
    },
  ],
}
