export const nodeKeys = {
  all: ['nodes'] as const,
  lists: () => [...nodeKeys.all, 'list'] as const,
  list: (filters: any) => [...nodeKeys.lists(), filters] as const,
}
