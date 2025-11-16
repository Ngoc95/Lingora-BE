export const getCefrByLevel = (level?: string | null): string[] => {
  if (!level) return []

  switch (level.toUpperCase()) {
    case 'BEGINNER':
      return ['A1', 'A2']
    case 'INTERMEDIATE':
      return ['B1', 'B2']
    case 'ADVANCED':
      return ['C1', 'C2']
    default:
      return []
  }
}
