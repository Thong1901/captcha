export class ApiError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`)
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(response.status)
  }
  if (response.status === 204) return undefined as T
  const body = await response.text()
  return (body ? JSON.parse(body) : undefined) as T
}

export function errorMessage(error: unknown, context = 'Yêu cầu'): string {
  if (!(error instanceof ApiError)) return 'Không kết nối được máy chủ. Vui lòng thử lại.'
  const messages: Record<number, string> = {
    400: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra ảnh và lựa chọn đồng ý.',
    401: 'Phiên đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn chưa có quyền thực hiện thao tác này. Kiểm tra cấu hình Origin nếu mọi yêu cầu ghi đều lỗi.',
    404: 'Không tìm thấy dữ liệu cần thiết.',
    409: 'Dữ liệu đã tồn tại hoặc đang xung đột.',
    413: 'Ảnh quá lớn. Vui lòng chụp lại.',
    415: 'Ảnh phải là JPEG.',
    422: 'Ảnh chưa đạt chất lượng hoặc không có đúng một khuôn mặt.',
    429: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một phút.',
    502: 'Dịch vụ nhận diện khuôn mặt đang lỗi.',
    503: 'Dịch vụ chưa sẵn sàng.',
  }
  return `${context} thất bại. ${messages[error.status] || `Máy chủ trả về HTTP ${error.status}.`}`
}
