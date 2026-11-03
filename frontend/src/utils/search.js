export function matchesSearch(query, ...fields) {
  const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
  const words = normalize(query).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = normalize(fields.join(' '))
  return words.every((word) => haystack.includes(word))
}
