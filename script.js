const input = document.querySelector("#chatInput");
const button = document.querySelector("#sendMessageButton");
const messages = document.querySelector(".chat-messages");

function appendUserTextMessage(text) {
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
    userRow.appendChild(userContent);
    userRow.appendChild(createAvatarElement("user", true));
    messages.appendChild(userRow);
    applyCustomBubbles();
    return userMessage;
}

function appendUserMediaMessage(type, src, fileName) {
    const userRow = document.createElement("div");
    userRow.className = "message-row user-row";
    const userContent = document.createElement("div");
    const userName = document.createElement("div");
    userName.className = "user-name";
    userName.textContent = "我";
    const media = document.createElement("div");
    media.className = "message user-message media-message";
    if (type === "image") {
        const img = document.createElement("img"); img.src = src; img.alt = fileName || "图片"; media.appendChild(img);
    } else if (type === "video") {
        const video = document.createElement("video"); video.src = src; video.controls = true; video.playsInline = true; media.appendChild(video);
    } else if (type === "audio") {
        media.classList.add("voice-message");
        media.innerHTML = '<span class="voice-wave"><i></i><i></i><i></i><i></i><i></i></span>';
        const audio = document.createElement("audio"); audio.src = src; audio.controls = true; media.appendChild(audio);
    }
    userContent.appendChild(userName); userContent.appendChild(media);
    userRow.appendChild(userContent); userRow.appendChild(createAvatarElement("user", true));
    messages.appendChild(userRow);
    return media;
}

function appendAiTextMessage(reply) {
    const aiRow = document.createElement("div");
    aiRow.className = "message-row ai-row";
    const avatar = createAvatarElement("ai", false);
    const aiContent = document.createElement("div");
    const aiName = document.createElement("div"); aiName.className = "ai-name"; aiName.textContent = "小屋 AI";
    const aiMessage = document.createElement("div"); aiMessage.className = "message ai-message"; aiMessage.textContent = reply;
    aiContent.appendChild(aiName); aiContent.appendChild(aiMessage);
    aiRow.appendChild(avatar); aiRow.appendChild(aiContent); messages.appendChild(aiRow);
    applyCustomBubbles();
    return aiMessage;
}

function scrollChatToBottom() { if (messages) messages.scrollTop = messages.scrollHeight; }

function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    appendUserTextMessage(text);
    input.value = "";
    const typingRow = document.createElement("div");
    typingRow.className = "message-row ai-row";
    typingRow.appendChild(createAvatarElement("ai", false));
    const typingContent = document.createElement("div");
    const typingName = document.createElement("div"); typingName.className = "ai-name"; typingName.textContent = "小屋 AI";
    const typingMessage = document.createElement("div"); typingMessage.className = "message ai-message typing"; typingMessage.textContent = "正在输入……";
    typingContent.appendChild(typingName); typingContent.appendChild(typingMessage); typingRow.appendChild(typingContent);
    messages.appendChild(typingRow);
    scrollChatToBottom();
    setTimeout(function () {
        typingRow.remove();
        const reply = getAIReply(text);
        appendAiTextMessage(reply);
        if (window.updateStatusFromText) window.updateStatusFromText(text + " " + reply);
        if (window.activeAiCall && window.activeAiCall.type === "voice" && "speechSynthesis" in window) {
            try { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(reply); utterance.lang = "zh-CN"; window.speechSynthesis.speak(utterance); } catch(e) {}
        }
        scrollChatToBottom();
    }, 600);
}

if (button) button.addEventListener("click", function () { sendMessage(); if (window.syncSendPlus) window.syncSendPlus(); });
if (input) input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
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
const pixelHomePage = document.getElementById("pixelHomePage");
const pixelHomeBack = document.getElementById("pixelHomeBack");
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
    "pixel-home": "像素小屋",
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
        } else if (page === "pixel-home") {
            showPixelHomePage();
        } else {
            chatPage.classList.remove("hidden");
            appearancePage.classList.add("hidden");
            if (pixelHomePage) pixelHomePage.classList.add("hidden");
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
    if (pixelHomePage) pixelHomePage.classList.add("hidden");
    menuPlaceholder.classList.remove("show");
}

function showAppearancePage() {
    chatPage.classList.add("hidden");
    appearancePage.classList.remove("hidden");
    if (pixelHomePage) pixelHomePage.classList.add("hidden");
    menuPlaceholder.classList.remove("show");
}

function showPixelHomePage() {
    chatPage.classList.add("hidden");
    appearancePage.classList.add("hidden");
    if (pixelHomePage) pixelHomePage.classList.remove("hidden");
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

if (pixelHomeBack) {
    pixelHomeBack.addEventListener("click", function () {
        showChatPage();
        menuItems.forEach(function (item) {
            item.classList.toggle("active", item.dataset.page === "chat");
        });
    });
}

function applyRibbonBubble(enabled) {
    document.body.classList.toggle("ribbon-bubbles", enabled);
}

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
const userAvatarFrameScale = document.getElementById("userAvatarFrameScale");
const aiAvatarFrameScale = document.getElementById("aiAvatarFrameScale");
const userAvatarFrameScaleValue = document.getElementById("userAvatarFrameScaleValue");
const aiAvatarFrameScaleValue = document.getElementById("aiAvatarFrameScaleValue");

const avatarSettings = {
    userImage: "",
    aiImage: "",
    userFrame: "",
    aiFrame: "",
    userFrameScale: 1.18,
    aiFrameScale: 1.18,
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
            const frameScale = owner === "ai" ? avatarSettings.aiFrameScale : avatarSettings.userFrameScale;
            frame.style.setProperty("--frame-scale", frameScale || 1.18);
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
    frame.style.setProperty("--frame-scale", owner === "ai" ? avatarSettings.aiFrameScale : avatarSettings.userFrameScale);
    fallback.classList.toggle("hidden", Boolean(imageSrc));
    return avatar;
}

function bindFrameScaleInput(input, output, settingName) {
    if (!input) return;
    input.addEventListener("input", function () {
        const value = Number(input.value) / 100;
        avatarSettings[settingName] = value;
        if (output) output.value = Math.round(value * 100) + "%";
        saveAvatarSettings();
        applyAvatarSettingsToChat();
        renderAvatarEditorPreviews();
    });
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
if (userAvatarFrameScale) { userAvatarFrameScale.value = String(Math.round((avatarSettings.userFrameScale || 1.18) * 100)); }
if (aiAvatarFrameScale) { aiAvatarFrameScale.value = String(Math.round((avatarSettings.aiFrameScale || 1.18) * 100)); }
if (userAvatarFrameScaleValue) userAvatarFrameScaleValue.value = userAvatarFrameScale ? userAvatarFrameScale.value + "%" : "118%";
if (aiAvatarFrameScaleValue) aiAvatarFrameScaleValue.value = aiAvatarFrameScale ? aiAvatarFrameScale.value + "%" : "118%";
bindFrameScaleInput(userAvatarFrameScale, userAvatarFrameScaleValue, "userFrameScale");
bindFrameScaleInput(aiAvatarFrameScale, aiAvatarFrameScaleValue, "aiFrameScale");
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


// ===== 🏠 v0.5 像素小屋 =====
const pixelHomeStorageKey = "myAiHomePixelHouseV05";
const pixelRoom = document.getElementById("pixelRoom");
const pixelRoomStatus = document.getElementById("pixelRoomStatus");
const pixelBubble = document.getElementById("pixelBubble");
const pixelTouchRipple = document.getElementById("pixelTouchRipple");
const pixelResetRoom = document.getElementById("pixelResetRoom");
const pixelAiCharacter = document.getElementById("pixelAiCharacter");
const pixelUserCharacter = document.getElementById("pixelUserCharacter");
const pixelAiUploadBtn = document.getElementById("pixelAiUploadBtn");
const pixelUserUploadBtn = document.getElementById("pixelUserUploadBtn");
const pixelAiUpload = document.getElementById("pixelAiUpload");
const pixelUserUpload = document.getElementById("pixelUserUpload");
const pixelFurnitureUpload = document.getElementById("pixelFurnitureUpload");
const pixelFurnitureList = document.getElementById("pixelFurnitureList");
const pixelActions = document.querySelectorAll(".pixel-action");

const pixelHouse = {
    aiImage: "",
    userImage: "",
    furniture: []
};

function savePixelHouse() {
    try { localStorage.setItem(pixelHomeStorageKey, JSON.stringify(pixelHouse)); }
    catch (error) { console.warn("像素小屋保存失败", error); }
}
function loadPixelHouse() {
    try { Object.assign(pixelHouse, JSON.parse(localStorage.getItem(pixelHomeStorageKey) || "{}")); }
    catch (error) { console.warn("像素小屋读取失败", error); }
}
function pixelSay(text, duration) {
    if (!pixelBubble) return;
    pixelBubble.textContent = text;
    pixelBubble.classList.add("show");
    window.clearTimeout(pixelSay.timer);
    pixelSay.timer = window.setTimeout(function () { pixelBubble.classList.remove("show"); }, duration || 2600);
}
function pixelStatus(text) {
    if (pixelRoomStatus) pixelRoomStatus.textContent = text;
}
function pixelRipple(clientX, clientY) {
    if (!pixelRoom || !pixelTouchRipple) return;
    const rect = pixelRoom.getBoundingClientRect();
    pixelTouchRipple.style.left = (clientX - rect.left) + "px";
    pixelTouchRipple.style.top = (clientY - rect.top) + "px";
    pixelTouchRipple.classList.remove("show");
    void pixelTouchRipple.offsetWidth;
    pixelTouchRipple.classList.add("show");
}
function applyPixelCharacters() {
    [[pixelAiCharacter, pixelHouse.aiImage, "AI"], [pixelUserCharacter, pixelHouse.userImage, "我"]].forEach(function (entry) {
        const el = entry[0], src = entry[1], label = entry[2];
        if (!el) return;
        const sprite = el.querySelector(".pixel-sprite");
        if (sprite) {
            sprite.style.backgroundImage = src ? `url("${src}")` : "";
            sprite.classList.toggle("has-image", Boolean(src));
            sprite.textContent = src ? "" : "●";
        }
        const text = el.querySelector("span:last-child");
        if (text) text.textContent = label;
    });
}
function addPixelFurniture(name, imageSrc) {
    if (!pixelRoom) return;
    const index = pixelHouse.furniture.length;
    const itemData = { name: name, image: imageSrc || "", left: 50, top: 46 };
    pixelHouse.furniture.push(itemData);
    const item = document.createElement("button");
    item.type = "button";
    item.className = "pixel-furniture uploaded-furniture";
    item.dataset.item = name;
    item.dataset.furnitureIndex = String(index);
    item.textContent = imageSrc ? "" : "▦";
    if (imageSrc) item.style.backgroundImage = `url("${imageSrc}")`;
    item.style.left = "50%";
    item.style.top = "46%";
    pixelRoom.appendChild(item);
    makePixelDraggable(item);
    savePixelHouse();
    pixelSay("放好啦～拖动「" + name + "」试试看", 2200);
}
function makePixelDraggable(el) {
    if (!el || el.dataset.dragBound) return;
    el.dataset.dragBound = "1";
    let dragging = false;
    function move(clientX, clientY) {
        const rect = pixelRoom.getBoundingClientRect();
        const x = clamp(((clientX - rect.left) / rect.width) * 100, 4, 94);
        const y = clamp(((clientY - rect.top) / rect.height) * 100, 10, 88);
        el.style.left = x + "%";
        el.style.top = y + "%";
        el.style.transform = "translate(-50%,-50%) scale(1.03)";
        el.dataset.dragX = x;
        el.dataset.dragY = y;
    }
    el.addEventListener("pointerdown", function (event) {
        dragging = true;
        el.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    });
    el.addEventListener("pointermove", function (event) { if (dragging) move(event.clientX, event.clientY); });
    el.addEventListener("pointerup", function () {
        if (!dragging) return;
        dragging = false;
        el.style.transform = "translate(-50%,-50%)";
        const index = Number(el.dataset.furnitureIndex);
        if (Number.isInteger(index) && pixelHouse.furniture[index]) {
            pixelHouse.furniture[index].left = Number(el.dataset.dragX || 50);
            pixelHouse.furniture[index].top = Number(el.dataset.dragY || 46);
            savePixelHouse();
        }
        pixelStatus("家具位置已保存");
    });
    el.addEventListener("click", function () { pixelSay(el.dataset.item + "：要不要把它放到那里？", 1800); });
}
function restorePixelFurniture() {
    if (!pixelRoom) return;
    pixelRoom.querySelectorAll(".uploaded-furniture").forEach(function (el) { el.remove(); });
    (pixelHouse.furniture || []).forEach(function (f, index) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "pixel-furniture uploaded-furniture";
        item.dataset.item = f.name;
        item.dataset.furnitureIndex = String(index);
        item.textContent = f.image ? "" : "▦";
        if (f.image) item.style.backgroundImage = `url("${f.image}")`;
        item.style.left = (f.left || 50) + "%";
        item.style.top = (f.top || 46) + "%";
        pixelRoom.appendChild(item);
        makePixelDraggable(item);
    });
}
function pixelReset() {
    pixelHouse.furniture = [];
    pixelHouse.aiImage = "";
    pixelHouse.userImage = "";
    savePixelHouse();
    applyPixelCharacters();
    restorePixelFurniture();
    pixelSay("小屋已经整理好啦～", 1800);
}
function bindPixelUpload(input, owner) {
    if (!input) return;
    input.addEventListener("change", function () {
        const file = input.files && input.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = function () {
            pixelHouse[owner] = reader.result;
            savePixelHouse();
            applyPixelCharacters();
            pixelSay((owner === "aiImage" ? "AI" : "我") + "的小人换好啦～", 1800);
        };
        reader.readAsDataURL(file);
        input.value = "";
    });
}
loadPixelHouse();
applyPixelCharacters();
restorePixelFurniture();
bindPixelUpload(pixelAiUpload, "aiImage");
bindPixelUpload(pixelUserUpload, "userImage");
if (pixelAiUploadBtn && pixelAiUpload) pixelAiUploadBtn.addEventListener("click", function () { pixelAiUpload.click(); });
if (pixelUserUploadBtn && pixelUserUpload) pixelUserUploadBtn.addEventListener("click", function () { pixelUserUpload.click(); });
if (pixelResetRoom) pixelResetRoom.addEventListener("click", pixelReset);

if (pixelRoom) {
    pixelRoom.addEventListener("pointerdown", function (event) {
        pixelRipple(event.clientX, event.clientY);
    });
    pixelRoom.addEventListener("click", function (event) {
        if (event.target.closest(".pixel-furniture") || event.target.closest(".pixel-character")) return;
        pixelSay("叮～你摸了摸这里，小屋回应你啦。", 1800);
        pixelStatus("你刚刚触摸了房间");
    });
}
[pixelAiCharacter, pixelUserCharacter].forEach(function (character) {
    if (!character) return;
    character.addEventListener("click", function (event) {
        event.stopPropagation();
        const name = character.dataset.character;
        if (name === "AI") {
            pixelSay("AI：嘿～你来啦！要一起看看家具吗？", 2800);
        } else {
            pixelSay("我：摸摸小人也可以触发互动哦～", 2400);
        }
        pixelStatus(name + "正在和你互动");
    });
});

document.querySelectorAll(".pixel-furniture").forEach(makePixelDraggable);
document.querySelectorAll("[data-add-furniture]").forEach(function (button) {
    button.addEventListener("click", function () { addPixelFurniture(button.dataset.addFurniture, ""); });
});
if (pixelFurnitureUpload) {
    pixelFurnitureUpload.addEventListener("change", function () {
        const file = pixelFurnitureUpload.files && pixelFurnitureUpload.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = function () { addPixelFurniture(file.name.replace(/\.[^.]+$/, "") || "新家具", reader.result); };
        reader.readAsDataURL(file);
        pixelFurnitureUpload.value = "";
    });
}
pixelActions.forEach(function (button) {
    button.addEventListener("click", function () {
        const action = button.dataset.action;
        if (action === "talk") pixelSay("AI：今天想把小屋装成什么样？\n我：先摆一张舒服的沙发～", 3200);
        if (action === "pat") pixelSay("摸摸成功！小人轻轻晃了一下 ✦", 1800);
        if (action === "decorate") pixelSay("去下面挑家具，放进房间吧～", 1800);
    });
});


// ===== 📱 v0.6：多媒体消息 + 语音/视频通话 =====
const chatImageButton = document.getElementById("chatImageButton");
const chatVideoButton = document.getElementById("chatVideoButton");
const chatImageInput = document.getElementById("chatImageInput");
const chatVideoInput = document.getElementById("chatVideoInput");
const voiceMessageButton = document.getElementById("voiceMessageButton");
const voiceCallButton = document.getElementById("voiceCallButton");
const videoCallButton = document.getElementById("videoCallButton");
const callModal = document.getElementById("callModal");
const callTitle = document.getElementById("callTitle");
const callStatus = document.getElementById("callStatus");
const callAiHint = document.getElementById("callAiHint");
const callLocalVideo = document.getElementById("callLocalVideo");
const callMuteButton = document.getElementById("callMuteButton");
const callCameraButton = document.getElementById("callCameraButton");
const callEndButton = document.getElementById("callEndButton");
const callClose = document.getElementById("callClose");
const callAiAvatar = document.getElementById("callAiAvatar");
let mediaRecorder = null;
let recordingChunks = [];
let recordingStream = null;
window.activeAiCall = null;

function handleMediaFile(file, type) {
    if (!file) return;
    const src = URL.createObjectURL(file);
    appendUserMediaMessage(type, src, file.name);
    scrollChatToBottom();
}
if (chatImageButton && chatImageInput) chatImageButton.addEventListener("click", () => chatImageInput.click());
if (chatVideoButton && chatVideoInput) chatVideoButton.addEventListener("click", () => chatVideoInput.click());
if (chatImageInput) chatImageInput.addEventListener("change", () => { handleMediaFile(chatImageInput.files && chatImageInput.files[0], "image"); chatImageInput.value=""; });
if (chatVideoInput) chatVideoInput.addEventListener("change", () => { handleMediaFile(chatVideoInput.files && chatVideoInput.files[0], "video"); chatVideoInput.value=""; });

async function toggleVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        if (voiceMessageButton) voiceMessageButton.classList.remove("recording");
        if (voiceMessageButton) voiceMessageButton.querySelector("span:last-child").textContent = "语音条";
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        alert("当前浏览器不支持语音录制。"); return;
    }
    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({audio:true});
        recordingChunks = [];
        mediaRecorder = new MediaRecorder(recordingStream);
        mediaRecorder.ondataavailable = e => { if (e.data.size) recordingChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordingChunks, {type: mediaRecorder.mimeType || "audio/webm"});
            const src = URL.createObjectURL(blob);
            appendUserMediaMessage("audio", src, "语音条");
            scrollChatToBottom();
            if (recordingStream) recordingStream.getTracks().forEach(t=>t.stop());
            recordingStream = null;
        };
        mediaRecorder.start();
        if (voiceMessageButton) { voiceMessageButton.classList.add("recording"); const label=voiceMessageButton.querySelector("span:last-child"); if(label) label.textContent="停止录音"; }
    } catch (error) {
        alert("需要允许浏览器使用麦克风，才能录制语音条。");
    }
}
if (voiceMessageButton) voiceMessageButton.addEventListener("click", toggleVoiceRecording);

function setCallAvatar() {
    const src = avatarSettings && avatarSettings.aiImage;
    if (callAiAvatar) {
        callAiAvatar.style.backgroundImage = src ? `url("${src}")` : "none";
        callAiAvatar.classList.toggle("has-image", Boolean(src));
        callAiAvatar.textContent = src ? "" : "♡";
    }
}
async function startCall(type) {
    if (!callModal) return;
    window.activeAiCall = {type:type, stream:null, muted:false, cameraOff:false};
    callModal.classList.remove("hidden");
    setCallAvatar();
    callTitle.textContent = type === "video" ? "视频通话" : "语音通话";
    callStatus.textContent = "正在请求设备权限…";
    callAiHint.textContent = "小屋 AI 正在接通";
    callCameraButton.classList.toggle("hidden", type !== "video");
    callLocalVideo.classList.toggle("hidden", type !== "video");
    try {
        const constraints = type === "video" ? {audio:true, video:true} : {audio:true};
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        window.activeAiCall.stream = stream;
        if (type === "video") { callLocalVideo.srcObject = stream; }
        callStatus.textContent = "已接通本地通话界面";
        callAiHint.textContent = "AI 实时语音/视频服务待接入";
    } catch (error) {
        callStatus.textContent = "没有获得麦克风/摄像头权限";
        callAiHint.textContent = "你仍可以关闭通话窗口；接入实时 AI 服务后即可真正通话。";
    }
}
function endCall() {
    const call = window.activeAiCall;
    if (call && call.stream) call.stream.getTracks().forEach(track => track.stop());
    if (callLocalVideo) callLocalVideo.srcObject = null;
    if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch(e){} }
    window.activeAiCall = null;
    if (callModal) callModal.classList.add("hidden");
}
if (voiceCallButton) voiceCallButton.addEventListener("click", () => startCall("voice"));
if (videoCallButton) videoCallButton.addEventListener("click", () => startCall("video"));
if (callEndButton) callEndButton.addEventListener("click", endCall);
if (callClose) callClose.addEventListener("click", endCall);
if (callMuteButton) callMuteButton.addEventListener("click", function(){
    const call=window.activeAiCall; if(!call || !call.stream) return;
    const track=call.stream.getAudioTracks()[0]; if(!track) return;
    track.enabled=!track.enabled; call.muted=!track.enabled; this.textContent=track.enabled?"麦克风":"已静音";
});
if (callCameraButton) callCameraButton.addEventListener("click", function(){
    const call=window.activeAiCall; if(!call || !call.stream) return;
    const track=call.stream.getVideoTracks()[0]; if(!track) return;
    track.enabled=!track.enabled; call.cameraOff=!track.enabled; this.textContent=track.enabled?"摄像头":"已关摄像头";
});

// 固定聊天背景层与顶部栏高度保持一致。
function syncChatBackgroundLayer() {
    const header = document.querySelector(".chat-header");
    if (!header) return;
    document.documentElement.style.setProperty("--chat-header-height", header.offsetHeight + "px");
}
syncChatBackgroundLayer();
window.addEventListener("resize", syncChatBackgroundLayer);


// ===== v0.7：微信式底栏 =====
(function () {
    const plusBtn = document.getElementById("plusButton"), emojiBtn = document.getElementById("emojiButton");
    const plusPanel = document.getElementById("plusPanel"), emojiPanel = document.getElementById("emojiPanel");
    function show(panel) {
        [plusPanel, emojiPanel].forEach(function (p) { if (p) p.classList.toggle("hidden", p !== panel || !p.classList.contains("hidden")); });
        setTimeout(scrollChatToBottom, 50);
    }
    if (plusBtn) plusBtn.addEventListener("click", function () { show(plusPanel); });
    if (emojiBtn) emojiBtn.addEventListener("click", function () { show(emojiPanel); });
    if (input) input.addEventListener("focus", function () { plusPanel.classList.add("hidden"); emojiPanel.classList.add("hidden"); });
    if (emojiPanel) emojiPanel.addEventListener("click", function (e) {
        if (e.target.tagName !== "BUTTON") return;
        input.value += e.target.textContent; input.focus(); window.syncSendPlus();
    });
    if (plusPanel) plusPanel.addEventListener("click", function (e) { if (e.target.closest("button")) plusPanel.classList.add("hidden"); });
    // 有文字时：＋ 变成「发送」
    window.syncSendPlus = function () {
        const has = input.value.trim().length > 0;
        button.classList.toggle("hidden", !has);
        plusBtn.classList.toggle("hidden", has);
    };
    if (input) input.addEventListener("input", window.syncSendPlus);
    window.syncSendPlus();
})();

// ===== v0.7：AI 情绪状态 =====
(function () {
    const GROUPS = [
        ["心情想法", [["happy","😊","美滋滋","#8fd694"],["broken","💔","裂开","#e78a9b"],["luck","🍀","求锦鲤","#f0b35a"],["sunny","☀️","等天晴","#f5c542"],["tired","😪","疲惫","#a8a8c8"],
            ["blank","😶","发呆","#b8b8b8"],["go","💪","冲","#ff8a65"],["emo","🌧️","emo","#7e9bc7"],["wander","💭","胡思乱想","#b49bd6"],["energetic","✨","元气满满","#ffb347"],
            ["anxious","😰","焦虑","#e6a15c"],["angry","😤","生气","#e56b6b"],["shy","😳","害羞","#f48fb1"],["bot","🤖","bot","#8fb5d6"]]],
        ["工作学习", [["work","🧱","搬砖","#c9a27a"],["study","📖","沉迷学习","#7fb5a0"],["busy","🏃","忙碌","#e6a15c"],["slack","🐟","摸鱼","#7fc4d6"],["trip","✈️","出差","#8fb5d6"],["dnd","🌙","勿扰模式","#9a8fc7"]]],
        ["活动", [["play","🎈","浪","#f48fb1"],["check","✌️","打卡","#f5c542"],["sport","🏃‍♀️","运动","#8fd694"],["coffee","☕","喝咖啡","#b08968"],["tea","🧋","喝奶茶","#e6a0b4"],["eat","🍚","干饭","#f0b35a"],["selfie","🤳","自拍","#f48fb1"]]],
        ["休息", [["zen","🧘","闭关","#9a8fc7"],["home","🛋️","宅","#b8a89a"],["sleep","😴","睡觉","#8f9bd6"],["cat","🐱","吸猫","#f0b35a"],["game","🎮","玩游戏","#7e9bd6"],["music","🎧","听歌","#e78ab3"]]]
    ];
    const ALL = {}; GROUPS.forEach(function (g) { g[1].forEach(function (s) { ALL[s[0]] = s; }); });
    ALL.online = ["online","🟢","在线","#8fd694"];
    // 关键词 -> 状态（后续接真实 AI 时，也可让 AI 回复里带 [状态:xxx]）
    const RULES = [[/晚安|睡了|困/,"sleep"],[/谢谢|开心|哈哈|喜欢|太好了|爱你/,"happy"],[/难过|伤心|哭|失落/,"emo"],[/焦虑|紧张|担心|害怕/,"anxious"],
        [/生气|讨厌|烦/,"angry"],[/忙|加班|工作|任务/,"busy"],[/学习|作业|考试/,"study"],[/奶茶/,"tea"],[/咖啡/,"coffee"],[/吃饭|饿|干饭/,"eat"],
        [/游戏/,"game"],[/歌|音乐/,"music"],[/猫/,"cat"],[/运动|跑步/,"sport"],[/害羞|脸红/,"shy"]];
    const btn = document.getElementById("aiStatusButton"), emoji = document.getElementById("aiStatusEmoji"), label = document.getElementById("aiStatusLabel");
    const sheet = document.getElementById("statusSheet"), body = document.getElementById("statusSheetBody");
    let current = "online";
    function setAiStatus(id, silent) {
        const s = ALL[id]; if (!s) return;
        current = id; emoji.textContent = s[1]; label.textContent = s[2];
        try { localStorage.setItem("aiStatus", id); } catch (e) {}
        if (!silent) { btn.classList.remove("pulse"); void btn.offsetWidth; btn.classList.add("pulse"); }
        body.querySelectorAll(".status-opt").forEach(function (o) { o.classList.toggle("active", o.dataset.id === id); });
    }
    window.setAiStatus = setAiStatus;
    window.updateStatusFromText = function (text) {
        const tag = text.match(/\[状态[:：]([a-z]+)\]/); if (tag) return setAiStatus(tag[1]);
        for (let i = 0; i < RULES.length; i++) if (RULES[i][0].test(text)) return setAiStatus(RULES[i][1]);
    };
    GROUPS.forEach(function (g) {
        const box = document.createElement("div"); box.className = "status-group";
        box.innerHTML = "<h3>" + g[0] + "</h3><div class='status-grid'></div>";
        g[1].forEach(function (s) {
            const o = document.createElement("button"); o.type = "button"; o.className = "status-opt"; o.dataset.id = s[0];
            o.innerHTML = "<i>" + s[1] + "</i><span>" + s[2] + "</span>";
            o.addEventListener("click", function () { setAiStatus(s[0]); sheet.classList.add("hidden"); });
            box.querySelector(".status-grid").appendChild(o);
        });
        body.appendChild(box);
    });
    btn.addEventListener("click", function () { sheet.classList.remove("hidden"); });
    document.getElementById("statusSheetClose").addEventListener("click", function () { sheet.classList.add("hidden"); });
    let saved = "online"; try { saved = localStorage.getItem("aiStatus") || "online"; } catch (e) {}
    setAiStatus(saved, true);
    // 空闲时 AI 偶尔自己换个心情
    setInterval(function () {
        if (Math.random() < 0.3) { const ids = Object.keys(ALL); setAiStatus(ids[Math.floor(Math.random() * ids.length)]); }
    }, 90000);
})();


// ===== v0.8：观影室 / 阅读室 =====
(function () {
    const $ = function (id) { return document.getElementById(id); };
    const cinemaRoom = $("cinemaRoom"), readingRoom = $("readingRoom");

    // —— 页面切换：用捕获阶段接管，不影响原有菜单逻辑 ——
    function hideRooms() { cinemaRoom.classList.add("hidden"); readingRoom.classList.add("hidden"); document.body.classList.remove("room-open"); }
    function openRoom(room) {
        showChatPage(); hideRooms();
        room.classList.remove("hidden"); document.body.classList.add("room-open");
        const v = $("cinemaVideo"); if (room !== cinemaRoom && v) v.pause();
        syncChatBackgroundLayer();
    }
    document.querySelector(".menu-list").addEventListener("click", function (e) {
        const item = e.target.closest(".menu-item"); if (!item) return;
        const page = item.dataset.page;
        if (page !== "cinema" && page !== "reading") { hideRooms(); return; }
        e.stopPropagation();
        menuItems.forEach(function (o) { o.classList.toggle("active", o === item); });
        openRoom(page === "cinema" ? cinemaRoom : readingRoom);
        if (page === "reading" && window.setAiStatus) window.setAiStatus("study");
        closeMenu();
    }, true);
    document.querySelectorAll("[data-room-back]").forEach(function (b) {
        b.addEventListener("click", function () {
            hideRooms(); showChatPage();
            menuItems.forEach(function (o) { o.classList.toggle("active", o.dataset.page === "chat"); });
        });
    });

    // —— 共用聊天（沿用头像 / 头像框 / 气泡 / 背景）——
    function roomMsg(box, who, text) {
        const isUser = who === "user";
        const row = document.createElement("div"); row.className = "message-row " + (isUser ? "user-row" : "ai-row");
        const col = document.createElement("div");
        const name = document.createElement("div"); name.className = isUser ? "user-name" : "ai-name"; name.textContent = isUser ? "我" : "小屋 AI";
        const msg = document.createElement("div"); msg.className = "message " + (isUser ? "user-message" : "ai-message"); msg.textContent = text;
        col.appendChild(name); col.appendChild(msg);
        const av = createAvatarElement(isUser ? "user" : "ai", isUser);
        if (isUser) { row.appendChild(col); row.appendChild(av); } else { row.appendChild(av); row.appendChild(col); }
        box.appendChild(row); applyCustomBubbles(); box.scrollTop = box.scrollHeight;
    }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function bindChat(box, inp, sendBtn, makeReply, getPrefix) {
        function go() {
            const t = inp.value.trim(); if (!t) return;
            const quote = getPrefix ? getPrefix() : "";
            roomMsg(box, "user", quote ? "「" + quote + "」\n" + t : t); inp.value = "";
            setTimeout(function () {
                const r = makeReply(t, quote); roomMsg(box, "ai", r);
                if (window.updateStatusFromText) window.updateStatusFromText(t + " " + r);
            }, 600);
        }
        sendBtn.addEventListener("click", go);
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); } });
    }

    // —— 观影室 ——
    const video = $("cinemaVideo"), cBox = $("cinemaMessages");
    $("cinemaFile").addEventListener("change", function () {
        const f = this.files && this.files[0]; if (!f) return;
        video.src = URL.createObjectURL(f); video.classList.remove("hidden"); $("cinemaEmpty").classList.add("hidden");
        roomMsg(cBox, "ai", "《" + f.name.replace(/\.[^.]+$/, "") + "》我们一起看吧～爆米花准备好了吗 🍿");
        this.value = "";
    });
    let lastC = 0;
    function cinemaSay(text) { if (Date.now() - lastC < 4000) return; lastC = Date.now(); roomMsg(cBox, "ai", text); }
    video.addEventListener("play", function () { cinemaSay(pick(["开始啦～", "继续看！我也在认真看呢 👀"])); });
    video.addEventListener("pause", function () { if (!video.ended) cinemaSay(pick(["暂停了？是想聊聊刚刚那段吗？", "休息一下也好～"])); });
    video.addEventListener("ended", function () { cinemaSay("看完啦！你觉得怎么样？我想听听你的感想 ♡"); });
    bindChat(cBox, $("cinemaInput"), $("cinemaSend"), function () {
        const m = Math.floor(video.currentTime / 60), s = String(Math.floor(video.currentTime % 60)).padStart(2, "0");
        return video.src ? pick(["我也是这么觉得～（现在 " + m + ":" + s + "）", "这一段我印象很深！", "唔……让我再看一遍这里～"]) : "先上传一个视频，我们再一起聊吧～";
    });

    // —— 阅读室 ——
    const view = $("readerView"), rBox = $("readingMessages"), panel = $("readingPanel"), ball = $("aiBall");
    let book = { name: "", chapters: [], idx: 0 }, size = 17, sel = "";
    function renderChapter(i, keepScroll) {
        if (!book.chapters.length) return;
        book.idx = Math.max(0, Math.min(book.chapters.length - 1, i));
        const c = book.chapters[book.idx];
        view.innerHTML = ""; const h2 = document.createElement("h2"); h2.textContent = c.title; view.appendChild(h2);
        view.appendChild(document.createTextNode(c.text));
        if (!keepScroll) view.scrollTop = 0;
        $("chapterSelect").value = book.idx;
        try { localStorage.setItem("readProgress:" + book.name, book.idx); } catch (e) {}
    }
    function loadBook(name, chapters) {
        book = { name: name, chapters: chapters, idx: 0 };
        $("bookTitle").textContent = "📖 " + name; $("readerTools").classList.remove("hidden");
        $("chapterSelect").innerHTML = chapters.map(function (c, i) { return "<option value='" + i + "'>" + c.title.replace(/</g, "&lt;") + "</option>"; }).join("");
        let saved = 0; try { saved = parseInt(localStorage.getItem("readProgress:" + name)) || 0; } catch (e) {}
        renderChapter(saved);
        roomMsg(rBox, "ai", "《" + name + "》我也翻开啦～想聊哪一段，选中文字再点我就好 ♡");
    }
    function splitTxt(text) {
        const re = /^[ \t]*(第[0-9一二三四五六七八九十百千零〇两]+[章节回卷集部篇][^\n]{0,30})$/gm, hits = [];
        let m; while ((m = re.exec(text))) hits.push({ i: m.index, t: m[1].trim() });
        const out = [];
        if (hits.length >= 2) {
            if (hits[0].i > 50) out.push({ title: "序", text: text.slice(0, hits[0].i).trim() });
            hits.forEach(function (x, k) { out.push({ title: x.t, text: text.slice(x.i, k + 1 < hits.length ? hits[k + 1].i : undefined).replace(x.t, "").trim() }); });
        } else {
            for (let p = 0, n = 1; p < text.length; p += 5000, n++) out.push({ title: "第 " + n + " 段", text: text.slice(p, p + 5000) });
        }
        return out;
    }
    function loadScript(src) { return new Promise(function (ok, no) { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
    async function readEpub(buf) {
        if (!window.JSZip) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
        const zip = await JSZip.loadAsync(buf), dp = new DOMParser();
        const opfPath = (await zip.file("META-INF/container.xml").async("string")).match(/full-path="([^"]+)"/)[1];
        const opf = dp.parseFromString(await zip.file(opfPath).async("string"), "application/xml");
        const base = opfPath.includes("/") ? opfPath.replace(/[^/]+$/, "") : "", map = {};
        opf.querySelectorAll("manifest > item").forEach(function (it) { map[it.getAttribute("id")] = it.getAttribute("href"); });
        const out = [];
        for (const ref of opf.querySelectorAll("spine > itemref")) {
            const href = map[ref.getAttribute("idref")]; const f = href && zip.file(decodeURIComponent(base + href)); if (!f) continue;
            const doc = dp.parseFromString(await f.async("string"), "text/html");
            const text = (doc.body ? doc.body.innerText || doc.body.textContent : "").replace(/\n{3,}/g, "\n\n").trim(); if (text.length < 20) continue;
            const hd = doc.querySelector("h1,h2,h3,title");
            out.push({ title: (hd && hd.textContent.trim().slice(0, 40)) || "第 " + (out.length + 1) + " 节", text: text });
        }
        return out;
    }
    $("bookFile").addEventListener("change", async function () {
        const f = this.files && this.files[0]; if (!f) return; this.value = "";
        const name = f.name.replace(/\.[^.]+$/, "");
        try {
            const buf = await f.arrayBuffer();
            if (/\.epub$/i.test(f.name)) { loadBook(name, await readEpub(buf)); return; }
            let text; try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder("gbk").decode(buf); }
            loadBook(name, splitTxt(text));
        } catch (e) { alert("这本书暂时打不开（EPUB 需要联网加载解析库）。"); }
    });
    $("chapterSelect").addEventListener("change", function () { renderChapter(+this.value); });
    $("chapPrev").addEventListener("click", function () { renderChapter(book.idx - 1); });
    $("chapNext").addEventListener("click", function () { renderChapter(book.idx + 1); });
    function setSize(d) { size = Math.max(13, Math.min(28, size + d)); readingRoom.style.setProperty("--read-size", size + "px"); }
    $("fontMinus").addEventListener("click", function () { setSize(-1); });
    $("fontPlus").addEventListener("click", function () { setSize(1); });
    document.addEventListener("selectionchange", function () {
        const s = window.getSelection(), t = s ? s.toString().trim() : "";
        if (t && view.contains(s.anchorNode)) sel = t.slice(0, 200);
    });
    bindChat(rBox, $("readingInput"), $("readingSend"), function (t, q) {
        if (!book.chapters.length) return "先上传一本书吧，我陪你一起读～";
        const c = book.chapters[book.idx].title;
        return q ? pick(["这句话很有意思，你为什么会注意到它？", "我觉得这里藏着一点情绪呢～你怎么看？"]) : pick(["在「" + c + "」里我也有同感～", "这一章的节奏挺有意思的，你读到哪了？", "唔……让我想想怎么说～"]);
    }, function () { const q = sel; sel = ""; return q; });

    // —— 悬浮球：任意拖动，松手吸边；点一下开/关聊天 ——
    function syncBallAvatar() {
        const src = typeof avatarSettings !== "undefined" && avatarSettings.aiImage;
        ball.style.backgroundImage = src ? 'url("' + src + '")' : "none"; ball.textContent = src ? "" : "♡";
    }
    let drag = null;
    ball.addEventListener("pointerdown", function (e) {
        const r = readingRoom.getBoundingClientRect();
        drag = { sx: e.clientX, sy: e.clientY, ox: ball.offsetLeft, oy: ball.offsetTop, moved: false, w: r.width, h: r.height };
        ball.setPointerCapture(e.pointerId); ball.classList.add("dragging");
    });
    ball.addEventListener("pointermove", function (e) {
        if (!drag) return;
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
        if (!drag.moved) return;
        ball.style.left = Math.max(0, Math.min(drag.w - 52, drag.ox + dx)) + "px";
        ball.style.top = Math.max(0, Math.min(drag.h - 52, drag.oy + dy)) + "px";
    });
    ball.addEventListener("pointerup", function () {
        if (!drag) return; ball.classList.remove("dragging");
        if (drag.moved) { ball.style.left = (ball.offsetLeft + 26 < drag.w / 2 ? 6 : drag.w - 58) + "px"; }
        else { syncBallAvatar(); const open = panel.classList.toggle("hidden") === false; ball.classList.toggle("on", open); if (open) { rBox.scrollTop = rBox.scrollHeight; $("readingInput").focus(); } }
        drag = null;
    });
    syncBallAvatar();
    new MutationObserver(syncBallAvatar).observe(document.getElementById("chatPage"), { subtree: true, attributes: true, attributeFilter: ["src"] });
})();
