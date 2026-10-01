const input = document.querySelector(".chat-input textarea");
const button = document.querySelector(".chat-input button");
const messages = document.querySelector(".chat-messages");

function sendMessage() {
    const text = input.value.trim();

        if (text === "") {
                return;
                    }

                        // 显示我的消息
                            const userRow = document.createElement("div");
                            userRow.className = "message-row user-row";

                            const userContent = document.createElement("div");

                            const userName = document.createElement("div");
                            userName.className = "user-name";
                            userName.textContent = "我";

                            const userMessage = document.createElement("div");
                            userMessage.className = "message user-message";
                            userMessage.textContent = text;

                            userContent.appendChild(userName);
                            userContent.appendChild(userMessage);

                            const userAvatar = document.createElement("div");
                            userAvatar.className = "avatar user-avatar";
                            userAvatar.textContent = "♡";

                            userRow.appendChild(userContent);
                            userRow.appendChild(userAvatar);

                            messages.appendChild(userRow);

                                            // 清空输入框
                                                input.value = "";

                                                    // 假 AI 回复
                                                        const typingMessage = document.createElement("div");
                                                        typingMessage.className = "message ai-message typing";
                                                        typingMessage.textContent = "正在输入……";
                                                        messages.appendChild(typingMessage);
                                                        setTimeout(function () {
                                                                const aiRow = document.createElement("div");
                                                                aiRow.className = "message-row ai-row";

                                                                const avatar = createAvatarElement("ai", false);

                                                                const aiContent = document.createElement("div");

                                                                const aiName = document.createElement("div");
                                                                aiName.className = "ai-name";
                                                                aiName.textContent = "小屋 AI";

                                                                const aiMessage = document.createElement("div");
                                                                aiMessage.className = "message ai-message";

                                                                const reply = getAIReply(text);
                                                                aiMessage.textContent = reply;

                                                                aiContent.appendChild(aiName);
                                                                aiContent.appendChild(aiMessage);

                                                                aiRow.appendChild(avatar);
                                                                aiRow.appendChild(aiContent);

                                                                messages.appendChild(aiRow);
                                                                                        applyCustomBubbles();

                                                                                                // 自动滚动到底部
                                                                                                        messages.scrollTop = messages.scrollHeight;
                                                                                                            }, 600);
                                                                                                            }

                                                                                                            // 点击发送
                                                                                                            button.addEventListener("click", sendMessage);

                                                                                                            // 按 Enter 发送
                                                                                                            input.addEventListener("keydown", function (event) {
                                                                                                                    if (event.key === "Enter" && !event.shiftKey) {
                                                                                                                            event.preventDefault();
                                                                                                                                    sendMessage();
                                                                                                                                        }
                                                                                                                                        });
                                                                                                            
                                                                                                                            function getAIReply(text) {
                                                                                                                                    const message = text.toLowerCase();

                                                                                                                                        if (message.includes("你好") || message.includes("嗨")) {
                                                                                                                                                return "你好呀～欢迎回到我的小屋 ♡";
                                                                                                                                                    }

                                                                                                                                                        if (message.includes("你是谁")) {
                                                                                                                                                                return "我是住在这个小屋里的小 AI～";
                                                                                                                                                                    }

                                                                                                                                                                        if (message.includes("晚安")) {
                                                                                                                                                                                return "晚安呀～祝你做个甜甜的梦 🌙";
                                                                                                                                                                                    }

                                                                                                                                                                                        if (message.includes("谢谢")) {
                                                                                                                                                                                                return "不用客气呀～♡";
                                                                                                                                                                                                    }

                                                                                                                                                                                                        return "唔……让我想想怎么回答你～";
     


                                                                                                                                                                                                  }
    // ===== v0.2 小屋主菜单 =====
const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const menuClose = document.getElementById("menuClose");
const menuItems = document.querySelectorAll(".menu-item");
const menuPlaceholder = document.getElementById("menuPlaceholder");
const chatPage = document.getElementById("chatPage");
const appearancePage = document.getElementById("appearancePage");
const appearanceBack = document.getElementById("appearanceBack");
const bubbleAnimationToggle = document.getElementById("bubbleAnimationToggle");
const ribbonBubbleChoice = document.getElementById("ribbonBubbleChoice");

function openMenu() {
    sideMenu.classList.add("open");
    menuOverlay.classList.add("open");
}

function closeMenu() {
    sideMenu.classList.remove("open");
    menuOverlay.classList.remove("open");
}

if (menuButton) {
    menuButton.addEventListener("click", openMenu);
}

if (menuClose) {
    menuClose.addEventListener("click", closeMenu);
}

if (menuOverlay) {
    menuOverlay.addEventListener("click", closeMenu);
}

const pageNames = {
    "chat": "聊天",
    "ai-settings": "AI 设置",
    "appearance": "外观装修",
    "api": "API 管理",
    "memory": "数据与记忆",
    "about": "关于小屋"
};

menuItems.forEach(function (item) {
    item.addEventListener("click", function () {
        const page = item.dataset.page;

        menuItems.forEach(function (other) {
            other.classList.remove("active");
        });
        item.classList.add("active");

        if (page === "chat") {
            showChatPage();
        } else if (page === "appearance") {
            showAppearancePage();
        } else {
            chatPage.classList.remove("hidden");
            appearancePage.classList.add("hidden");
            menuPlaceholder.innerHTML = `
                <div class="placeholder-icon">✨</div>
                <div class="placeholder-title">${pageNames[page]}</div>
                <div class="placeholder-text">这个页面先留好位置。下一步我们会把真正的功能放进这里。</div>
            `;
            menuPlaceholder.classList.add("show");
        }

        closeMenu();
    });
});



// ===== 🎨 外观装修：第一款动态气泡 =====
function showChatPage() {
    chatPage.classList.remove("hidden");
    appearancePage.classList.add("hidden");
    menuPlaceholder.classList.remove("show");
}

function showAppearancePage() {
    chatPage.classList.add("hidden");
    appearancePage.classList.remove("hidden");
    menuPlaceholder.classList.remove("show");
}

if (appearanceBack) {
    appearanceBack.addEventListener("click", function () {
        showChatPage();
        menuItems.forEach(function (item) {
            item.classList.toggle("active", item.dataset.page === "chat");
        });
    });
}

function applyRibbonBubble(enabled) {
    document.body.classList.toggle("ribbon-bubbles", enabled);
}

applyRibbonBubble(true);

if (bubbleAnimationToggle) {
    bubbleAnimationToggle.addEventListener("change", function () {
        applyRibbonBubble(bubbleAnimationToggle.checked);
    });
}

if (ribbonBubbleChoice) {
    ribbonBubbleChoice.addEventListener("click", function () {
        ribbonBubbleChoice.classList.add("selected");
        applyRibbonBubble(true);
        if (bubbleAnimationToggle) {
            bubbleAnimationToggle.checked = true;
        }
    });
}


// ===== 🖼️ 头像与头像框自定义 =====
const avatarStorageKey = "myAiHomeAvatarSettings";
const avatarFrameAnimationToggle = document.getElementById("avatarFrameAnimationToggle");
const userAvatarInput = document.getElementById("userAvatarInput");
const aiAvatarInput = document.getElementById("aiAvatarInput");
const userAvatarFrameInput = document.getElementById("userAvatarFrameInput");
const aiAvatarFrameInput = document.getElementById("aiAvatarFrameInput");

const avatarSettings = {
    userImage: "",
    aiImage: "",
    userFrame: "",
    aiFrame: "",
    frameAnimation: true
};

function loadAvatarSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem(avatarStorageKey) || "{}");
        Object.assign(avatarSettings, saved);
    } catch (error) {
        console.warn("头像设置读取失败，使用默认设置。", error);
    }
}

function saveAvatarSettings() {
    try {
        localStorage.setItem(avatarStorageKey, JSON.stringify(avatarSettings));
    } catch (error) {
        console.warn("头像设置保存失败。", error);
    }
}

function readImageFile(file, callback) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = function () {
        callback(reader.result);
    };
    reader.readAsDataURL(file);
}

function setPreviewImage(id, src) {
    const image = document.getElementById(id);
    if (!image) return;
    image.src = src || "";
    image.classList.toggle("visible", Boolean(src));
}

function renderAvatarEditorPreviews() {
    setPreviewImage("userAvatarPreviewImage", avatarSettings.userImage);
    setPreviewImage("userAvatarFramePreviewImage", avatarSettings.userFrame);
    setPreviewImage("aiAvatarPreviewImage", avatarSettings.aiImage);
    setPreviewImage("aiAvatarFramePreviewImage", avatarSettings.aiFrame);
}

function applyAvatarSettingsToChat() {
    document.querySelectorAll('.avatar-with-frame').forEach(function (avatar) {
        const owner = avatar.dataset.avatarOwner === "ai" ? "ai" : "user";
        const image = avatar.querySelector(".avatar-image");
        const frame = avatar.querySelector(".avatar-frame");
        const fallback = avatar.querySelector(".avatar-fallback");
        const imageSrc = owner === "ai" ? avatarSettings.aiImage : avatarSettings.userImage;
        const frameSrc = owner === "ai" ? avatarSettings.aiFrame : avatarSettings.userFrame;

        if (image) {
            image.src = imageSrc || "";
            image.classList.toggle("visible", Boolean(imageSrc));
        }
        if (frame) {
            frame.src = frameSrc || "";
            frame.classList.toggle("visible", Boolean(frameSrc));
        }
        if (fallback) {
            fallback.classList.toggle("hidden", Boolean(imageSrc));
        }
    });

    document.body.classList.toggle("avatar-frame-animated", avatarSettings.frameAnimation);
}

function createAvatarElement(owner, isUser) {
    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-with-frame" + (isUser ? " user-avatar" : "");
    avatar.dataset.avatarOwner = owner;

    const fallback = document.createElement("span");
    fallback.className = "avatar-fallback";
    fallback.textContent = "♡";

    const image = document.createElement("img");
    image.className = "avatar-image";
    image.alt = isUser ? "我的头像" : "AI 头像";

    const frame = document.createElement("img");
    frame.className = "avatar-frame";
    frame.alt = isUser ? "我的头像框" : "AI 头像框";

    avatar.appendChild(fallback);
    avatar.appendChild(image);
    avatar.appendChild(frame);

    const imageSrc = owner === "ai" ? avatarSettings.aiImage : avatarSettings.userImage;
    const frameSrc = owner === "ai" ? avatarSettings.aiFrame : avatarSettings.userFrame;
    image.src = imageSrc || "";
    image.classList.toggle("visible", Boolean(imageSrc));
    frame.src = frameSrc || "";
    frame.classList.toggle("visible", Boolean(frameSrc));
    fallback.classList.toggle("hidden", Boolean(imageSrc));
    return avatar;
}

function bindImageInput(input, settingName) {
    if (!input) return;
    input.addEventListener("change", function () {
        const file = input.files && input.files[0];
        readImageFile(file, function (dataUrl) {
            avatarSettings[settingName] = dataUrl;
            saveAvatarSettings();
            renderAvatarEditorPreviews();
            applyAvatarSettingsToChat();
        });
    });
}

loadAvatarSettings();
if (avatarFrameAnimationToggle) {
    avatarFrameAnimationToggle.checked = avatarSettings.frameAnimation;
    avatarFrameAnimationToggle.addEventListener("change", function () {
        avatarSettings.frameAnimation = avatarFrameAnimationToggle.checked;
        saveAvatarSettings();
        applyAvatarSettingsToChat();
    });
}

bindImageInput(userAvatarInput, "userImage");
bindImageInput(aiAvatarInput, "aiImage");
// 头像框也走自动抠图：只移除边缘连通背景，保留框内部装饰。


renderAvatarEditorPreviews();
applyAvatarSettingsToChat();


// ===== 🪄 头像框自动抠图 =====
async function processAvatarFrameUpload(file, settingName) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
        const raw = await new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        const cutout = await removeEdgeBackground(raw, 52);
        avatarSettings[settingName] = cutout;
        saveAvatarSettings();
        renderAvatarEditorPreviews();
        applyAvatarSettingsToChat();
    } catch (error) {
        console.error("头像框自动抠图失败", error);
    }
}

function bindAvatarFrameCutoutInput(input, settingName) {
    if (!input) return;
    input.addEventListener("change", function () {
        processAvatarFrameUpload(input.files && input.files[0], settingName);
        input.value = "";
    });
}

// ===== v0.4 ✨ 自动抠图 + 自定义气泡 + 聊天背景 =====
const customAppearanceStorageKey = "myAiHomeCustomAppearanceV04";
const customAppearance = {
    userBubble: "",
    aiBubble: "",
    bubbleAnimation: true,
    background: "",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundOpacity: 0.55
};

const customBubbleAnimationToggle = document.getElementById("customBubbleAnimationToggle");
const userBubbleInput = document.getElementById("userBubbleInput");
const aiBubbleInput = document.getElementById("aiBubbleInput");
const userBubblePreviewImage = document.getElementById("userBubblePreviewImage");
const aiBubblePreviewImage = document.getElementById("aiBubblePreviewImage");
const chatBackgroundInput = document.getElementById("chatBackgroundInput");
const clearChatBackground = document.getElementById("clearChatBackground");
const backgroundSizeSelect = document.getElementById("backgroundSizeSelect");
const backgroundPositionSelect = document.getElementById("backgroundPositionSelect");
const backgroundOpacityRange = document.getElementById("backgroundOpacityRange");
const backgroundPreview = document.getElementById("backgroundPreview");

function loadCustomAppearance() {
    try {
        const saved = JSON.parse(localStorage.getItem(customAppearanceStorageKey) || "{}");
        Object.assign(customAppearance, saved);
    } catch (error) {
        console.warn("自定义外观读取失败。", error);
    }
}

function saveCustomAppearance() {
    try {
        localStorage.setItem(customAppearanceStorageKey, JSON.stringify(customAppearance));
    } catch (error) {
        console.warn("自定义外观保存失败。图片过大时可以换一张尺寸更小的素材。", error);
    }
}

function loadImageElement(dataUrl) {
    return new Promise(function (resolve, reject) {
        const image = new Image();
        image.onload = function () { resolve(image); };
        image.onerror = reject;
        image.src = dataUrl;
    });
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// 从四条边开始做“连通背景”抠图：不会把气泡内部同色区域一股脑删除。
async function removeEdgeBackground(dataUrl, tolerance) {
    const image = await loadImageElement(dataUrl);
    const maxSide = 1000;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    function pixelAt(x, y) {
        const i = (y * width + x) * 4;
        return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]];
    }

    const samplePoints = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
        [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
        [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
    ];
    const samples = samplePoints.map(function (point) { return pixelAt(point[0], point[1]); });
    const bg = samples.reduce(function (acc, c) {
        return [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]];
    }, [0, 0, 0]).map(function (v) { return v / samples.length; });

    const visited = new Uint8Array(width * height);
    const queueX = new Int32Array(width * height);
    const queueY = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    function colorDistance(r, g, b, a) {
        if (a < 10) return 0;
        return Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2);
    }

    function tryPush(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const index = y * width + x;
        if (visited[index]) return;
        const p = index * 4;
        if (colorDistance(pixels[p], pixels[p + 1], pixels[p + 2], pixels[p + 3]) <= tolerance) {
            visited[index] = 1;
            queueX[tail] = x;
            queueY[tail] = y;
            tail += 1;
        }
    }

    for (let x = 0; x < width; x += 1) {
        tryPush(x, 0);
        tryPush(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
        tryPush(0, y);
        tryPush(width - 1, y);
    }

    while (head < tail) {
        const x = queueX[head];
        const y = queueY[head];
        head += 1;
        const index = y * width + x;
        const p = index * 4;
        pixels[p + 3] = 0;
        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}

bindAvatarFrameCutoutInput(userAvatarFrameInput, "userFrame");
bindAvatarFrameCutoutInput(aiAvatarFrameInput, "aiFrame");

function setCustomPreview(imageEl, src) {
    if (!imageEl) return;
    imageEl.src = src || "";
    imageEl.classList.toggle("visible", Boolean(src));
}

function applyCustomBubbles() {
    document.body.classList.toggle("custom-bubbles-animated", customAppearance.bubbleAnimation);

    document.querySelectorAll(".message.user-message").forEach(function (message) {
        const enabled = Boolean(customAppearance.userBubble);
        message.classList.toggle("has-custom-bubble", enabled);
        message.style.setProperty("--custom-bubble-image", enabled ? `url("${customAppearance.userBubble}")` : "none");
    });
    document.querySelectorAll(".message.ai-message").forEach(function (message) {
        const enabled = Boolean(customAppearance.aiBubble);
        message.classList.toggle("has-custom-bubble", enabled);
        message.style.setProperty("--custom-bubble-image", enabled ? `url("${customAppearance.aiBubble}")` : "none");
    });
}

function applyBackgroundSettings() {
    const root = document.documentElement;
    root.style.setProperty("--chat-custom-background", customAppearance.background ? `url("${customAppearance.background}")` : "none");
    root.style.setProperty("--chat-background-size", customAppearance.backgroundSize);
    root.style.setProperty("--chat-background-position", customAppearance.backgroundPosition);
    root.style.setProperty("--chat-background-opacity", customAppearance.backgroundOpacity);
    document.body.classList.toggle("has-custom-chat-background", Boolean(customAppearance.background));

    if (backgroundPreview) {
        backgroundPreview.style.backgroundImage = customAppearance.background ? `url("${customAppearance.background}")` : "none";
        backgroundPreview.style.backgroundSize = customAppearance.backgroundSize;
        backgroundPreview.style.backgroundPosition = customAppearance.backgroundPosition;
        backgroundPreview.classList.toggle("has-image", Boolean(customAppearance.background));
    }
}

function updateBubblePreviewImages() {
    setCustomPreview(userBubblePreviewImage, customAppearance.userBubble);
    setCustomPreview(aiBubblePreviewImage, customAppearance.aiBubble);
}

async function processCutoutUpload(file, settingName, previewImage, label) {
    if (!file || !file.type.startsWith("image/")) return;
    const oldText = previewImage && previewImage.parentElement ? previewImage.parentElement.querySelector("span") : null;
    if (oldText) oldText.textContent = "正在自动抠图…";
    try {
        const raw = await new Promise(function (resolve, reject) {
            const reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        const cutout = await removeEdgeBackground(raw, 52);
        customAppearance[settingName] = cutout;
        saveCustomAppearance();
        updateBubblePreviewImages();
        applyCustomBubbles();
        if (oldText) oldText.textContent = "已自动抠图";
    } catch (error) {
        console.error(label + "处理失败", error);
        if (oldText) oldText.textContent = "处理失败，请换一张图片";
    }
}

function bindCutoutInput(input, settingName, previewImage, label) {
    if (!input) return;
    input.addEventListener("change", function () {
        processCutoutUpload(input.files && input.files[0], settingName, previewImage, label);
        input.value = "";
    });
}

function updateBackgroundPreviewText() {
    if (!backgroundPreview) return;
    const span = backgroundPreview.querySelector("span");
    if (span) span.textContent = customAppearance.background ? "当前聊天背景" : "小屋背景预览";
}

function bindBackgroundSettings() {
    if (chatBackgroundInput) {
        chatBackgroundInput.addEventListener("change", async function () {
            const file = chatBackgroundInput.files && chatBackgroundInput.files[0];
            if (!file || !file.type.startsWith("image/")) return;
            const raw = await new Promise(function (resolve, reject) {
                const reader = new FileReader();
                reader.onload = function () { resolve(reader.result); };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            try {
                const image = await loadImageElement(raw);
                const maxSide = 1600;
                const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
                customAppearance.background = canvas.toDataURL("image/jpeg", 0.84);
                saveCustomAppearance();
                applyBackgroundSettings();
                updateBackgroundPreviewText();
            } catch (error) {
                console.error("背景处理失败", error);
            }
            chatBackgroundInput.value = "";
        });
    }
    if (clearChatBackground) {
        clearChatBackground.addEventListener("click", function () {
            customAppearance.background = "";
            saveCustomAppearance();
            applyBackgroundSettings();
            updateBackgroundPreviewText();
        });
    }
    if (backgroundSizeSelect) {
        backgroundSizeSelect.addEventListener("change", function () {
            customAppearance.backgroundSize = backgroundSizeSelect.value;
            saveCustomAppearance();
            applyBackgroundSettings();
        });
    }
    if (backgroundPositionSelect) {
        backgroundPositionSelect.addEventListener("change", function () {
            customAppearance.backgroundPosition = backgroundPositionSelect.value;
            saveCustomAppearance();
            applyBackgroundSettings();
        });
    }
    if (backgroundOpacityRange) {
        backgroundOpacityRange.addEventListener("input", function () {
            customAppearance.backgroundOpacity = Number(backgroundOpacityRange.value);
            saveCustomAppearance();
            applyBackgroundSettings();
        });
    }
}

loadCustomAppearance();
if (customBubbleAnimationToggle) {
    customBubbleAnimationToggle.checked = customAppearance.bubbleAnimation;
    customBubbleAnimationToggle.addEventListener("change", function () {
        customAppearance.bubbleAnimation = customBubbleAnimationToggle.checked;
        saveCustomAppearance();
        applyCustomBubbles();
    });
}
bindCutoutInput(userBubbleInput, "userBubble", userBubblePreviewImage, "我的气泡");
bindCutoutInput(aiBubbleInput, "aiBubble", aiBubblePreviewImage, "AI 气泡");
if (backgroundSizeSelect) backgroundSizeSelect.value = customAppearance.backgroundSize;
if (backgroundPositionSelect) backgroundPositionSelect.value = customAppearance.backgroundPosition;
if (backgroundOpacityRange) backgroundOpacityRange.value = String(customAppearance.backgroundOpacity);
updateBubblePreviewImages();
bindBackgroundSettings();
applyCustomBubbles();
applyBackgroundSettings();
updateBackgroundPreviewText();
