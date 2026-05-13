import type { NodeDefinition } from './registry'

export const HttpRequestNode: NodeDefinition = {
  type: 'action.http_request',
  name: 'HTTP Request',
  category: 'action',
  description: 'Send an HTTP request to any URL',
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
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ],
    },
    { name: 'headers', label: 'Headers', type: 'json', required: false },
    {
      name: 'body',
      label: 'Body',
      type: 'json',
      required: false,
      condition: { field: 'method', value: ['POST', 'PUT', 'PATCH'] },
    },
    { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 30, mode: 'advanced' },
  ],
  inputs: 1,
  outputs: 1,
}
