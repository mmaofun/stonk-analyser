import { onBeforeUnmount, ref, watch } from 'vue'
import { apiFetch, publicMode } from '../api/platform'

// Browser <img> requests cannot attach a bearer. Keep private blobs in memory,
// revoke them on selection/unmount, and discard late responses from prior pages.
export function usePrivateImages(paths) {
  const urls = ref([]), failed = ref(false)
  let controller, generation = 0
  const release = () => { if (publicMode) urls.value.forEach(url => url && URL.revokeObjectURL(url)); urls.value = [] }
  // Replacing a polled run must not refetch/revoke the same saved images.
  watch(() => JSON.stringify(paths()), async signature => {
    const values = JSON.parse(signature)
    controller?.abort(); controller = new AbortController()
    const token = ++generation
    release(); failed.value = false
    if (!publicMode) { urls.value = values; return }
    await Promise.all(values.map(async (path, index) => {
      try {
        const response = await apiFetch(path, { signal: controller.signal })
        if (!response.ok) throw new Error('Image unavailable')
        const blob = await response.blob()
        if (token === generation) urls.value[index] = URL.createObjectURL(blob)
      } catch (error) { if (token === generation && error.name !== 'AbortError') failed.value = true }
    }))
  }, { immediate: true })
  onBeforeUnmount(() => { generation++; controller?.abort(); release() })
  return { urls, failed }
}
