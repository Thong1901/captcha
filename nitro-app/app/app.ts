export function setupApp(element: HTMLElement) {
  element.replaceChildren();

  const shell = document.createElement("section");
  shell.className = "shell";

  const badge = document.createElement("p");
  badge.className = "badge";
  badge.textContent = "Nitro workspace starter";

  const title = document.createElement("h1");
  title.textContent = "CAPTCHA and face verification workspace";

  const intro = document.createElement("p");
  intro.className = "intro";
  intro.textContent =
    "A compact Nitro app shell for Google sign-in, CAPTCHA challenges, face enrollment, liveness checks, and session-aware APIs.";

  const grid = document.createElement("div");
  grid.className = "feature-grid";
  grid.append(
    createFeature(
      "Authentication",
      "Google sign-in, session creation, logout, and account recovery flows.",
    ),
    createFeature(
      "Challenge flow",
      "Session-bound CAPTCHA challenges with replay protection and rate limiting.",
    ),
    createFeature(
      "Face security",
      "Face enrollment, verification, and PAD/liveness checks for high-risk actions.",
    ),
  );

  const controls = document.createElement("div");
  controls.className = "controls";

  const helloPanel = createPanel(
    "Hello endpoint",
    "Use this to verify the server is reachable.",
  );
  const helloOutput = helloPanel.querySelector("pre") as HTMLPreElement;

  const healthPanel = createPanel(
    "Health endpoint",
    "A quick readiness check for the Nitro app.",
  );
  const healthOutput = healthPanel.querySelector("pre") as HTMLPreElement;

  const helloButton = createButton("Call /api/hello", async () => {
    helloOutput.textContent = "Loading...";
    const response = await fetch("/api/hello");
    const payload = await response.json();
    helloOutput.textContent = JSON.stringify(payload, null, 2);
  });

  const healthButton = createButton("Call /api/health", async () => {
    healthOutput.textContent = "Loading...";
    const response = await fetch("/api/health");
    const payload = await response.json();
    healthOutput.textContent = JSON.stringify(payload, null, 2);
  });

  controls.append(helloButton, healthButton);

  const outputs = document.createElement("div");
  outputs.className = "output-grid";
  outputs.append(helloPanel, healthPanel);

  shell.append(badge, title, intro, grid, controls, outputs);
  element.appendChild(shell);
}

function createFeature(title: string, description: string) {
  const article = document.createElement("article");
  article.className = "feature-card";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const body = document.createElement("p");
  body.textContent = description;

  article.append(heading, body);
  return article;
}

function createPanel(title: string, description: string) {
  const article = document.createElement("article");
  article.className = "panel";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const body = document.createElement("p");
  body.textContent = description;

  const output = document.createElement("pre");
  output.textContent = "Click the button above to load a response.";

  article.append(heading, body, output);
  return article;
}

function createButton(label: string, onClick: () => Promise<void>) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => {
    void onClick();
  });
  return button;
}
