const AVATAR_SIZE = 128

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    }

    return entities[character] ?? character
  })

const getInitials = (fullName: string) => {
  const names = fullName.trim().split(/\s+/).filter(Boolean)

  if (names.length === 0) {
    return '?'
  }

  const initials =
    names.length === 1 ? names[0]?.slice(0, 2) : `${names[0]?.[0]}${names[names.length - 1]?.[0]}`
  return initials?.toLocaleUpperCase() || '?'
}

const encodeBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

export const createAvatar = (fullName: string, random = Math.random) => {
  const hue = Math.floor(random() * 360)
  const initials = escapeXml(getInitials(fullName))
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" viewBox="0 0 ${AVATAR_SIZE} ${AVATAR_SIZE}">`,
    `<rect width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" rx="${AVATAR_SIZE / 2}" fill="hsl(${hue} 60% 45%)"/>`,
    `<text x="50%" y="50%" dy=".35em" text-anchor="middle" fill="white" font-family="system-ui, sans-serif" font-size="48" font-weight="700">${initials}</text>`,
    '</svg>',
  ].join('')

  return `data:image/svg+xml;base64,${encodeBase64(svg)}`
}
