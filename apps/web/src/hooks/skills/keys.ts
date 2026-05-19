export const skillKeys = {
  all: ['skills'] as const,
  lists: () => [...skillKeys.all, 'list'] as const,
  detail: (id: string) => [...skillKeys.all, 'detail', id] as const,
}
