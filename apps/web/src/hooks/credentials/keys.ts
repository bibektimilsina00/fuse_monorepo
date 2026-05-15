export const credentialKeys = {
  all: ['credentials'] as const,
  lists: () => [...credentialKeys.all, 'list'] as const,
  detail: (id: string) => [...credentialKeys.all, 'detail', id] as const,
}
