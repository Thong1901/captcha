export function createFaceCamera() {
  const section = document.createElement("section");
  section.className = "face-panel";
  section.hidden = true;

  const heading = document.createElement("h2");
  heading.textContent = "Xác thực khuôn mặt";
  const description = document.createElement("p");
  description.textContent = "Chụp ảnh để đăng ký mẫu hoặc so khớp với mẫu đã đăng ký. Ảnh chỉ được gửi tới Face++ khi bạn chọn một thao tác.";
  const status = document.createElement("p");
  status.className = "face-status";
  status.setAttribute("role", "status");
  status.textContent = "Camera chưa bật.";

  const video = document.createElement("video");
  video.className = "face-preview";
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.hidden = true;
  video.setAttribute("aria-label", "Hình ảnh trực tiếp từ camera");

  const snapshot = document.createElement("img");
  snapshot.className = "face-preview";
  snapshot.alt = "Ảnh khuôn mặt vừa chụp";
  snapshot.hidden = true;

  const controls = document.createElement("div");
  controls.className = "controls";
  const consentLabel = document.createElement("label");
  consentLabel.className = "face-consent";
  const consent = document.createElement("input");
  consent.type = "checkbox";
  consentLabel.append(consent, " Tôi đồng ý gửi ảnh khuôn mặt đến Face++ để tạo mẫu tham chiếu.");
  const startButton = document.createElement("button");
  startButton.type = "button";
  startButton.textContent = "Bật camera";
  const captureButton = document.createElement("button");
  captureButton.type = "button";
  captureButton.textContent = "Chụp ảnh";
  captureButton.disabled = true;
  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.textContent = "Tắt camera";
  stopButton.disabled = true;
  controls.append(startButton, captureButton, stopButton);
  const actions = document.createElement("div");
  actions.className = "controls";
  const enrollButton = document.createElement("button");
  enrollButton.type = "button";
  enrollButton.textContent = "Đăng ký khuôn mặt";
  const verifyButton = document.createElement("button");
  verifyButton.type = "button";
  verifyButton.textContent = "So khớp khuôn mặt";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Xóa mẫu khuôn mặt";
  actions.append(enrollButton, verifyButton, deleteButton);
  const disclaimer = document.createElement("p");
  disclaimer.className = "face-disclaimer";
  disclaimer.textContent = "Kết quả so khớp ảnh chưa kiểm tra người thật (PAD/liveness), nên chưa cấp quyền xác thực bổ sung.";
  section.append(heading, description, status, video, snapshot, controls, consentLabel, actions, disclaimer);

  let stream: MediaStream | null = null;
  let active = false;
  let requestId = 0;
  let snapshotUrl: string | null = null;
  let snapshotBlob: Blob | null = null;
  let configured = false;
  let enrolled = false;
  let busy = false;

  function updateActions() {
    enrollButton.disabled = !active || !configured || enrolled || !snapshotBlob || !consent.checked || busy;
    verifyButton.disabled = !active || !configured || !enrolled || !snapshotBlob || busy;
    deleteButton.disabled = !active || !configured || !enrolled || busy;
    consentLabel.hidden = enrolled;
  }

  function clearSnapshot() {
    if (snapshotUrl) URL.revokeObjectURL(snapshotUrl);
    snapshotUrl = null;
    snapshotBlob = null;
    snapshot.removeAttribute("src");
    snapshot.hidden = true;
    updateActions();
  }

  function stopCamera() {
    requestId++;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    video.hidden = true;
    startButton.disabled = !active;
    captureButton.disabled = true;
    stopButton.disabled = true;
    status.textContent = "Camera đã tắt.";
  }

  startButton.addEventListener("click", async () => {
    if (!active || stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = "Trình duyệt không hỗ trợ camera hoặc trang chưa dùng HTTPS/localhost.";
      return;
    }
    const currentRequest = ++requestId;
    startButton.disabled = true;
    status.textContent = "Đang xin quyền sử dụng camera...";
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (!active || currentRequest !== requestId) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = nextStream;
      video.srcObject = stream;
      video.hidden = false;
      clearSnapshot();
      await video.play();
      captureButton.disabled = false;
      stopButton.disabled = false;
      status.textContent = "Camera đang bật. Đưa mặt vào giữa khung hình rồi chụp ảnh.";
    } catch (error) {
      stopCamera();
      status.textContent = error instanceof DOMException && error.name === "NotAllowedError"
        ? "Bạn đã từ chối quyền camera. Hãy cấp quyền trong trình duyệt để thử lại."
        : "Không thể mở camera. Hãy kiểm tra thiết bị và thử lại.";
    }
  });

  captureButton.addEventListener("click", () => {
    if (!stream || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      status.textContent = "Camera chưa sẵn sàng. Hãy thử lại sau ít giây.";
      return;
    }
    const currentRequest = requestId;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context || !canvas.width || !canvas.height) {
      status.textContent = "Không thể chụp ảnh từ camera.";
      return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob || !active || !stream || currentRequest !== requestId) return;
      clearSnapshot();
      snapshotUrl = URL.createObjectURL(blob);
      snapshotBlob = blob;
      snapshot.src = snapshotUrl;
      snapshot.hidden = false;
      status.textContent = "Đã chụp ảnh. Ảnh hiện chỉ nằm trên thiết bị này; chưa có kết quả xác thực.";
      updateActions();
    }, "image/jpeg", 0.85);
  });

  stopButton.addEventListener("click", stopCamera);
  consent.addEventListener("change", updateActions);

  async function loadFaceStatus() {
    try {
      const response = await fetch("/api/face/status", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Không thể lấy trạng thái khuôn mặt.");
      const result = await response.json() as { configured: boolean; enrolled: boolean };
      if (!active) return;
      configured = result.configured;
      enrolled = result.enrolled;
      status.textContent = !configured
        ? "Face++ chưa được cấu hình đầy đủ. Cần FACE_API_KEY và FACE_API_SECRET trên server."
        : enrolled ? "Đã có mẫu khuôn mặt. Chụp ảnh mới để so khớp." : "Chưa có mẫu khuôn mặt. Chụp ảnh để đăng ký.";
      updateActions();
    } catch {
      if (active) status.textContent = "Không thể lấy trạng thái khuôn mặt.";
    }
  }

  async function submitFace(path: string, method: "POST" | "DELETE") {
    if (!active || busy) return;
    if (method === "POST" && !snapshotBlob) return;
    busy = true;
    updateActions();
    status.textContent = "Đang xử lý khuôn mặt...";
    try {
      const response = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: method === "POST" ? {
          "Content-Type": "image/jpeg",
          ...(path.endsWith("/enroll") ? { "X-Face-Consent": "yes" } : {}),
        } : undefined,
        body: method === "POST" ? snapshotBlob : undefined,
      });
      if (!active) return;
      if (!response.ok) {
        const errors: Record<number, string> = {
          400: "Ảnh không hợp lệ hoặc chưa đồng ý đăng ký.",
          401: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
          403: "Yêu cầu bị từ chối.",
          404: "Chưa có mẫu khuôn mặt.",
          409: "Đã có mẫu khuôn mặt. Hãy xóa mẫu cũ trước khi đăng ký lại.",
          413: "Ảnh quá lớn.",
          422: "Ảnh cần có đúng một khuôn mặt rõ nét.",
          429: "Thao tác quá nhiều lần. Hãy thử lại sau một phút.",
          502: "Face++ không xử lý được ảnh. Hãy thử lại sau.",
          503: "Face++ chưa được cấu hình đầy đủ.",
        };
        throw new Error(errors[response.status] || `Không thể xử lý ảnh (HTTP ${response.status}).`);
      }
      if (path.endsWith("/enroll")) {
        enrolled = true;
        consent.checked = false;
        status.textContent = "Đã đăng ký mẫu khuôn mặt. Hãy chụp ảnh mới để so khớp.";
        clearSnapshot();
      } else if (method === "DELETE") {
        enrolled = false;
        status.textContent = "Đã xóa mẫu khuôn mặt.";
      } else {
        const result = await response.json() as { matched: boolean; confidence: number; threshold: number };
        status.textContent = result.matched
          ? "Ảnh khớp với mẫu đã đăng ký. Chưa kiểm tra PAD/liveness, phiên đăng nhập chưa được nâng quyền."
          : "Ảnh không khớp với mẫu đã đăng ký.";
      }
    } catch (error) {
      if (active) status.textContent = error instanceof Error ? error.message : "Xử lý khuôn mặt thất bại.";
    } finally {
      busy = false;
      updateActions();
    }
  }

  enrollButton.addEventListener("click", () => { void submitFace("/api/face/enroll", "POST"); });
  verifyButton.addEventListener("click", () => { void submitFace("/api/face/verify", "POST"); });
  deleteButton.addEventListener("click", () => {
    if (window.confirm("Xóa mẫu khuôn mặt đã đăng ký trên Face++?")) {
      void submitFace("/api/face/template", "DELETE");
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && stream) stopCamera();
  });

  return {
    element: section,
    setAuthenticated(authenticated: boolean) {
      active = authenticated;
      section.hidden = !authenticated;
      if (!authenticated) {
        stopCamera();
        clearSnapshot();
        consent.checked = false;
        configured = false;
        enrolled = false;
      } else {
        startButton.disabled = false;
        void loadFaceStatus();
      }
      updateActions();
    },
  };
}
