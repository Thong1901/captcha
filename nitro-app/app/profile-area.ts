type Role = { role: string; scopeUnitCode: string | null };
type AccessStatus = { canViewProfile: boolean; expiresAt: string | null; roles: Role[] };
type Profile = {
  id: string; fullName: string; dateOfBirth: string; phoneNumber: string; address: string;
  unitCode: string; status: string; hasPortrait: boolean; linked: boolean;
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function labeledInput(labelText: string, name: string, type = "text") {
  const label = element("label", labelText);
  const input = element("input");
  input.name = name;
  input.type = type;
  input.required = true;
  label.append(input);
  return { label, input };
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...options });
  if (!response.ok) throw new Error(`Yêu cầu thất bại (HTTP ${response.status}).`);
  return response;
}

export function createProfileArea() {
  const section = element("section");
  section.className = "profile-area";
  section.hidden = true;
  const heading = element("h2", "Hồ sơ quân nhân");
  const accessMessage = element("p", "Đang kiểm tra quyền xem hồ sơ...");
  accessMessage.setAttribute("role", "status");
  const refreshButton = element("button", "Kiểm tra lại quyền");
  refreshButton.type = "button";

  const selfPanel = element("section");
  selfPanel.className = "profile-card";
  selfPanel.hidden = true;
  const selfHeading = element("h3", "Hồ sơ của tôi");
  const portrait = element("img");
  portrait.className = "profile-portrait";
  portrait.alt = "Ảnh chân dung hồ sơ";
  portrait.hidden = true;
  const selfDetails = element("dl");
  selfPanel.append(selfHeading, portrait, selfDetails);

  const managerPanel = element("section");
  managerPanel.className = "profile-card";
  managerPanel.hidden = true;
  const managerHeading = element("h3", "Quản lý hồ sơ");
  const managerMessage = element("p");
  managerMessage.setAttribute("role", "status");
  const profileList = element("ul");
  profileList.className = "profile-list";
  const profileForm = element("form");
  profileForm.className = "profile-form";
  const formHeading = element("h4", "Tạo hồ sơ");
  const fullName = labeledInput("Họ tên", "fullName");
  const dateOfBirth = labeledInput("Ngày sinh", "dateOfBirth", "date");
  const phoneNumber = labeledInput("Số điện thoại", "phoneNumber", "tel");
  const address = labeledInput("Địa chỉ", "address");
  const unitCode = labeledInput("Mã đơn vị", "unitCode");
  const statusLabel = element("label", "Trạng thái");
  const profileStatus = element("select");
  profileStatus.name = "status";
  profileStatus.append(new Option("Hoạt động", "active"), new Option("Khóa", "locked"));
  statusLabel.append(profileStatus);
  const saveButton = element("button", "Lưu hồ sơ");
  saveButton.type = "submit";
  profileForm.append(formHeading, fullName.label, dateOfBirth.label, phoneNumber.label,
    address.label, unitCode.label, statusLabel, saveButton);
  const linkForm = element("form");
  linkForm.className = "profile-form";
  const linkHeading = element("h4", "Liên kết tài khoản đã đăng nhập Google");
  const linkEmail = labeledInput("Email tài khoản", "email", "email");
  const linkButton = element("button", "Liên kết");
  linkButton.type = "submit";
  linkForm.append(linkHeading, linkEmail.label, linkButton);
  linkForm.hidden = true;
  const portraitForm = element("form");
  portraitForm.className = "profile-form";
  const uploadHeading = element("h4", "Ảnh chân dung riêng tư");
  const uploadLabel = element("label", "Chọn ảnh JPEG hoặc PNG");
  const uploadInput = element("input");
  uploadInput.type = "file";
  uploadInput.accept = "image/jpeg,image/png";
  uploadInput.required = true;
  uploadLabel.append(uploadInput);
  const uploadButton = element("button", "Tải ảnh lên");
  uploadButton.type = "submit";
  portraitForm.append(uploadHeading, uploadLabel, uploadButton);
  portraitForm.hidden = true;
  managerPanel.append(managerHeading, managerMessage, profileList, profileForm, linkForm, portraitForm);

  const adminPanel = element("section");
  adminPanel.className = "profile-card";
  adminPanel.hidden = true;
  const adminHeading = element("h3", "Phân quyền cán bộ");
  const adminMessage = element("p");
  adminMessage.setAttribute("role", "status");
  const roleForm = element("form");
  roleForm.className = "profile-form";
  const roleEmail = labeledInput("Email cán bộ", "email", "email");
  const roleUnit = labeledInput("Mã đơn vị được quản lý", "scopeUnitCode");
  const roleButton = element("button", "Cấp quyền cán bộ");
  roleButton.type = "submit";
  roleForm.append(roleEmail.label, roleUnit.label, roleButton);
  adminPanel.append(adminHeading, adminMessage, roleForm);

  section.append(heading, accessMessage, refreshButton, selfPanel, managerPanel, adminPanel);
  let active = false;
  let generation = 0;
  let expiresAt = 0;
  let portraitUrl: string | null = null;
  let selectedProfile: Profile | null = null;
  let managerUnit: string | null = null;

  function clearSensitive() {
    selfPanel.hidden = true;
    managerPanel.hidden = true;
    selfDetails.replaceChildren();
    profileList.replaceChildren();
    selectedProfile = null;
    linkForm.hidden = true;
    portraitForm.hidden = true;
    if (portraitUrl) URL.revokeObjectURL(portraitUrl);
    portraitUrl = null;
    portrait.removeAttribute("src");
    portrait.hidden = true;
    expiresAt = 0;
  }

  function renderProfile(profile: Profile) {
    selfDetails.replaceChildren();
    for (const [label, value] of [
      ["Họ tên", profile.fullName], ["Ngày sinh", formatDate(profile.dateOfBirth)],
      ["Số điện thoại", profile.phoneNumber], ["Địa chỉ", profile.address],
      ["Đơn vị", profile.unitCode],
    ]) {
      selfDetails.append(element("dt", label), element("dd", value));
    }
    selfPanel.hidden = false;
  }

  async function loadPortrait(generationAtStart: number) {
    try {
      const response = await api("/api/me/military-profile/portrait");
      const blob = await response.blob();
      if (!active || generation !== generationAtStart || Date.now() >= expiresAt) return;
      if (portraitUrl) URL.revokeObjectURL(portraitUrl);
      portraitUrl = URL.createObjectURL(blob);
      portrait.src = portraitUrl;
      portrait.hidden = false;
    } catch { portrait.hidden = true; }
  }

  async function loadManagerProfiles(generationAtStart: number) {
    try {
      const response = await api("/api/admin/military-profiles");
      const profiles = await response.json() as Profile[];
      if (!active || generation !== generationAtStart || Date.now() >= expiresAt) return;
      profileList.replaceChildren();
      for (const profile of profiles) {
        const item = element("li");
        const button = element("button", `${profile.fullName} · ${profile.unitCode} · ${profile.status}`);
        button.type = "button";
        button.addEventListener("click", () => {
          selectedProfile = profile;
          formHeading.textContent = "Cập nhật hồ sơ";
          fullName.input.value = profile.fullName;
          dateOfBirth.input.value = profile.dateOfBirth;
          phoneNumber.input.value = profile.phoneNumber;
          address.input.value = profile.address;
          unitCode.input.value = profile.unitCode;
          profileStatus.value = profile.status;
          linkForm.hidden = profile.linked;
          portraitForm.hidden = false;
        });
        item.append(button);
        profileList.append(item);
      }
      managerMessage.textContent = `${profiles.length} hồ sơ trong đơn vị ${managerUnit}.`;
    } catch { if (active) managerMessage.textContent = "Không tải được danh sách hồ sơ."; }
  }

  async function refresh() {
    if (!active) return;
    const current = ++generation;
    try {
      const response = await api("/api/auth/access-status");
      const access = await response.json() as AccessStatus;
      if (!active || current !== generation) return;
      adminPanel.hidden = !access.roles.some((role) => role.role === "system_admin");
      managerUnit = access.roles.find((role) => role.role === "manager")?.scopeUnitCode || null;
      clearSensitive();
      if (!access.canViewProfile || !access.expiresAt || Date.parse(access.expiresAt) <= Date.now()) {
        accessMessage.textContent = "Hồ sơ đang khóa. Cần xác minh khuôn mặt và PAD/liveness để được xem trong 5 phút.";
        return;
      }
      expiresAt = Date.parse(access.expiresAt);
      accessMessage.textContent = `Quyền xem có hiệu lực đến ${new Date(expiresAt).toLocaleTimeString("vi-VN")}.`;
      try {
        const profileResponse = await api("/api/me/military-profile");
        const profile = await profileResponse.json() as Profile;
        if (active && current === generation && Date.now() < expiresAt) {
          renderProfile(profile);
          if (profile.hasPortrait) void loadPortrait(current);
        }
      } catch { if (active) accessMessage.textContent += " Chưa có hồ sơ cá nhân được liên kết."; }
      if (managerUnit && active && current === generation && Date.now() < expiresAt) {
        managerPanel.hidden = false;
        unitCode.input.value = managerUnit;
        void loadManagerProfiles(current);
      }
    } catch {
      if (active && current === generation) {
        clearSensitive();
        accessMessage.textContent = "Không kiểm tra được quyền xem hồ sơ.";
      }
    }
  }

  refreshButton.addEventListener("click", () => { void refresh(); });
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!active || Date.now() >= expiresAt) { void refresh(); return; }
    const payload = {
      fullName: fullName.input.value, dateOfBirth: dateOfBirth.input.value,
      phoneNumber: phoneNumber.input.value, address: address.input.value,
      unitCode: unitCode.input.value, status: profileStatus.value,
    };
    try {
      await api(selectedProfile ? `/api/admin/military-profiles/${selectedProfile.id}` : "/api/admin/military-profiles", {
        method: selectedProfile ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      managerMessage.textContent = "Đã lưu hồ sơ.";
      selectedProfile = null;
      formHeading.textContent = "Tạo hồ sơ";
      profileForm.reset();
      if (managerUnit) unitCode.input.value = managerUnit;
      linkForm.hidden = true;
      portraitForm.hidden = true;
      void loadManagerProfiles(generation);
    } catch (error) { managerMessage.textContent = error instanceof Error ? error.message : "Không lưu được hồ sơ."; }
  });
  linkForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedProfile || Date.now() >= expiresAt) { void refresh(); return; }
    try {
      await api(`/api/admin/military-profiles/${selectedProfile.id}/link-account`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: linkEmail.input.value }),
      });
      managerMessage.textContent = "Đã liên kết tài khoản.";
      linkForm.hidden = true;
      void loadManagerProfiles(generation);
    } catch (error) { managerMessage.textContent = error instanceof Error ? error.message : "Không liên kết được tài khoản."; }
  });
  portraitForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = uploadInput.files?.[0];
    if (!selectedProfile || !file || Date.now() >= expiresAt) { void refresh(); return; }
    if (file.size > 4_000_000 || !["image/jpeg", "image/png"].includes(file.type)) {
      managerMessage.textContent = "Chỉ nhận ảnh JPEG/PNG tối đa 4 MB.";
      return;
    }
    try {
      await api(`/api/admin/military-profiles/${selectedProfile.id}/portrait`, {
        method: "POST", headers: { "Content-Type": file.type }, body: file,
      });
      managerMessage.textContent = "Đã tải ảnh chân dung.";
      portraitForm.reset();
      void loadManagerProfiles(generation);
    } catch (error) { managerMessage.textContent = error instanceof Error ? error.message : "Không tải được ảnh."; }
  });
  roleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!active) return;
    try {
      await api("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: roleEmail.input.value, role: "manager", scopeUnitCode: roleUnit.input.value }) });
      adminMessage.textContent = "Đã cấp quyền cán bộ.";
      roleForm.reset();
      void refresh();
    } catch (error) { adminMessage.textContent = error instanceof Error ? error.message : "Không cấp được quyền."; }
  });

  const timer = window.setInterval(() => {
    if (!active) return;
    if (expiresAt && Date.now() >= expiresAt) {
      ++generation;
      clearSensitive();
      accessMessage.textContent = "Quyền xem đã hết hạn. Cần xác minh lại.";
    }
    if (document.visibilityState === "visible") void refresh();
  }, 15000);
  void timer;

  return {
    element: section,
    setAuthenticated(authenticated: boolean) {
      active = authenticated;
      ++generation;
      section.hidden = !authenticated;
      if (!authenticated) {
        clearSensitive();
        adminPanel.hidden = true;
        accessMessage.textContent = "Chưa đăng nhập.";
      } else {
        accessMessage.textContent = "Đang kiểm tra quyền xem hồ sơ...";
        void refresh();
      }
    },
  };
}
