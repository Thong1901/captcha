import { createFaceCamera } from "./face-camera.ts";
import { createProfileArea } from "./profile-area.ts";

type User = { id: string; email: string; name: string | null };
type SessionResponse = { authenticated: boolean; user: User | null };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(parent: HTMLElement, options: { theme: string; size: string }): void;
        };
      };
    };
  }
}

async function loadGoogleScript() {
  if (window.google) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google Sign-In"));
    document.head.append(script);
  });
}

export async function setupApp(element: HTMLElement) {
  element.replaceChildren();
  const shell = document.createElement("section");
  shell.className = "shell";
  const title = document.createElement("h1");
  title.textContent = "CAPTCHA và xác thực khuôn mặt";
  const intro = document.createElement("p");
  intro.className = "intro";
  intro.textContent = "Đăng nhập Google để bắt đầu bước camera và xác thực khuôn mặt.";
  const status = document.createElement("p");
  status.className = "status";
  status.setAttribute("role", "status");
  status.textContent = "Đang kiểm tra phiên đăng nhập...";
  const googleButton = document.createElement("div");
  googleButton.className = "google-button";
  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.textContent = "Đăng xuất";
  logoutButton.hidden = true;
  const faceCamera = createFaceCamera();
  const profileArea = createProfileArea();

  function showSession(session: SessionResponse) {
    googleButton.hidden = session.authenticated;
    logoutButton.hidden = !session.authenticated;
    faceCamera.setAuthenticated(session.authenticated);
    profileArea.setAuthenticated(session.authenticated);
    status.textContent = session.authenticated
      ? `Đã đăng nhập: ${session.user?.name || session.user?.email}`
      : "Chưa đăng nhập.";
  }

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Không thể đăng xuất");
      showSession({ authenticated: false, user: null });
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Đăng xuất thất bại";
    }
  });

  shell.append(title, intro, status, googleButton, logoutButton, faceCamera.element, profileArea.element);
  element.append(shell);

  try {
    const [sessionResponse, configResponse] = await Promise.all([
      fetch("/api/auth/session"),
      fetch("/api/auth/config"),
    ]);
    if (!sessionResponse.ok || !configResponse.ok) throw new Error("Không thể kết nối dịch vụ đăng nhập");
    const session = await sessionResponse.json() as SessionResponse;
    const config = await configResponse.json() as { enabled: boolean; googleClientId: string; appOrigin: string };
    if (window.location.origin !== config.appOrigin) {
      const target = new URL(window.location.pathname + window.location.search + window.location.hash, config.appOrigin);
      window.location.replace(target.href);
      return;
    }
    showSession(session);
    if (!config.enabled) {
      status.textContent = session.authenticated
        ? status.textContent
        : "Chưa cấu hình GOOGLE_CLIENT_ID. Xem hướng dẫn trong README.";
      return;
    }
    await loadGoogleScript();
    if (!window.google) throw new Error("Không thể khởi tạo Google Sign-In");
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async ({ credential }) => {
        try {
          status.textContent = "Đang xác minh Google...";
          const response = await fetch("/api/auth/google/credential", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ credential }),
          });
          if (!response.ok) {
            const details: Record<number, string> = {
              400: "Dữ liệu đăng nhập không hợp lệ.",
              401: "Google token không được chấp nhận. Hãy thử đăng nhập lại.",
              403: "Yêu cầu không được phép hoặc tài khoản đã bị khóa.",
              409: "Email đã thuộc một tài khoản khác.",
              503: "Dịch vụ đăng nhập chưa được cấu hình.",
            };
            throw new Error(`Đăng nhập thất bại (HTTP ${response.status}). ${details[response.status] || "Vui lòng thử lại."}`);
          }
          showSession(await response.json() as SessionResponse);
        } catch (error) {
          status.textContent = error instanceof Error ? error.message : "Đăng nhập thất bại";
        }
      },
    });
    window.google.accounts.id.renderButton(googleButton, { theme: "outline", size: "large" });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Không thể tải ứng dụng";
  }
}
