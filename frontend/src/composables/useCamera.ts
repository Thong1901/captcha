import { onBeforeUnmount, ref, type Ref } from 'vue'

export function useCamera(video: Ref<HTMLVideoElement | null>) {
  const image = ref<Blob | null>(null)
  const imageUrl = ref<string | null>(null)
  const active = ref(false)
  const error = ref('')
  let stream: MediaStream | null = null
  let opening = false
  let disposed = false

  function clearImage() {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = null
    image.value = null
  }
  function stop() {
    opening = false
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
    if (video.value) video.value.srcObject = null
    active.value = false
  }
  async function start() {
    if (active.value || opening) return
    error.value = ''
    clearImage()
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'Camera chỉ hoạt động trên localhost hoặc HTTPS và cần trình duyệt hỗ trợ.'
      return
    }
    opening = true
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (disposed || !opening) {
        next.getTracks().forEach((track) => track.stop())
        return
      }
      stream = next
      if (!video.value) throw new Error('Không tìm thấy khung xem camera.')
      video.value.srcObject = next
      await video.value.play()
      active.value = true
    } catch (cause) {
      stop()
      const name = cause instanceof DOMException ? cause.name : ''
      error.value = name === 'NotAllowedError' ? 'Bạn đã từ chối quyền camera. Hãy cấp quyền trong trình duyệt.'
        : name === 'NotFoundError' ? 'Không tìm thấy camera trên thiết bị.'
        : name === 'NotReadableError' ? 'Camera đang được ứng dụng khác sử dụng.'
        : 'Không thể bật camera. Vui lòng kiểm tra thiết bị và thử lại.'
    } finally { opening = false }
  }
  async function capture() {
    const source = video.value
    if (!source || !active.value) return
    if (!source.videoWidth || !source.videoHeight) {
      error.value = 'Camera chưa sẵn sàng. Vui lòng đợi một chút.'
      return
    }
    const scale = Math.min(1, 1280 / Math.max(source.videoWidth, source.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(source.videoWidth * scale)
    canvas.height = Math.round(source.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size > 2_000_000) {
      error.value = 'Ảnh vượt quá 2 MB hoặc không thể tạo JPEG. Vui lòng chụp lại.'
      return
    }
    clearImage()
    image.value = blob
    imageUrl.value = URL.createObjectURL(blob)
    stop()
  }
  const onHidden = () => { if (document.hidden) stop() }
  const onClear = () => { stop(); clearImage() }
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('sensitive-clear', onClear)
  onBeforeUnmount(() => {
    disposed = true
    stop()
    clearImage()
    document.removeEventListener('visibilitychange', onHidden)
    window.removeEventListener('sensitive-clear', onClear)
  })
  return { video, image, imageUrl, active, error, start, stop, capture, clearImage }
}
