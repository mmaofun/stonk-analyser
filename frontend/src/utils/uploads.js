export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
export const SUPPORTED_EXTENSIONS = ['pdf', 'md', 'markdown', 'txt', ...IMAGE_EXTENSIONS]
export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.map(extension => `.${extension}`).join(',')
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_IMAGES = 4

const extensionOf = file => file.name.split('.').pop().toLowerCase()
export const isImageFile = file => IMAGE_EXTENSIONS.includes(extensionOf(file))

export function uploadError(file, existingFiles) {
  if (!SUPPORTED_EXTENSIONS.includes(extensionOf(file))) return 'unsupportedFile'
  if (isImageFile(file) && file.size > MAX_IMAGE_BYTES) return 'imageTooLarge'
  if (isImageFile(file) && existingFiles.filter(isImageFile).length >= MAX_IMAGES) return 'tooManyImages'
  return null
}
