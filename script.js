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

let chatTurns = [];
let chatBusy = false;

function addChatTurn(role, content) {
    if (!content) return;
    chatTurns.push({ role: role, content: String(content) });
    if (chatTurns.length > 30) chatTurns = chatTurns.slice(-30);
}

async function requestRealAI(text, onDelta) {
    if (!window.getApiConfig) throw new Error("API 管理模块还没有加载");
    const c = window.getApiConfig("main");
    if (!c.url || !c.key || !c.model) throw new Error("请先到「API 管理 → 主 API」填写 API 地址、API 密钥和模型");

    const system = window.buildSystemPrompt ? window.buildSystemPrompt(text) : "";
    const messagesForApi = [];
    if (system) messagesForApi.push({ role: "system", content: system });
    // 减少上下文长度，降低免费模型每次请求需要处理的 token 数量。
    chatTurns.slice(-12).forEach(function (m) {
        messagesForApi.push({ role: m.role, content: m.content });
    });
    messagesForApi.push({ role: "user", content: text });

    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, 150000);

    let r;
    try {
        r = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: c.url,
                key: c.key,
                model: c.model,
                messages: messagesForApi,
                max_tokens: 900
            }),
            signal: controller.signal
        });
    } catch (e) {
        if (e && e.name === "AbortError") throw new Error("等待 API 回复超过 150 秒，模型可能较慢或上游拥堵");
        throw new Error("聊天接口连接失败：" + (e && e.message || e));
    } finally {
        clearTimeout(timeout);
    }

    if (!r.ok) {
        let data = {};
        try { data = await r.json(); } catch (_) {}
        throw new Error(data.error || data.message || ("API 请求失败（HTTP " + r.status + "）"));
    }

    if (!r.body || !r.body.getReader) {
        let data = {};
        try { data = await r.json(); } catch (_) {}
        const fallback = String(data.content || "").trim();
        if (!fallback) throw new Error("模型返回了空消息");
        if (onDelta) onDelta(fallback);
        return fallback;
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let reply = "";
    let finished = false;

    function handleEvent(eventText) {
        const lines = eventText.split(/\r?\n/);
        for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;
            let obj;
            try { obj = JSON.parse(raw); } catch (_) { continue; }

            if (obj.type === "delta" && obj.content) {
                reply += String(obj.content);
                if (onDelta) onDelta(String(obj.content));
            } else if (obj.type === "error") {
                throw new Error(obj.error || "模型请求失败");
            } else if (obj.type === "done") {
                finished = true;
            }
        }
    }

    while (true) {
        const part = await reader.read();
        if (part.done) break;
        buffer += decoder.decode(part.value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) handleEvent(event);
    }

    buffer += decoder.decode();
    if (buffer.trim()) handleEvent(buffer);

    if (!reply.trim()) throw new Error(finished ? "模型返回了空消息" : "模型没有返回可显示的内容");
    return reply.trim();
}

async function speakWithApi(text) {
    if (!window.getApiConfig) throw new Error("API 管理模块还没有加载");
    const c = window.getApiConfig("voice");
    if (!c.url || !c.key || !c.model) throw new Error("请先到「API 管理 → 语音 API」填写地址、密钥和模型");
    const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: c.provider || "custom", url: c.url, key: c.key, model: c.model, voice: c.voice, text: text }) });
    if (!r.ok) { let j = {}; try { j = await r.json(); } catch (_) {} throw new Error(j.error || ("语音 API 请求失败（HTTP " + r.status + "）")); }
    const audio = new Audio(URL.createObjectURL(await r.blob())); await audio.play(); return audio;
}
window.speakWithApi = speakWithApi;

async function sendMessage() {
    const text = input.value.trim();
    if (!text || chatBusy) return;
    chatBusy = true;
    appendUserTextMessage(text);
    input.value = "";
    const typingRow = document.createElement("div");
    typingRow.className = "message-row ai-row";
    typingRow.appendChild(createAvatarElement("ai", false));
    const typingContent = document.createElement("div");
    const typingName = document.createElement("div"); typingName.className = "ai-name"; typingName.textContent = "小屋 AI";
    const typingMessage = document.createElement("div"); typingMessage.className = "message ai-message typing"; typingMessage.textContent = "正在思考……";
    typingContent.appendChild(typingName); typingContent.appendChild(typingMessage); typingRow.appendChild(typingContent);
    messages.appendChild(typingRow);
    scrollChatToBottom();
    try {
        const liveMessage = typingMessage;
        liveMessage.classList.remove("typing");
        liveMessage.classList.add("streaming");
        liveMessage.textContent = "";

        const reply = await requestRealAI(text, function (delta) {
            liveMessage.textContent += delta;
            scrollChatToBottom();
        });

        liveMessage.classList.remove("streaming");
        if (!liveMessage.textContent.trim()) liveMessage.textContent = reply;
        addChatTurn("user", text);
        addChatTurn("assistant", reply);
        applyCustomBubbles();
        if (window.updateStatusFromText) window.updateStatusFromText(text + " " + reply);
        if (window.addMemory) window.addMemory("chat", "聊到：" + (window.briefText ? window.briefText(text) : text.slice(0, 24)));
        if (window.activeAiCall && window.activeAiCall.type === "voice") {
            try { await speakWithApi(reply); } catch (e) {
                if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(reply); utterance.lang = "zh-CN"; window.speechSynthesis.speak(utterance); }
            }
        }
    } catch (e) {
        typingRow.remove();
        const msg = "这次没有连上 API：" + (e && e.message || e) + "\n请检查「API 管理 → 主 API」里的地址、密钥和模型。";
        appendAiTextMessage(msg);
        // 失败的请求不进入上下文，避免下一次把错误提示当成 AI 的回答发送给模型。
        chatTurns = chatTurns.filter(function (m, i) { return !(i === chatTurns.length - 1 && m.role === "user" && m.content === text); });
        if (window.updateStatusFromText) window.updateStatusFromText("API 连接失败");
    } finally {
        chatBusy = false;
        scrollChatToBottom();
    }
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
    "xiaohongshu": "小红书",
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
        } else if (page === "xiaohongshu" || page === "about") {
            // 小红书 / 关于小屋由统一 room 导航接管，这里不再显示旧的占位卡片。
            menuPlaceholder.classList.remove("show");
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
    document.body.classList.remove("room-open");
    chatPage.classList.remove("hidden");
    appearancePage.classList.add("hidden");
    if (pixelHomePage) pixelHomePage.classList.add("hidden");
    menuPlaceholder.classList.remove("show");
}

function showAppearancePage() {
    document.body.classList.add("room-open");
    chatPage.classList.add("hidden");
    appearancePage.classList.remove("hidden");
    if (pixelHomePage) pixelHomePage.classList.add("hidden");
    menuPlaceholder.classList.remove("show");
}

function showPixelHomePage() {
    document.body.classList.add("room-open");
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
    const cinemaRoom = $("cinemaRoom"), readingRoom = $("readingRoom"), apiRoom = $("apiRoom"), setRoom = $("settingsRoom"), memRoom = $("memoryRoom"), starRoom = $("starsRoom"), accRoom = $("accountRoom"), xhsRoom = $("xiaohongshuRoom"), aboutRoom = $("aboutRoom");

    // —— 页面切换：用捕获阶段接管，不影响原有菜单逻辑 ——
    function hideRooms() {
        [cinemaRoom, readingRoom, apiRoom, setRoom, memRoom, starRoom, accRoom, xhsRoom, aboutRoom].forEach(function (r) { if (r) r.classList.add("hidden"); });
        document.body.classList.remove("room-open");
    }
    function openRoom(room) {
        showChatPage(); hideRooms();
        room.classList.remove("hidden"); document.body.classList.add("room-open"); window.dispatchEvent(new CustomEvent("roomopen", { detail: room.id }));
        const v = $("cinemaVideo"); if (room !== cinemaRoom && v) v.pause();
        syncChatBackgroundLayer();
    }
    document.querySelector(".menu-list").addEventListener("click", function (e) {
        const item = e.target.closest(".menu-item"); if (!item) return;
        const page = item.dataset.page;
        if (page !== "cinema" && page !== "reading" && page !== "api" && page !== "ai-settings" && page !== "memory" && page !== "stars" && page !== "account" && page !== "xiaohongshu" && page !== "about") { hideRooms(); return; }
        e.stopPropagation();
        menuItems.forEach(function (o) { o.classList.toggle("active", o === item); });
        openRoom({ cinema: cinemaRoom, reading: readingRoom, api: apiRoom, "ai-settings": setRoom, memory: memRoom, stars: starRoom, account: accRoom, xiaohongshu: xhsRoom, about: aboutRoom }[page]);
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
            roomMsg(box, "user", quote ? "「" + quote + "」\n" + t : t); inp.value = ""; if (window.onRoomChat) window.onRoomChat(box.id, t);
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
        video.src = URL.createObjectURL(f); window.__cinemaName = f.name.replace(/\.[^.]+$/, ""); if (window.addMemory) window.addMemory("cinema", "一起看了《" + window.__cinemaName + "》"); video.classList.remove("hidden"); $("cinemaEmpty").classList.add("hidden");
        roomMsg(cBox, "ai", "《" + f.name.replace(/\.[^.]+$/, "") + "》我们一起看吧～爆米花准备好了吗 🍿");
        this.value = "";
    });
    let lastC = 0;
    function cinemaSay(text) { if (Date.now() - lastC < 4000) return; lastC = Date.now(); roomMsg(cBox, "ai", text); }
    video.addEventListener("play", function () { cinemaSay(pick(["开始啦～", "继续看！我也在认真看呢 👀"])); });
    video.addEventListener("pause", function () { if (!video.ended) cinemaSay(pick(["暂停了？是想聊聊刚刚那段吗？", "休息一下也好～"])); });
    video.addEventListener("ended", function () { if (window.addMemory && window.__cinemaName) window.addMemory("cinema", "看完了《" + window.__cinemaName + "》"); cinemaSay("看完啦！你觉得怎么样？我想听听你的感想 ♡"); });
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
        const c = book.chapters[book.idx]; window.__chapTitle = c.title;
        view.innerHTML = ""; const h2 = document.createElement("h2"); h2.textContent = c.title; view.appendChild(h2);
        view.appendChild(document.createTextNode(c.text));
        if (!keepScroll) view.scrollTop = 0;
        $("chapterSelect").value = book.idx;
        try { localStorage.setItem("readProgress:" + book.name, book.idx); } catch (e) {}
    }
    function loadBook(name, chapters) {
        book = { name: name, chapters: chapters, idx: 0 }; window.__bookName = name; if (window.addMemory) window.addMemory("reading", "翻开了《" + name + "》");
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


// ===== v0.9：API 管理（配置保存在本机浏览器 localStorage）=====
(function () {
    const KEY = "apiConfigV1"; let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
    const trim = function (u) { return (u || "").trim().replace(/\/+$/, ""); };
    // 供聊天 / 记忆 / 语音 / 生图模块读取：副 API 勾选「跟随主 API」时自动沿用主 API 的地址与密钥
    window.getApiConfig = function (sec) {
        const c = Object.assign({}, cfg[sec] || {});
        if (c.follow) { const m = cfg.main || {}; c.url = m.url; c.key = m.key; }
        return c;
    };
    function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
    function field(box, sec, key, label, o) {
        o = o || {}; cfg[sec] = cfg[sec] || {};
        const w = el("label", "api-field"); w.appendChild(el("span", "", label));
        let inp;
        if (o.options) { inp = el("select"); o.options.forEach(function (p) { const op = el("option", "", p[1]); op.value = p[0]; inp.appendChild(op); }); }
        else if (o.rows) { inp = el("textarea"); inp.rows = o.rows; }
        else { inp = el("input"); inp.type = o.secret ? "password" : "text"; inp.autocomplete = "off"; inp.setAttribute("autocapitalize", "off"); }
        if (o.ph) inp.placeholder = o.ph; if (o.list) inp.setAttribute("list", o.list);
        inp.value = cfg[sec][key] != null ? cfg[sec][key] : (o.def || "");
        if (cfg[sec][key] == null && o.def) cfg[sec][key] = o.def;
        inp.addEventListener("input", function () { cfg[sec][key] = inp.value; save(); });
        if (o.secret) {
            const row = el("div", "api-keyrow"), t = el("button", "", "显示"); t.type = "button";
            t.addEventListener("click", function () { inp.type = inp.type === "password" ? "text" : "password"; t.textContent = inp.type === "password" ? "显示" : "隐藏"; });
            row.appendChild(inp); row.appendChild(t); w.appendChild(row);
        } else w.appendChild(inp);
        box.appendChild(w); inp.wrap = w; return inp;
    }
    function actions(box, list) {
        const row = el("div", "api-actions"), st = el("div", "api-status");
        list.forEach(function (a) {
            const b = el("button", a[2] || "", a[0]); b.type = "button";
            b.addEventListener("click", async function () { b.disabled = true; st.className = "api-status"; st.textContent = "请求中…"; try { await a[1](st); } catch (e) { fail(st, e); } b.disabled = false; });
            row.appendChild(b);
        });
        box.appendChild(row); box.appendChild(st);
    }
    function ok(st, t) { st.className = "api-status ok"; st.textContent = t; }
    function fail(st, e) { st.className = "api-status err"; st.textContent = "失败：" + (e && e.message || e) + "\n（检查地址/密钥；也可能是该服务不允许浏览器直接访问 CORS，需要走中转或后端）"; }
    async function http(url, opt) { const r = await fetch(url, opt); if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 160)); return r; }
    const auth = function (c) { return { Authorization: "Bearer " + (c.key || "").trim(), "Content-Type": "application/json" }; };
    let uid = 0;

    // —— 网页自定义模型选择器：避免 Android 浏览器把 datalist 选项显示到键盘上方 ——
    function modelField(box, sec, label) {
        cfg[sec] = cfg[sec] || {};
        const w = el("label", "api-field api-model-field");
        w.appendChild(el("span", "", label));
        const wrap = el("div", "api-model-picker");
        const inp = el("input");
        inp.type = "text";
        inp.autocomplete = "off";
        inp.setAttribute("autocapitalize", "off");
        inp.spellcheck = false;
        inp.placeholder = "手动输入模型，或点右侧选择";
        inp.value = cfg[sec].model || "";
        const btn = el("button", "api-model-toggle", "▼");
        btn.type = "button";
        const menu = el("div", "api-model-menu");
        menu.hidden = true;
        const search = el("input", "api-model-search");
        search.type = "search";
        search.placeholder = "搜索已拉取的模型…";
        search.autocomplete = "off";
        const list = el("div", "api-model-list");
        menu.appendChild(search);
        menu.appendChild(list);
        wrap.appendChild(inp);
        wrap.appendChild(btn);
        wrap.appendChild(menu);
        w.appendChild(wrap);
        box.appendChild(w);
        function models() { return Array.isArray(cfg[sec].models) ? cfg[sec].models : []; }
        function render(filter) {
            list.innerHTML = "";
            const q = String(filter || "").trim().toLowerCase();
            const arr = models().filter(function (m) { return !q || String(m).toLowerCase().includes(q); });
            if (!arr.length) {
                list.appendChild(el("div", "api-model-empty", models().length ? "没有匹配的模型" : "还没有拉取模型"));
                return;
            }
            arr.forEach(function (m) {
                const b = el("button", "api-model-option", String(m));
                b.type = "button";
                b.addEventListener("click", function () {
                    inp.value = String(m);
                    cfg[sec].model = String(m);
                    save();
                    close();
                });
                list.appendChild(b);
            });
        }
        function open() { render(search.value); menu.hidden = false; btn.textContent = "▲"; }
        function close() { menu.hidden = true; btn.textContent = "▼"; }
        inp.addEventListener("input", function () { cfg[sec].model = inp.value; save(); render(inp.value); });
        inp.addEventListener("focus", function () { open(); });
        btn.addEventListener("click", function (e) { e.preventDefault(); menu.hidden ? open() : close(); });
        search.addEventListener("input", function () { render(search.value); });
        document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) close(); });
        w._modelInput = inp;
        w._modelListRefresh = function () { render(search.value); };
        return inp;
    }

    // —— 聊天类 API（主 API / 三个副 API 共用）——
    function llmCard(pane, sec, title, desc, o) {
        o = o || {}; cfg[sec] = cfg[sec] || {};
        const card = el("div", "api-card"); card.appendChild(el("h3", "", title)); card.appendChild(el("p", "", desc));
        let fb = card;
        if (o.follow) {
            const sw = el("label", "api-switch"), cb = el("input"); cb.type = "checkbox"; cb.checked = cfg[sec].follow !== false; cfg[sec].follow = cb.checked;
            sw.appendChild(cb); sw.appendChild(el("span", "", "跟随主 API（共用地址和密钥，只单独选模型）")); card.appendChild(sw);
            fb = el("div"); card.appendChild(fb);
            cb.addEventListener("change", function () { cfg[sec].follow = cb.checked; save(); fb.style.display = cb.checked ? "none" : ""; }); fb.style.display = cb.checked ? "none" : "";
        }
        if (o.name) field(fb, sec, "name", "名称", { ph: "例如：我的主 API", def: o.name });
        field(fb, sec, "url", "API 地址", { ph: "https://api.example.com/v1" });
        field(fb, sec, "key", "API 密钥", { secret: true, ph: "sk-…" });
        const modelInput = modelField(card, sec, "模型（可手填，也可拉取后选择）");
        if (o.prompt) field(card, sec, "prompt", o.prompt[0], { rows: 4, def: o.prompt[1] });
        actions(card, [
            ["拉取模型", async function (st) {
                const c = window.getApiConfig(sec);
                const r = await http("/api/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: c.url, key: c.key }) });
                const j = await r.json();
                const ids = Array.isArray(j.models) ? j.models : [];
                cfg[sec].models = ids; save();
                if (modelInput && modelInput.parentElement && modelInput.parentElement.parentElement && modelInput.parentElement.parentElement._modelListRefresh) modelInput.parentElement.parentElement._modelListRefresh();
                ok(st, "拉取到 " + ids.length + " 个模型，点模型框右侧 ▼ 即可在网页里选择。");
            }, "alt"],
            ["测试模型", async function (st) {
                const c = window.getApiConfig(sec), t0 = Date.now();
                const r = await http("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: c.url, key: c.key, model: c.model, messages: [{ role: "user", content: "请只回复：连接成功" }], max_tokens: 30 }) });
                const j = await r.json();
                ok(st, "✓ 可用（" + (Date.now() - t0) + " ms）\n模型回复：" + (j.content || JSON.stringify(j).slice(0, 120)));
            }]
        ]);
        pane.appendChild(card);
    }

    const VOICE = [["fish", "鱼声 Fish Audio", "https://api.fish.audio/v1", "s2.1-pro-free"], ["openai", "OpenAI TTS", "https://api.openai.com/v1", "tts-1"],
        ["eleven", "ElevenLabs", "https://api.elevenlabs.io/v1", "eleven_multilingual_v2"], ["minimax", "MiniMax", "https://api.minimaxi.com/v1", ""],
        ["ali", "阿里云百炼（CosyVoice）", "", ""], ["volc", "火山引擎", "", ""], ["azure", "微软 Azure", "", ""], ["custom", "自定义（OpenAI 兼容格式）", "", "tts-1"]];
    function voiceCard(pane) {
        const sec = "voice"; cfg[sec] = cfg[sec] || {};
        const card = el("div", "api-card"); card.appendChild(el("h3", "", "🔊 语音 API")); card.appendChild(el("p", "", "用于 AI 说话（TTS）。请求统一经过本站 /api/tts 中转，不把密钥直接暴露给第三方浏览器请求。可选厂商请以官方文档为准。"));
        const prov = field(card, sec, "provider", "厂商", { options: VOICE.map(function (v) { return [v[0], v[1]]; }), def: "fish" });
        const url = field(card, sec, "url", "API 地址", { def: VOICE[0][2] });
        field(card, sec, "key", "API 密钥", { secret: true });
        const model = field(card, sec, "model", "模型", { def: "s1" });
        field(card, sec, "voice", "音色 ID / 参考音色（Fish 的 reference_id、OpenAI 的 voice 等）", { ph: "例如 alloy" });
        prov.addEventListener("change", function () {
            const v = VOICE.filter(function (x) { return x[0] === prov.value; })[0];
            url.value = cfg[sec].url = v[2]; model.value = cfg[sec].model = v[3]; save();
        });
        actions(card, [["试听", async function (st) {
            const c = cfg[sec], text = "你好呀，我是你的小屋 AI。";
            const r = await http("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: c.provider, url: c.url, key: c.key, model: c.model, voice: c.voice, text: text }) });
            const a = el("audio"); a.controls = true; a.src = URL.createObjectURL(await r.blob()); ok(st, "✓ 合成成功"); st.appendChild(a); a.play().catch(function () {});
        }]]);
        pane.appendChild(card);
    }

    function imageCard(pane) {
        const sec = "image"; cfg[sec] = cfg[sec] || {};
        const card = el("div", "api-card"); card.appendChild(el("h3", "", "🎨 生图 API")); card.appendChild(el("p", "", "OpenAI 兼容的 /images/generations 接口。API 地址可填写基础地址（如 https://api.example.com/v1）或完整 /images/generations 地址；请求统一经过本站 /api/image 中转，密钥不会直接出现在浏览器发往第三方的请求里。"));
        field(card, sec, "url", "API 地址", { ph: "https://api.example.com/v1" });
        field(card, sec, "key", "API 密钥", { secret: true });
        const dl = el("datalist"); dl.id = "models" + (++uid); card.appendChild(dl);
        (cfg[sec].models || []).forEach(function (m) { const op = el("option"); op.value = m; dl.appendChild(op); });
        field(card, sec, "model", "模型", { list: dl.id, ph: "dall-e-3 / flux …" });
        field(card, sec, "size", "图片尺寸", { def: "1024x1024" });
        field(card, sec, "style", "生图提示词（固定前缀 / 画风，每次都会带上）", { rows: 3, ph: "例如：粉色系，可爱插画风，柔和光线" });
        const tp = field(card, sec, "test", "测试画面描述", { def: "一只坐在窗边的小猫" });
        actions(card, [
            ["拉取模型", async function (st) {
                const c = cfg[sec]; const r = await http("/api/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: c.url, key: c.key }) });
                const j = await r.json(), ids = j.models || []; dl.innerHTML = ""; ids.forEach(function (m) { const op = el("option"); op.value = m; dl.appendChild(op); });
                cfg[sec].models = ids; save(); ok(st, "拉取到 " + ids.length + " 个模型。");
            }, "alt"],
            ["生成测试图", async function (st) {
                const c = cfg[sec]; const r = await http("/api/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: c.url, key: c.key, model: c.model, prompt: ((c.style || "") + " " + (c.test || "")).trim(), n: 1, size: c.size || "1024x1024" }) });
                const j = await r.json(), d = j.data && j.data[0]; if (!d) throw new Error(JSON.stringify(j).slice(0, 160));
                ok(st, "✓ 生成成功"); const img = el("img"); img.alt = "AI 生成测试图"; img.src = d.url || ("data:image/png;base64," + d.b64_json); img.style.maxWidth = "100%"; img.style.borderRadius = "16px"; st.appendChild(img);
            }]
        ]);
        pane.appendChild(card);
    }

    const body = document.getElementById("apiBody"), panes = {};
    ["main", "mem", "other"].forEach(function (k) { panes[k] = el("div", "api-pane" + (k === "main" ? "" : " hidden")); body.appendChild(panes[k]); });
    llmCard(panes.main, "main", "💬 主 API", "负责日常聊天：名称、地址、密钥、模型都在这里设置。", { name: "主 API" });
    llmCard(panes.mem, "mem_chat", "🧠 聊天记忆", "把聊天内容整理成长期记忆。", { follow: true, prompt: ["记忆整理提示词", "请把下面的对话提炼成简短的长期记忆，保留用户的喜好、重要事件和约定。"] });
    llmCard(panes.mem, "mem_cinema", "🎬 观影室记忆", "记住一起看过的片子和当时的感想。", { follow: true, prompt: ["记忆整理提示词", "请记录一起看过的影片名称、用户的感受和讨论到的片段。"] });
    llmCard(panes.mem, "mem_reading", "📖 阅读室记忆", "记住读过的书、进度和讨论内容。", { follow: true, prompt: ["记忆整理提示词", "请记录书名、读到的章节、用户划线的句子和讨论的观点。"] });
    voiceCard(panes.other); imageCard(panes.other);
    document.getElementById("apiTabs").addEventListener("click", function (e) {
        const b = e.target.closest("button"); if (!b) return;
        document.querySelectorAll("#apiTabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
        Object.keys(panes).forEach(function (k) { panes[k].classList.toggle("hidden", k !== b.dataset.tab); });
    });
    save();
})();


// ===== v1.0：开屏动画（约 6.4 秒，点一下可跳过）=====
(function () {
    const splash = document.getElementById("splash"); if (!splash) return;
    function closeSplash() { if (splash.classList.contains("out")) return; splash.classList.add("out"); setTimeout(function () { splash.remove(); }, 550); }
    splash.addEventListener("click", closeSplash);
    setTimeout(closeSplash, 6400);
})();


// ===== v1.1：主题颜色 / 图标颜色 / 字体 =====
(function () {
    const KEY = "myAiHomeThemeV1";
    const ITEMS = [["accent", "主色", "按钮、开关、重点按钮"], ["strong", "强调色", "标题、选中的文字"], ["soft", "浅色块", "选中底色、标签底色"],
        ["bg", "顶栏背景", "页头、面板的浅底色"], ["bg2", "面板底色", "菜单、输入区底色"], ["line", "边框线", "分隔线、描边"],
        ["text", "正文文字", "聊天和页面里的主要文字"], ["sub", "次要文字", "说明、提示小字"], ["icon", "图标颜色", "菜单、工具栏等图标（默认跟随文字）"]];
    const DEF = { accent: "#e78ab3", strong: "#d96c9d", soft: "#ffd6e7", bg: "#fff0f6", bg2: "#fff7fa", line: "#f4dbe6", text: "#5c3d4a", sub: "#9b607a" };
    const PRESETS = [["粉色（默认）", DEF],
        ["薄荷绿", { accent: "#5fbfa0", strong: "#2f9a7b", soft: "#cdeee3", bg: "#effaf6", bg2: "#f7fdfb", line: "#d5ebe3", text: "#35514a", sub: "#5f8a7e" }],
        ["天空蓝", { accent: "#6ea8e6", strong: "#3d7fcf", soft: "#d3e6fa", bg: "#eef6fd", bg2: "#f7fbff", line: "#d6e4f2", text: "#34475c", sub: "#5f7d9b" }],
        ["薰衣草", { accent: "#a98be0", strong: "#8a62cf", soft: "#e6dcf8", bg: "#f5f0fd", bg2: "#faf7ff", line: "#e3daf2", text: "#433858", sub: "#7d6c9b" }],
        ["奶茶棕", { accent: "#c49a74", strong: "#a9724a", soft: "#f0e0d1", bg: "#fbf3ea", bg2: "#fdf8f3", line: "#eadccc", text: "#4f3b2d", sub: "#8b6e58" }],
        ["奶油黄", { accent: "#f0b445", strong: "#d9921a", soft: "#fbe9bd", bg: "#fff8e6", bg2: "#fffcf2", line: "#f2e6c4", text: "#54432a", sub: "#8d7545" }]];
    const BUILTIN = [["默认字体", ""], ["宋体 / 衬线", '"Songti SC","Noto Serif SC","SimSun",serif'], ["楷体", '"Kaiti SC","KaiTi","STKaiti",serif'],
        ["圆体", '"Yuanti SC","YouYuan","Hiragino Maru Gothic ProN","Varela Round",sans-serif'], ["行楷 / 手写", '"Xingkai SC","STXingkai","Segoe Script",cursive'], ["等宽", 'ui-monospace,"SF Mono",Menlo,Consolas,monospace']];
    let S = { colors: {}, font: "", fonts: [] };
    try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
    function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

    // —— IndexedDB：存导入的字体文件（体积大，localStorage 放不下）——
    function db() { return new Promise(function (ok, no) { const r = indexedDB.open("myAiHomeFonts", 1); r.onupgradeneeded = function () { r.result.createObjectStore("f"); }; r.onsuccess = function () { ok(r.result); }; r.onerror = no; }); }
    async function idb(mode, fn) { const d = await db(); return new Promise(function (ok, no) { const tx = d.transaction("f", mode), req = fn(tx.objectStore("f")); tx.oncomplete = function () { ok(req && req.result); }; tx.onerror = no; }); }
    async function registerFont(f) {
        try {
            if (f.kind === "file") { const buf = await idb("readonly", function (s) { return s.get(f.name); }); if (buf) document.fonts.add(await new FontFace(f.name, buf).load()); }
            else if (f.kind === "css") { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = f.url; document.head.appendChild(l); }
            else if (f.kind === "url") document.fonts.add(await new FontFace(f.name, 'url("' + f.url + '")').load());
        } catch (e) { console.warn("字体加载失败", f.name, e); }
    }

    // —— 应用到页面 ——
    const extra = document.createElement("style"); extra.id = "themeExtra"; document.head.appendChild(extra);
    function apply() {
        const root = document.documentElement.style;
        Object.keys(DEF).forEach(function (k) { const v = S.colors[k]; if (v && v.toLowerCase() !== DEF[k]) root.setProperty("--t-" + k, v); else root.removeProperty("--t-" + k); });
        let css = "";
        if (S.colors.icon) css += ".menu-icon,.tool-icon,.menu-button,.header-avatar,.wx-circle,.wx-item button,.room-back,.appearance-back,.room-btn{color:" + S.colors.icon + " !important}.wx-circle{border-color:" + S.colors.icon + " !important}.menu-icon::before,.menu-icon::after,.tool-icon::before,.tool-icon::after{border-color:" + S.colors.icon + " !important}";
        if (S.font) css += "html,body,button,input,textarea,select,.message{font-family:" + S.font + ",sans-serif !important}";
        extra.textContent = css;
        const pv = document.getElementById("themePreview"); if (pv) pv.style.fontFamily = S.font ? S.font + ",sans-serif" : "";
    }
    window.getTheme = function () { return S; };

    // —— 设置面板 ——
    const card = document.getElementById("themeCard"); if (!card) { apply(); return; }
    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    card.innerHTML = '<div class="appearance-card-title">🎨 主题颜色</div><div class="theme-sub">先选一套预设，再用下面的色块微调，改动会立刻生效。</div>';
    const presets = el("div", "theme-presets"); card.appendChild(presets);
    const inputs = {};
    function refresh() {
        ITEMS.forEach(function (it) { inputs[it[0]].value = S.colors[it[0]] || DEF[it[0]] || "#5c3d4a"; });
        presets.querySelectorAll("button").forEach(function (b, i) { const p = PRESETS[i][1]; b.classList.toggle("on", Object.keys(p).every(function (k) { return (S.colors[k] || DEF[k]).toLowerCase() === p[k].toLowerCase(); })); });
    }
    PRESETS.forEach(function (p) {
        const b = el("button", "", '<i style="background:' + p[1].accent + '"></i>' + p[0]); b.type = "button";
        b.addEventListener("click", function () { const ic = S.colors.icon; S.colors = Object.assign({}, p[1]); if (ic) S.colors.icon = ic; save(); apply(); refresh(); });
        presets.appendChild(b);
    });
    ITEMS.forEach(function (it) {
        const row = el("div", "theme-row", "<div>" + it[1] + "<small>" + it[2] + "</small></div>"), inp = el("input"); inp.type = "color"; inputs[it[0]] = inp;
        inp.addEventListener("input", function () { S.colors[it[0]] = inp.value; save(); apply(); refresh(); });
        row.appendChild(inp); card.appendChild(row);
    });
    const btns = el("div", "theme-btns"), rb = el("button", "", "恢复默认配色"), ri = el("button", "", "图标跟随文字"); rb.type = ri.type = "button";
    rb.addEventListener("click", function () { S.colors = {}; save(); apply(); refresh(); });
    ri.addEventListener("click", function () { delete S.colors.icon; save(); apply(); refresh(); });
    btns.appendChild(rb); btns.appendChild(ri); card.appendChild(btns);

    // 字体
    card.appendChild(el("div", "theme-title2", "🔤 字体"));
    card.appendChild(el("div", "theme-sub", "可选内置字体、导入手机里的字体文件（ttf / otf / woff / woff2），或填字体网址。"));
    const sel = el("select", "theme-font-sel"); card.appendChild(sel);
    const prev = el("div", "theme-preview", "字体预览：今天也要开开心心～ Hello 123"); prev.id = "themePreview"; card.appendChild(prev);
    function fillFonts() {
        sel.innerHTML = "";
        BUILTIN.forEach(function (b) { const o = el("option", "", b[0]); o.value = b[1]; sel.appendChild(o); });
        S.fonts.forEach(function (f) { const o = el("option", "", "★ " + f.name); o.value = '"' + f.name.replace(/"/g, "") + '"'; sel.appendChild(o); });
        sel.value = S.font; if (sel.value !== S.font) { S.font = ""; sel.value = ""; }
    }
    sel.addEventListener("change", function () { S.font = sel.value; save(); apply(); });
    const fb = el("div", "theme-btns"); card.appendChild(fb);
    const imp = el("label", "", '导入字体文件<input type="file" accept=".ttf,.otf,.woff,.woff2" hidden>');
    imp.querySelector("input").addEventListener("change", async function () {
        const f = this.files && this.files[0]; if (!f) return; this.value = "";
        const name = (f.name.replace(/\.[^.]+$/, "") || "自定义字体").replace(/["']/g, "");
        try {
            const buf = await f.arrayBuffer(); await idb("readwrite", function (s) { return s.put(buf, name); });
            if (!S.fonts.some(function (x) { return x.name === name; })) S.fonts.push({ name: name, kind: "file" });
            await registerFont({ name: name, kind: "file" }); S.font = '"' + name + '"'; save(); fillFonts(); apply();
        } catch (e) { alert("字体导入失败：" + e.message); }
    });
    const del = el("button", "", "删除所选字体"); del.type = "button";
    del.addEventListener("click", async function () {
        const f = S.fonts.filter(function (x) { return '"' + x.name + '"' === sel.value; })[0]; if (!f) return alert("请先在上面选中一个带 ★ 的自定义字体");
        if (f.kind === "file") await idb("readwrite", function (s) { return s.delete(f.name); });
        S.fonts = S.fonts.filter(function (x) { return x !== f; }); S.font = ""; save(); fillFonts(); apply();
    });
    fb.appendChild(imp); fb.appendChild(del);
    const nm = el("input", "theme-in"); nm.placeholder = "字体名称（在线字体用，例如 ZCOOL KuaiLe）";
    const ur = el("input", "theme-in"); ur.placeholder = "字体文件网址（.ttf/.otf/.woff2）或字体样式表网址（如 Google Fonts 链接）";
    const add = el("div", "theme-btns", "<button type='button'>添加在线字体</button>");
    add.querySelector("button").addEventListener("click", async function () {
        const name = nm.value.trim().replace(/["']/g, ""), url = ur.value.trim(); if (!name || !url) return alert("请填写字体名称和网址");
        const f = { name: name, kind: /\.(ttf|otf|woff2?)(\?.*)?$/i.test(url) ? "url" : "css", url: url };
        S.fonts = S.fonts.filter(function (x) { return x.name !== name; }); S.fonts.push(f);
        await registerFont(f); S.font = '"' + name + '"'; save(); fillFonts(); apply(); nm.value = ur.value = "";
    });
    card.appendChild(nm); card.appendChild(ur); card.appendChild(add);

    fillFonts(); refresh(); apply();
    S.fonts.forEach(registerFont);
})();


// ===== v1.2：自定义表情包（用户和 AI 共用）=====
(function () {
    const KEY = "myAiHomeStickersV1", $ = function (id) { return document.getElementById(id); };
    let list = []; try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
    function save() { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }
    const panel = $("emojiPanel"), grid = $("stickerGrid"), sheet = $("stickerSheet"), msg = $("stkMsg");
    let managing = false, userSent = false;
    function render() {
        grid.innerHTML = ""; panel.classList.toggle("managing", managing);
        if (!list.length) { grid.innerHTML = '<div class="stk-empty">还没有表情包～点下面「添加表情包」导入图片链接</div>'; return; }
        list.forEach(function (s) {
            const d = document.createElement("div"); d.className = "stk-item";
            const im = document.createElement("img"); im.src = s.url; im.alt = s.caption; im.loading = "lazy"; im.onerror = function () { im.style.opacity = ".25"; };
            const sp = document.createElement("span"); sp.textContent = s.caption;
            const x = document.createElement("div"); x.className = "stk-del"; x.textContent = "×";
            x.addEventListener("click", function (e) { e.stopPropagation(); list = list.filter(function (t) { return t !== s; }); save(); render(); });
            d.appendChild(im); d.appendChild(sp); d.appendChild(x);
            d.addEventListener("click", function () {
                if (managing) { const c = prompt("修改配文", s.caption); if (c !== null && c.trim()) { s.caption = c.trim(); save(); render(); } }
                else { panel.classList.add("hidden"); sendSticker(s); }
            });
            grid.appendChild(d);
        });
    }
    function row(who, s) {
        const isUser = who === "user", r = document.createElement("div"); r.className = "message-row " + (isUser ? "user-row" : "ai-row");
        const col = document.createElement("div"), nm = document.createElement("div"); nm.className = isUser ? "user-name" : "ai-name"; nm.textContent = isUser ? "我" : "小屋 AI";
        const m = document.createElement("div"); m.className = "message sticker-message " + (isUser ? "user-message" : "ai-message");
        const im = document.createElement("img"); im.src = s.url; im.alt = s.caption; const cp = document.createElement("span"); cp.className = "stk-cap"; cp.textContent = s.caption;
        m.appendChild(im); m.appendChild(cp); col.appendChild(nm); col.appendChild(m);
        const av = createAvatarElement(isUser ? "user" : "ai", isUser);
        if (isUser) { r.appendChild(col); r.appendChild(av); } else { r.appendChild(av); r.appendChild(col); }
        messages.appendChild(r); applyCustomBubbles(); scrollChatToBottom();
        im.addEventListener("load", scrollChatToBottom);
    }
    function sendSticker(s) {
        row("user", s); userSent = true;
        setTimeout(function () { appendAiTextMessage(getAIReply("我发了一个表情包：" + s.caption)); }, 700);
    }
    function find(name) {
        name = name.trim(); return list.filter(function (s) { return s.caption === name; })[0] || list.filter(function (s) { return s.caption.indexOf(name) >= 0 || name.indexOf(s.caption) >= 0; })[0];
    }
    function matchText(t) {
        let best = null, bs = 0;
        list.forEach(function (s) { let sc = 0; for (let i = 0; i + 2 <= s.caption.length; i++) if (t.indexOf(s.caption.substr(i, 2)) >= 0) sc++; if (s.caption.length === 1 && t.indexOf(s.caption) >= 0) sc = 1; if (sc > bs) { bs = sc; best = s; } });
        return best;
    }
    const origAi = appendAiTextMessage;
    appendAiTextMessage = function (text) {
        const re = /\[表情[:：]([^\]]+)\]/g; let last = 0, m, hit = false;
        while ((m = re.exec(text))) { const pre = text.slice(last, m.index).trim(); if (pre) origAi(pre); const s = find(m[1]); if (s) row("ai", s); last = re.lastIndex; hit = true; }
        const rest = text.slice(last).trim(); if (rest || !hit) origAi(rest || text);
        if (!hit && list.length) {
            let s = Math.random() < 0.7 ? matchText(text) : null;
            if (!s && userSent && Math.random() < 0.6) s = list[Math.floor(Math.random() * list.length)];
            if (!s && Math.random() < 0.15) s = list[Math.floor(Math.random() * list.length)];
            if (s) setTimeout(function () { row("ai", s); }, 500);
        }
        userSent = false;
    };
    // 给真实 AI 用：告诉它有哪些表情包、怎么发
    window.getStickerPrompt = function () { return list.length ? "你可以发送表情包：想发时在回复里单独写 [表情:名称]。可用表情包：" + list.map(function (s) { return s.caption; }).join("、") + "。" : ""; };
    window.getStickers = function () { return list.slice(); };

    $("stkManage").addEventListener("click", function () { managing = !managing; render(); });
    $("stkAdd").addEventListener("click", function () { msg.textContent = ""; sheet.classList.remove("hidden"); });
    $("stkClose").addEventListener("click", function () { sheet.classList.add("hidden"); });
    $("stkTabs").addEventListener("click", function (e) {
        const b = e.target.closest("button"); if (!b) return;
        document.querySelectorAll("#stkTabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
        $("stkOne").classList.toggle("hidden", b.dataset.m !== "one"); $("stkMany").classList.toggle("hidden", b.dataset.m !== "many");
    });
    const okUrl = function (u) { return /^(https?:\/\/|data:image\/)/i.test(u); };
    function nameFrom(u) { try { return decodeURIComponent(u.split("?")[0].split("/").pop().replace(/\.[a-z0-9]+$/i, "")).slice(0, 12) || "表情"; } catch (e) { return "表情"; } }
    $("stkSaveOne").addEventListener("click", function () {
        const u = $("stkUrl").value.trim(), c = $("stkCap").value.trim();
        if (!okUrl(u)) { msg.className = "api-status err"; msg.textContent = "请填写以 http(s):// 开头的图片链接"; return; }
        list.push({ url: u, caption: c || nameFrom(u) }); save(); render(); $("stkUrl").value = $("stkCap").value = "";
        msg.className = "api-status ok"; msg.textContent = "✓ 已添加，可以继续添加下一个";
    });
    $("stkSaveMany").addEventListener("click", function () {
        let n = 0, bad = 0;
        $("stkBatch").value.split(/\n+/).forEach(function (ln) {
            ln = ln.trim(); if (!ln) return;
            const m = ln.match(/^(\S+?)(?:\s*[|,，\t]\s*|\s+)(.+)$/) || [null, ln, ""];
            if (!okUrl(m[1])) { bad++; return; }
            list.push({ url: m[1], caption: (m[2] || "").trim() || nameFrom(m[1]) }); n++;
        });
        save(); render(); if (n) $("stkBatch").value = "";
        msg.className = "api-status " + (n ? "ok" : "err"); msg.textContent = "已添加 " + n + " 个" + (bad ? "，" + bad + " 行链接无效已跳过" : "");
    });
    render();
})();

// ===== v1.2：AI 设置（主要设定 / 提示词 / 世界书）=====
(function () {
    const KEY = "myAiHomeProfileV1", $ = function (id) { return document.getElementById(id); };
    const DP = { memory: "请始终主动记住与用户对话中的重要信息（喜好、经历、情绪变化、约定和计划），之后自然地想起并运用，不要说“我记住了”之类的机械表述。",
        summary: "请结合前文上下文理解用户当前的话，必要时在心里总结前面的对话要点，保持话题连贯，不要答非所问。",
        role: "请始终以【角色设定】里的身份与用户对话，保持角色一致，不要自称 AI 模型或跳出角色；你的职责是陪伴、倾听并回应用户。",
        style: "用自然、口语化、温柔的文风聊天，每次说几句话，不要长篇大论；可以适当使用语气词和颜文字。",
        important: "请特别留意并牢记与用户相关的重要事物：生日、纪念日、家人朋友、重要计划、忌讳和偏好，合适的时候主动提起。", extra: "" };
    const DB = "以下是世界书，是角色所处世界的大背景。请读取并牢记其中内容，在合适的时候自然运用并举一反三（按设定推演合理的细节），不要生硬复述，也不要与设定矛盾。";
    let P = { main: {}, prompts: Object.assign({}, DP), book: { usage: DB, entries: [] } };
    try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); P.main = s.main || {}; P.prompts = Object.assign({}, DP, s.prompts); P.book = Object.assign({ usage: DB, entries: [] }, s.book); } catch (e) {}
    function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
    function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; }
    function fld(box, obj, key, label, o) {
        o = o || {}; const w = el("label", "api-field"); w.appendChild(el("span", "", label));
        const i = o.rows ? el("textarea") : el("input"); if (o.rows) i.rows = o.rows; if (o.ph) i.placeholder = o.ph;
        i.value = obj[key] || ""; i.addEventListener("input", function () { obj[key] = i.value; save(); }); w.appendChild(i); box.appendChild(w); return w;
    }
    function sw(box, obj, key, label, cb) {
        const w = el("label", "api-switch"), c = el("input"); c.type = "checkbox"; c.checked = !!obj[key];
        c.addEventListener("change", function () { obj[key] = c.checked; save(); if (cb) cb(); }); w.appendChild(c); w.appendChild(el("span", "", label)); box.appendChild(w);
    }
    function card(pane, title, desc) { const c = el("div", "api-card"); c.appendChild(el("h3", "", title)); if (desc) c.appendChild(el("p", "", desc)); pane.appendChild(c); return c; }

    window.buildSystemPrompt = function (userText) {
        const m = P.main, p = P.prompts, out = [], t = userText || "";
        const prof = [["姓名", m.name], ["人设描述", m.persona], ["身份经历", m.identity], ["与用户的关系", m.relation], ["背景", m.background], ["习惯", m.habits], ["爱好", m.hobbies], ["说话方式", m.speech]].filter(function (x) { return x[1] && x[1].trim(); });
        if (prof.length) out.push("【角色设定】\n" + prof.map(function (x) { return x[0] + "：" + x[1].trim(); }).join("\n"));
        const pr = [p.role, p.memory, p.summary, p.style, p.important, p.extra].filter(function (x) { return x && x.trim(); });
        if (pr.length) out.push("【行为要求】\n" + pr.join("\n"));
        const es = P.book.entries.filter(function (e) {
            if (!e.on || !(e.content || "").trim()) return false; if (e.always) return true;
            return (e.keys || "").split(/[,，、\s]+/).filter(Boolean).some(function (k) { return t.indexOf(k) >= 0; });
        });
        if (es.length) out.push("【世界书】\n" + P.book.usage + "\n" + es.map(function (e) { return "· " + (e.title || "条目") + "：" + e.content.trim(); }).join("\n"));
        const sp = window.getStickerPrompt ? window.getStickerPrompt() : ""; if (sp) out.push("【表情包】\n" + sp);
        return out.join("\n\n");
    };
    window.getAiProfile = function () { return P; };

    const body = $("settingsBody"), panes = {};
    ["main", "prompt", "book"].forEach(function (k) { panes[k] = el("div", "api-pane" + (k === "main" ? "" : " hidden")); body.appendChild(panes[k]); });
    let c = card(panes.main, "👤 基本信息", "AI 会把这些当作“自己是谁”。");
    fld(c, P.main, "name", "姓名", { ph: "AI 的名字" }); fld(c, P.main, "persona", "人设描述", { rows: 4, ph: "性格、外貌、气质……" });
    c = card(panes.main, "📜 身份与关系");
    fld(c, P.main, "identity", "身份经历", { rows: 4, ph: "职业、过去的经历……" }); fld(c, P.main, "relation", "与用户的关系", { rows: 3, ph: "朋友、恋人、家人、搭档……" });
    c = card(panes.main, "🏞️ 背景"); fld(c, P.main, "background", "背景", { rows: 4, ph: "成长环境、所处的时代与地点……" });
    c = card(panes.main, "🌸 其他", "让角色更鲜活。");
    fld(c, P.main, "habits", "习惯", { rows: 2 }); fld(c, P.main, "hobbies", "爱好", { rows: 2 }); fld(c, P.main, "speech", "说话方式", { rows: 2, ph: "口癖、语气、称呼用户的方式……" });

    c = card(panes.prompt, "🧠 记忆与上下文", "告诉 AI 如何记住和联系上下文。");
    fld(c, P.prompts, "memory", "记忆保存（时刻保存记忆）", { rows: 4 }); fld(c, P.prompts, "summary", "上下文总结", { rows: 4 });
    c = card(panes.prompt, "🎭 身份与文风"); fld(c, P.prompts, "role", "你是谁、应该做什么", { rows: 4 }); fld(c, P.prompts, "style", "对话文风", { rows: 4 });
    c = card(panes.prompt, "⭐ 重要事项"); fld(c, P.prompts, "important", "和用户相关的重要事物", { rows: 4 }); fld(c, P.prompts, "extra", "其他补充提示词", { rows: 3, ph: "还有什么想对 AI 说的……" });
    const rs = el("div", "api-actions"), rb = el("button", "alt", "恢复默认提示词"); rb.type = "button";
    rb.addEventListener("click", function () { if (confirm("把所有提示词恢复成默认内容？")) { P.prompts = Object.assign({}, DP); save(); panes.prompt.innerHTML = ""; location.reload(); } });
    rs.appendChild(rb); panes.prompt.appendChild(rs);

    c = card(panes.book, "🌍 世界书", "写下角色所在世界的大背景。AI 会读取并记住，在合适的时候使用并举一反三。“常驻”的条目每次都会带上，其余的在聊到关键词时才带上。");
    fld(c, P.book, "usage", "世界书使用说明（告诉 AI 怎么用）", { rows: 4 });
    const list = el("div"); panes.book.appendChild(list);
    function renderBook() {
        list.innerHTML = "";
        if (!P.book.entries.length) list.appendChild(el("p", "api-status", "还没有条目，点下面「新增条目」开始写世界观～"));
        P.book.entries.forEach(function (e) {
            const b = el("div", "wb-item"); fld(b, e, "title", "条目标题", { ph: "例如：魔法学院、小屋的由来" });
            const top = el("div", "wb-top"); b.appendChild(top);
            sw(top, e, "on", "启用"); const kw = fld(b, e, "keys", "触发关键词（逗号分隔，非常驻时使用）", { ph: "学院，魔法" });
            sw(top, e, "always", "常驻（每次都带上）", function () { kw.style.display = e.always ? "none" : ""; }); kw.style.display = e.always ? "none" : "";
            fld(b, e, "content", "内容", { rows: 5, ph: "详细设定……" });
            const a = el("div", "api-actions"), d = el("button", "danger", "删除条目"); d.type = "button";
            d.addEventListener("click", function () { if (confirm("删除这个条目？")) { P.book.entries = P.book.entries.filter(function (x) { return x !== e; }); save(); renderBook(); } });
            a.appendChild(d); b.appendChild(a); list.appendChild(b);
        });
    }
    const add = el("div", "api-actions"), ab = el("button", "", "＋ 新增条目"); ab.type = "button";
    ab.addEventListener("click", function () { P.book.entries.push({ title: "", on: true, always: true, keys: "", content: "" }); save(); renderBook(); });
    add.appendChild(ab); panes.book.appendChild(add); renderBook();

    c = card(body, "🔍 预览", "看看最终会发给 AI 的设定是什么样子。"); c.style.marginTop = "14px";
    const pv = el("div", "api-actions"), pb = el("button", "alt", "预览完整系统提示词"), out = el("div", "api-pre"); pb.type = "button"; out.style.display = "none";
    pb.addEventListener("click", function () { out.textContent = window.buildSystemPrompt("") || "（还没有填写任何设定）"; out.style.display = ""; });
    pv.appendChild(pb); c.appendChild(pv); c.appendChild(out);
    $("settingsTabs").addEventListener("click", function (e) {
        const bt = e.target.closest("button"); if (!bt) return;
        document.querySelectorAll("#settingsTabs button").forEach(function (x) { x.classList.toggle("on", x === bt); });
        Object.keys(panes).forEach(function (k) { panes[k].classList.toggle("hidden", k !== bt.dataset.tab); });
    });
})();


// ===== v1.3：记忆库 + 数据导入导出 =====
(function () {
    const MK = "myAiHomeMemoriesV1", AK = "myAiHomeAccountV1", PK = "myAiHomePixelHouseV05";
    const CATS = { chat: ["💬", "聊天"], cinema: ["🎬", "观影"], reading: ["📖", "阅读"], pixel: ["▦", "像素小屋"] };
    let mem = []; try { mem = JSON.parse(localStorage.getItem(MK) || "[]"); } catch (e) {}
    function save() { try { localStorage.setItem(MK, JSON.stringify(mem)); } catch (e) { console.warn("记忆保存失败（存储已满？）"); } window.dispatchEvent(new Event("memorychange")); }
    window.briefText = function (t) { t = String(t).replace(/\s+/g, " ").trim(); return t.length > 24 ? t.slice(0, 24) + "…" : t; };
    window.getMemories = function () { return mem; };
    window.addMemory = function (cat, text, force) {
        text = String(text || "").trim(); if (!CATS[cat] || !text) return null;
        const last = mem[mem.length - 1], now = Date.now();
        if (!force && mem.some(function (m) { return m.cat === cat && m.text === text && now - m.ts < 30000; })) return null;
        const m = { id: cat[0] + now.toString(36) + Math.random().toString(36).slice(2, 6), cat: cat, text: text, ts: now };
        mem.push(m); save(); return m;
    };
    window.onRoomChat = function (boxId, t) {
        if (boxId === "cinemaMessages") window.addMemory("cinema", (window.__cinemaName ? "看《" + window.__cinemaName + "》时聊到：" : "观影时聊到：") + window.briefText(t));
        else if (boxId === "readingMessages") window.addMemory("reading", (window.__bookName ? "读《" + window.__bookName + "》" + (window.__chapTitle ? "·" + window.__chapTitle.slice(0, 10) : "") + "时聊到：" : "阅读时聊到：") + window.briefText(t));
    };
    // 像素小屋：摸家具、点互动按钮都会留下一颗星
    document.addEventListener("click", function (e) {
        const f = e.target.closest && e.target.closest("#pixelRoom .pixel-furniture"), a = e.target.closest && e.target.closest(".pixel-action");
        if (f) window.addMemory("pixel", "在小屋里碰了碰" + (f.dataset.item || "家具"));
        else if (a) window.addMemory("pixel", "在像素小屋里" + a.textContent.replace(/^[^\u4e00-\u9fa5]+/, "").trim());
    }, true);

    // —— 数据与记忆页 ——
    const body = document.getElementById("memoryBody");
    function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.innerHTML = x; return e; }
    const get = function (k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
    const ITEMS = [["account", "👤 账号数据", function () { return get(AK) ? 1 : 0; }], ["chat", "💬 聊天记忆", 0], ["cinema", "🎬 观影室记忆", 0], ["reading", "📖 阅读室记忆", 0], ["pixel", "▦ 像素小屋记忆", 0]];
    const cnt = function (k) { return k === "account" ? (get(AK) ? 1 : 0) : mem.filter(function (m) { return m.cat === k; }).length; };
    function rows(box, prefix, counts) {
        const refs = {};
        ITEMS.forEach(function (it) {
            const r = el("label", "chk-row"), c = el("input"); c.type = "checkbox"; c.checked = true; refs[it[0]] = c;
            r.appendChild(c); r.appendChild(el("span", "", it[1])); r.appendChild(el("small", "", counts(it[0]) + (it[0] === "account" ? " 个" : " 条")));
            box.appendChild(r);
        });
        return refs;
    }
    function build() {
        body.innerHTML = "";
        const ex = el("div", "api-card"); ex.appendChild(el("h3", "", "📤 导出")); ex.appendChild(el("p", "", "勾选要导出的内容，会下载成一个 JSON 备份文件。账号数据只含资料，不含登录凭证。"));
        const er = rows(ex, "e", cnt);
        const ea = el("div", "api-actions", "<button type='button'>导出所选</button>"); ex.appendChild(ea); const es = el("div", "api-status"); ex.appendChild(es);
        ea.firstChild.addEventListener("click", function () {
            const data = {};
            if (er.account.checked) data.account = get(AK);
            ["chat", "cinema", "reading"].forEach(function (k) { if (er[k].checked) data[k] = mem.filter(function (m) { return m.cat === k; }); });
            if (er.pixel.checked) data.pixel = { memories: mem.filter(function (m) { return m.cat === "pixel"; }), house: get(PK) };
            if (!Object.keys(data).length) { es.className = "api-status err"; es.textContent = "请至少勾选一项"; return; }
            const blob = new Blob([JSON.stringify({ app: "my-ai-home", version: 1, exportedAt: new Date().toISOString(), data: data }, null, 1)], { type: "application/json" });
            const a = document.createElement("a"), d = new Date(); a.href = URL.createObjectURL(blob);
            a.download = "ai-home-backup-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + ".json";
            document.body.appendChild(a); a.click(); a.remove(); es.className = "api-status ok"; es.textContent = "✓ 已导出：" + Object.keys(data).join("、");
        });
        body.appendChild(ex);

        const im = el("div", "api-card"); im.appendChild(el("h3", "", "📥 导入")); im.appendChild(el("p", "", "选择之前导出的备份文件，再勾选要导入的内容。"));
        const pick = el("div", "api-actions", "<label class='room-btn' style='flex:1;text-align:center;padding:10px'>选择备份文件<input type='file' accept='.json,application/json' hidden></label>"); im.appendChild(pick);
        const box = el("div"), st = el("div", "api-status"); im.appendChild(box); im.appendChild(st);
        pick.querySelector("input").addEventListener("change", async function () {
            const f = this.files && this.files[0]; if (!f) return; this.value = ""; box.innerHTML = "";
            let d; try { d = JSON.parse(await f.text()); if (d.app !== "my-ai-home" || !d.data) throw 0; } catch (e) { st.className = "api-status err"; st.textContent = "这不是有效的小屋备份文件"; return; }
            const N = function (k) { const v = d.data[k]; return k === "account" ? (v ? 1 : 0) : k === "pixel" ? ((v && v.memories) || []).length : (v || []).length; };
            const has = ITEMS.filter(function (it) { return d.data[it[0]]; });
            if (!has.length) { st.className = "api-status err"; st.textContent = "备份里没有可导入的内容"; return; }
            const refs = {}; has.forEach(function (it) { const r = el("label", "chk-row"), c = el("input"); c.type = "checkbox"; c.checked = true; refs[it[0]] = c; r.appendChild(c); r.appendChild(el("span", "", it[1])); r.appendChild(el("small", "", N(it[0]) + (it[0] === "account" ? " 个" : " 条"))); box.appendChild(r); });
            const mode = el("div", "api-switch", "<span>导入方式：</span><label><input type='radio' name='impMode' value='merge' checked> 合并（保留现有）</label><label><input type='radio' name='impMode' value='replace'> 覆盖</label>"); box.appendChild(mode);
            const go = el("div", "api-actions", "<button type='button'>开始导入</button>"); box.appendChild(go);
            st.className = "api-status"; st.textContent = "备份时间：" + (d.exportedAt || "未知");
            go.firstChild.addEventListener("click", function () {
                const replace = box.querySelector("input[name=impMode]:checked").value === "replace", incoming = [];
                ["chat", "cinema", "reading"].forEach(function (k) { if (refs[k] && refs[k].checked) incoming.push([k, d.data[k] || []]); });
                if (refs.pixel && refs.pixel.checked) incoming.push(["pixel", (d.data.pixel && d.data.pixel.memories) || []]);
                incoming.forEach(function (p) {
                    const clean = p[1].filter(function (m) { return m && m.id && m.text; }).map(function (m) { return { id: String(m.id), cat: p[0], text: String(m.text), ts: +m.ts || Date.now() }; });
                    if (replace) mem = mem.filter(function (m) { return m.cat !== p[0]; });
                    const have = {}; mem.forEach(function (m) { have[m.id] = 1; }); clean.forEach(function (m) { if (!have[m.id]) mem.push(m); });
                });
                mem.sort(function (a, b) { return a.ts - b.ts; }); save();
                try {
                    if (refs.account && refs.account.checked && d.data.account) localStorage.setItem(AK, JSON.stringify(d.data.account));
                    if (refs.pixel && refs.pixel.checked && d.data.pixel && d.data.pixel.house && (replace || !localStorage.getItem(PK))) localStorage.setItem(PK, JSON.stringify(d.data.pixel.house));
                } catch (e) {}
                st.className = "api-status ok"; st.textContent = "✓ 导入完成，页面即将刷新以应用…"; setTimeout(function () { location.reload(); }, 900);
            });
        });
        body.appendChild(im);
        const tip = el("div", "api-card"); tip.appendChild(el("h3", "", "ℹ️ 说明")); tip.appendChild(el("p", "", "记忆保存在这台手机的浏览器里，清缓存或换设备会丢失，建议定期导出备份。记忆每增加一条，「记忆星空」里就会多一颗星。")); body.appendChild(tip);
    }
    window.addEventListener("roomopen", function (e) { if (e.detail === "memoryRoom") build(); });
    window.addEventListener("memorychange", function () { if (!document.getElementById("memoryRoom").classList.contains("hidden")) build(); });
})();

// ===== v1.3：记忆星空 =====
(function () {
    const $ = function (id) { return document.getElementById(id); };
    const room = $("starsRoom"), wrap = $("starsWrap"), cv = $("starsCanvas"), ctx = cv.getContext("2d"), info = $("starInfo"), hud = $("starsHud");
    const COL = { chat: "#ff9ccf", cinema: "#8ec5ff", reading: "#ffd98a", pixel: "#9cf0b8" }, NAME = { chat: "💬 聊天", cinema: "🎬 观影", reading: "📖 阅读", pixel: "▦ 像素小屋" };
    let stars = [], edges = [], V = { x: 0, y: 0, k: 1 }, W = 0, H = 0, dpr = 1, sel = null, run = false, bgs = [];
    function rnd(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    function build() {
        const list = window.getMemories().slice().sort(function (a, b) { return a.ts - b.ts; });
        stars = list.map(function (m, i) { const r = rnd(hash(m.id)), a = i * 2.399963 + (r() - .5) * .6, d = 46 * Math.sqrt(i + .6) * (.8 + .4 * r()); return { m: m, x: Math.cos(a) * d, y: Math.sin(a) * d, s: 1.4 + r() * 1.6, ph: r() * 6.28, sp: .001 + r() * .002 }; });
        edges = [];
        for (let i = 1; i < stars.length; i++) {
            const c = []; for (let j = Math.max(0, i - 150); j < i; j++) { const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y; c.push([dx * dx + dy * dy, j]); }
            c.sort(function (p, q) { return p[0] - q[0]; }); c.slice(0, 3).forEach(function (p) { edges.push([i, p[1]]); });
        }
        const n = { chat: 0, cinema: 0, reading: 0, pixel: 0 }; list.forEach(function (m) { n[m.cat]++; });
        hud.innerHTML = "已点亮 <b>" + stars.length + "</b> 颗星" + Object.keys(COL).map(function (k) { return "<i style='background:" + COL[k] + "'></i>" + NAME[k].slice(2) + " " + n[k]; }).join("");
    }
    function fit() {
        if (!stars.length) { V = { x: W / 2, y: H / 2, k: 1 }; return; }
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; stars.forEach(function (s) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); });
        const k = Math.min(1.8, Math.min(W / (x1 - x0 + 120), (H - 120) / (y1 - y0 + 120)));
        V = { k: k, x: W / 2 - (x0 + x1) / 2 * k, y: (H - 50) / 2 + 20 - (y0 + y1) / 2 * k };
    }
    function size() {
        dpr = window.devicePixelRatio || 1; W = wrap.clientWidth; H = wrap.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
        const r = rnd(7); bgs = []; for (let i = 0; i < 90; i++) bgs.push([r() * W, r() * H, r() * 1.2 + .3, r() * 6.28]);
    }
    function draw(t) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#080c26"); g.addColorStop(1, "#22174f"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        bgs.forEach(function (b) { ctx.globalAlpha = .35 + .3 * Math.sin(t * .0015 + b[3]); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, 6.283); ctx.fill(); });
        if (!stars.length) { ctx.globalAlpha = 1; ctx.fillStyle = "#b9c4ff"; ctx.textAlign = "center"; ctx.font = "14px sans-serif"; ctx.fillText("夜空还是空的～去聊聊天、看部电影、读本书吧", W / 2, H / 2); return; }
        const k = V.k, M = 40; ctx.globalAlpha = 1; ctx.lineWidth = 1; ctx.strokeStyle = "rgba(170,190,255,.22)"; ctx.beginPath();
        for (let e = 0; e < edges.length; e++) {
            const a = stars[edges[e][0]], b = stars[edges[e][1]], ax = a.x * k + V.x, ay = a.y * k + V.y, bx = b.x * k + V.x, by = b.y * k + V.y;
            if ((ax < -M && bx < -M) || (ax > W + M && bx > W + M) || (ay < -M && by < -M) || (ay > H + M && by > H + M)) continue;
            ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        }
        ctx.stroke();
        const glow = stars.length < 2500 || k > 0.5, zs = Math.min(2.2, Math.max(.7, Math.sqrt(k)));
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i], x = s.x * k + V.x, y = s.y * k + V.y; if (x < -M || x > W + M || y < -M || y > H + M) continue;
            const tw = .65 + .35 * Math.sin(t * s.sp + s.ph), r = s.s * zs, c = COL[s.m.cat];
            if (glow) { ctx.globalAlpha = tw * .22; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 6.283); ctx.fill(); }
            ctx.globalAlpha = tw; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
            if (s === sel) { ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, 6.283); ctx.stroke(); ctx.lineWidth = 1; }
        }
        ctx.globalAlpha = 1;
    }
    function loop(t) { if (room.classList.contains("hidden")) { run = false; return; } draw(t); requestAnimationFrame(loop); }
    function show(s) {
        sel = s; if (!s) { info.style.display = "none"; return; }
        info.style.display = "block"; const d = new Date(s.m.ts).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
        info.innerHTML = ""; const sm = document.createElement("small"); sm.textContent = NAME[s.m.cat] + " · " + d; info.appendChild(sm); info.appendChild(document.createTextNode(s.m.text));
    }
    function pick(px, py) {
        let best = null, bd = 24 * 24; stars.forEach(function (s) { const dx = s.x * V.k + V.x - px, dy = s.y * V.k + V.y - py, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = s; } }); show(best);
    }
    // 拖动 / 双指缩放 / 点按
    const P = new Map(); let moved = 0, pd = 0;
    cv.addEventListener("pointerdown", function (e) { cv.setPointerCapture(e.pointerId); P.set(e.pointerId, [e.offsetX, e.offsetY]); moved = 0; if (P.size === 2) { const a = [...P.values()]; pd = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); } });
    cv.addEventListener("pointermove", function (e) {
        if (!P.has(e.pointerId)) return; const o = P.get(e.pointerId), nx = e.offsetX, ny = e.offsetY;
        if (P.size === 1) { V.x += nx - o[0]; V.y += ny - o[1]; moved += Math.abs(nx - o[0]) + Math.abs(ny - o[1]); }
        else if (P.size === 2) {
            P.set(e.pointerId, [nx, ny]); const a = [...P.values()], d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), cx = (a[0][0] + a[1][0]) / 2, cy = (a[0][1] + a[1][1]) / 2;
            if (pd) zoom(d / pd, cx, cy); pd = d; moved += 10; return;
        }
        P.set(e.pointerId, [nx, ny]);
    });
    function up(e) { const was = P.size === 1; P.delete(e.pointerId); if (was && moved < 6) pick(e.offsetX, e.offsetY); pd = 0; }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", function (e) { P.delete(e.pointerId); });
    function zoom(f, cx, cy) { const nk = Math.max(.02, Math.min(8, V.k * f)), r = nk / V.k; V.x = cx - (cx - V.x) * r; V.y = cy - (cy - V.y) * r; V.k = nk; }
    cv.addEventListener("wheel", function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : .89, e.offsetX, e.offsetY); }, { passive: false });
    $("starsFit").addEventListener("click", function () { fit(); });
    $("starAdd").addEventListener("click", function () {
        const t = $("starText").value.trim(); if (!t) return; const m = window.addMemory($("starCat").value, t, true); $("starText").value = "";
        if (m) { const s = stars.filter(function (x) { return x.m === m; })[0]; if (s) { V.x = W / 2 - s.x * V.k; V.y = H / 2 - s.y * V.k; show(s); } }
    });
    window.addEventListener("memorychange", function () { if (!room.classList.contains("hidden")) { const keep = sel && sel.m; build(); sel = keep ? stars.filter(function (x) { return x.m === keep; })[0] || null : null; } });
    window.addEventListener("roomopen", function (e) { if (e.detail !== "starsRoom") return; size(); build(); fit(); show(null); if (!run) { run = true; requestAnimationFrame(loop); } });
    window.addEventListener("resize", function () { if (!room.classList.contains("hidden")) size(); });
})();

// ===== v1.3：账号登录（需要 Vercel 后端，见《后端部署说明》）=====
(function () {
    const SK = "myAiHomeSessionV1", AK = "myAiHomeAccountV1", $ = function (id) { return document.getElementById(id); };
    const body = $("accountBody"); let ticket = "", cd = 0, cdTimer = null, cfg = null;
    function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.innerHTML = x; return e; }
    function decode(tok) { try { const p = tok.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p), function (c) { return c.charCodeAt(0); }))); } catch (e) { return null; } }
    function session() { let t = null; try { t = localStorage.getItem(SK); } catch (e) {} const d = t && decode(t); return d && d.exp > Date.now() ? d : null; }
    function login(tok) {
        const d = decode(tok); if (!d) return false;
        try { localStorage.setItem(SK, tok); localStorage.setItem(AK, JSON.stringify({ sub: d.sub, name: d.name, email: d.email, avatar: d.avatar, provider: d.provider, loginAt: Date.now() })); } catch (e) {}
        window.dispatchEvent(new Event("memorychange")); return true;
    }
    async function api(path, opt) {
        let r; try { r = await fetch(path, opt); } catch (e) { throw new Error("连不上后端（这个页面需要部署到 Vercel 并加上 api 文件夹）"); }
        let j; try { j = await r.json(); } catch (e) { throw new Error("后端接口还没部署（请看《后端部署说明》）"); }
        if (!r.ok) throw new Error(j.error || "请求失败"); return j;
    }
    const post = function (p, o) { return api(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) }); };
    const rand = function () { return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); };
    async function getCfg() { if (!cfg) cfg = await api("/api/config"); return cfg; }
    function msg(box, ok, t) { box.className = "api-status " + (ok ? "ok" : "err"); box.textContent = t; }

    function render() {
        body.innerHTML = ""; const s = session();
        if (s) {
            const c = el("div", "api-card"), u = el("div", "acc-user");
            if (s.avatar) { const im = el("img"); im.src = s.avatar; im.alt = ""; u.appendChild(im); } else u.appendChild(el("div", "acc-ph", "🙂"));
            const tx = el("div"); tx.appendChild(el("strong")).textContent = s.name || "已登录"; tx.appendChild(el("span")).textContent = (s.provider || "") + (s.email ? " · " + s.email : ""); u.appendChild(tx);
            c.appendChild(u); const a = el("div", "api-actions", "<button type='button' class='danger'>退出登录</button>"); c.appendChild(a);
            a.firstChild.addEventListener("click", function () { try { localStorage.removeItem(SK); } catch (e) {} render(); });
            c.appendChild(el("p", "", "<br>登录后，你的资料会出现在「数据与记忆」的账号数据里，可以一起导出备份。"));
            body.appendChild(c); return;
        }
        const e1 = el("div", "api-card"); e1.appendChild(el("h3", "", "✉️ 邮箱验证码登录"));
        e1.appendChild(el("p", "", "QQ 邮箱、Gmail 或其他邮箱都可以收到验证码。"));
        e1.insertAdjacentHTML("beforeend", "<label class='api-field'><span>邮箱</span><input id='accMail' type='email' placeholder='yourname@qq.com' autocomplete='email'></label><label class='api-field'><span>验证码</span><input id='accCode' inputmode='numeric' maxlength='6' placeholder='6 位数字'></label><div class='api-actions'><button type='button' class='alt' id='accSend'>发送验证码</button><button type='button' id='accGo'>登录</button></div><div class='api-status' id='accMsg1'></div>");
        body.appendChild(e1);
        const g = el("div", "api-card"); g.appendChild(el("h3", "", "🐙 GitHub 登录")); g.insertAdjacentHTML("beforeend", "<button type='button' class='oauth-btn' id='accGh' style='background:#24292f'>使用 GitHub 登录</button><div class='api-status' id='accMsg2'></div>"); body.appendChild(g);
        const o = el("div", "api-card"); o.appendChild(el("h3", "", "🔵 Google 登录")); o.insertAdjacentHTML("beforeend", "<button type='button' class='oauth-btn' id='accGg' style='background:#4285f4'>使用 Google 账号登录</button><div class='api-status' id='accMsg3'></div>"); body.appendChild(o);
        const send = $("accSend"), m1 = $("accMsg1");
        function tick() { send.disabled = cd > 0; send.textContent = cd > 0 ? cd + " 秒后可重发" : "发送验证码"; }
        send.addEventListener("click", async function () {
            const em = $("accMail").value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return msg(m1, false, "请输入正确的邮箱");
            send.disabled = true; msg(m1, true, "发送中…");
            try { ticket = (await post("/api/send-code", { email: em })).ticket; msg(m1, true, "✓ 验证码已发送，请到邮箱查收（10 分钟内有效，也看看垃圾箱）"); cd = 60; clearInterval(cdTimer); cdTimer = setInterval(function () { cd--; tick(); if (cd <= 0) clearInterval(cdTimer); }, 1000); }
            catch (e) { msg(m1, false, e.message); }
            tick();
        });
        $("accGo").addEventListener("click", async function () {
            const em = $("accMail").value.trim(), code = $("accCode").value.trim(); if (!ticket) return msg(m1, false, "请先获取验证码"); if (!/^\d{6}$/.test(code)) return msg(m1, false, "请输入 6 位验证码");
            try { const r = await post("/api/verify-code", { email: em, code: code, ticket: ticket }); login(r.token); render(); } catch (e) { msg(m1, false, e.message); }
        });
        $("accGh").addEventListener("click", async function () {
            const m = $("accMsg2"); try {
                const c = await getCfg(); if (!c.githubClientId) throw new Error("服务器未配置 GITHUB_CLIENT_ID");
                const st = rand(); sessionStorage.setItem("oauthState", st);
                location.href = "https://github.com/login/oauth/authorize?client_id=" + encodeURIComponent(c.githubClientId) + "&scope=" + encodeURIComponent("read:user user:email") + "&state=" + st + "&redirect_uri=" + encodeURIComponent(location.origin + "/api/github-callback");
            } catch (e) { msg(m, false, e.message); }
        });
        $("accGg").addEventListener("click", async function () {
            const m = $("accMsg3"); try {
                const c = await getCfg(); if (!c.googleClientId) throw new Error("服务器未配置 GOOGLE_CLIENT_ID");
                const n = rand(); sessionStorage.setItem("googleNonce", n);
                location.href = "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + encodeURIComponent(c.googleClientId) + "&redirect_uri=" + encodeURIComponent(location.origin + "/") + "&response_type=id_token&scope=" + encodeURIComponent("openid email profile") + "&nonce=" + n + "&prompt=select_account";
            } catch (e) { msg(m, false, e.message); }
        });
        tick();
    }
    window.addEventListener("roomopen", function (e) { if (e.detail === "accountRoom") render(); });

    // 从 GitHub / Google 跳回来时，处理地址栏里的结果
    (async function () {
        const hs = new URLSearchParams(location.hash.slice(1)); if (!location.hash) return;
        const clear = function () { history.replaceState(null, "", location.pathname + location.search); };
        try {
            if (hs.get("login")) { const ok = hs.get("state") === sessionStorage.getItem("oauthState"); sessionStorage.removeItem("oauthState"); clear(); if (!ok) throw new Error("登录状态校验失败，请重试"); login(hs.get("login")); alert("登录成功 ✓"); }
            else if (hs.get("login_error")) { const m = hs.get("login_error"); clear(); alert("登录失败：" + m); }
            else if (hs.get("id_token")) { const n = sessionStorage.getItem("googleNonce"), idt = hs.get("id_token"); sessionStorage.removeItem("googleNonce"); clear(); login((await post("/api/google-login", { id_token: idt, nonce: n })).token); alert("登录成功 ✓"); }
        } catch (e) { alert("登录失败：" + e.message); }
    })();
})();


// ===== v0.5：小红书 + 关于小屋 =====
(function () {
    const $ = function (id) { return document.getElementById(id); };
    const room = $("xiaohongshuRoom");
    if (!room) return;

    const SK = "myAiHomeXhsV1";
    let xhsState = { connected: false, name: "", avatar: "" };

    function readState() {
        try { Object.assign(xhsState, JSON.parse(localStorage.getItem(SK) || "{}")); } catch (e) {}
    }
    function saveState() {
        try { localStorage.setItem(SK, JSON.stringify(xhsState)); } catch (e) {}
    }
    function status(text, ok) {
        const box = $("xhsStatus"); if (!box) return;
        box.className = "xhs-status " + (ok ? "ok" : "err");
        box.textContent = text || "";
    }
    function importStatus(text, ok) {
        const box = $("xhsImportStatus"); if (!box) return;
        box.className = "xhs-status " + (ok ? "ok" : "err");
        box.textContent = text || "";
    }
    function renderConnection() {
        const badge = $("xhsConnectionBadge"), text = $("xhsConnectionText"), dot = $("xhsConnectionDot"), btn = $("xhsConnectBtn");
        if (!badge || !text || !dot || !btn) return;
        const connected = !!xhsState.connected;
        badge.textContent = connected ? "已连接" : "未连接";
        badge.classList.toggle("connected", connected);
        text.textContent = connected ? ("已连接" + (xhsState.name ? " · " + xhsState.name : "")) : "还没有连接小红书账号";
        dot.classList.toggle("on", connected);
        btn.textContent = connected ? "重新连接" : "连接小红书";
    }

    async function api(path) {
        const r = await fetch(path, { headers: { "Accept": "application/json" } });
        let j = {};
        try { j = await r.json(); } catch (e) {}
        if (!r.ok) throw new Error(j.error || "请求失败");
        return j;
    }

    async function connect() {
        status("正在检查小红书开放平台配置…", true);
        try {
            const cfg = await api("/api/xhs-config");
            if (!cfg.enabled || !cfg.authorizeUrl) {
                status("小红书页面已经准备好，但服务器还没有配置正式授权地址。请在 Vercel 环境变量中完成 XHS_* 配置后再扫码登录。", false);
                return;
            }
            const state = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
            sessionStorage.setItem("xhsOAuthState", state);
            const url = cfg.authorizeUrl.replace(/\{STATE\}/g, encodeURIComponent(state));
            location.href = url;
        } catch (e) {
            status("后端还没有部署小红书配置接口，当前可以先使用下面的“导入一篇笔记”功能测试完整体验。", false);
        }
    }

    function savedNotes() {
        try { return JSON.parse(localStorage.getItem("myAiHomeXhsNotesV1") || "[]"); } catch (e) { return []; }
    }
    function saveNotes(list) {
        try { localStorage.setItem("myAiHomeXhsNotesV1", JSON.stringify(list.slice(0, 30))); } catch (e) {}
    }
    function loadNote(n) {
        $("xhsNoteTitle").value = n.title || "";
        $("xhsNoteUrl").value = n.url || "";
        $("xhsNoteText").value = n.text || "";
        importStatus("已载入收藏，可以继续编辑或发送给 AI。", true);
    }
    function renderSaved() {
        const box = $("xhsSavedList"); if (!box) return;
        const list = savedNotes();
        box.innerHTML = "";
        if (!list.length) {
            box.innerHTML = "<div class='xhs-empty'>还没有收藏。把一篇笔记放进来吧 ♡</div>";
            return;
        }
        list.forEach(function (n, i) {
            const item = document.createElement("button");
            item.type = "button"; item.className = "xhs-saved-item";
            const title = document.createElement("strong"); title.textContent = n.title || "未命名笔记";
            const meta = document.createElement("span"); meta.textContent = n.url || "来自手动导入";
            const del = document.createElement("i"); del.textContent = "×";
            item.appendChild(title); item.appendChild(meta); item.appendChild(del);
            item.addEventListener("click", function (e) {
                if (e.target === del) {
                    const next = savedNotes(); next.splice(i, 1); saveNotes(next); renderSaved(); return;
                }
                loadNote(n);
            });
            box.appendChild(item);
        });
    }

    function getDraft() {
        return {
            title: $("xhsNoteTitle").value.trim(),
            url: $("xhsNoteUrl").value.trim(),
            text: $("xhsNoteText").value.trim()
        };
    }

    function saveDraft() {
        const n = getDraft();
        if (!n.text && !n.url) return importStatus("先粘贴一点笔记内容或链接吧。", false);
        const list = savedNotes().filter(function (x) { return !(x.url && n.url && x.url === n.url); });
        list.unshift(Object.assign(n, { ts: Date.now() }));
        saveNotes(list);
        renderSaved();
        if (window.addMemory) window.addMemory("chat", "收藏小红书笔记：《" + (n.title || "未命名笔记") + "》");
        importStatus("✓ 已收藏到小屋（保存在当前设备）。", true);
    }

    async function askAI() {
        const n = getDraft();
        if (!n.text && !n.url) return importStatus("先粘贴笔记内容，AI 才能帮你分析哦。", false);
        const card = $("xhsAiCard"), result = $("xhsAiResult");
        card.classList.remove("hidden");
        result.textContent = "小屋 AI 正在读这篇笔记……";
        $("xhsAiSource").textContent = n.title ? "《" + n.title + "》" : (n.url || "手动导入的笔记");
        card.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
            const prompt = [
                "请帮我分析下面这篇小红书笔记。",
                n.title ? "标题：《" + n.title + "》" : "",
                n.url ? "链接：" + n.url : "",
                "正文：",
                n.text || "（用户只提供了链接，请先根据已有信息告诉我你能做什么，不要假装已经读取链接内容。）",
                "",
                "请用自然、简洁的方式回答：先说这篇内容的核心，再指出值得注意的地方，最后给用户 2-3 个可以继续追问的问题。"
            ].filter(Boolean).join("\n");
            const reply = await requestRealAI(prompt, function (delta) {
                if (result.textContent === "小屋 AI 正在读这篇笔记……") result.textContent = "";
                result.textContent += delta;
            });
            if (!result.textContent.trim()) result.textContent = reply;
            if (window.addMemory) window.addMemory("chat", "AI 分析了小红书笔记：《" + (n.title || "未命名笔记") + "》");
        } catch (e) {
            result.textContent = "这次没有连上主 API：" + (e && e.message || e) + "\n\n你可以先去「API 管理 → 主 API」检查配置。";
        }
    }

    $("xhsConnectBtn").addEventListener("click", connect);
    $("xhsRefreshBtn").addEventListener("click", function () {
        readState(); renderConnection(); status(xhsState.connected ? "✓ 当前设备记录为已连接。" : "当前设备还没有连接记录。", true);
    });
    $("xhsSaveBtn").addEventListener("click", saveDraft);
    $("xhsAskBtn").addEventListener("click", askAI);
    $("xhsClearBtn").addEventListener("click", function () {
        if (!savedNotes().length) return;
        if (!confirm("确定清空小屋里的小红书收藏吗？")) return;
        saveNotes([]); renderSaved(); importStatus("收藏已清空。", true);
    });

    readState(); renderConnection(); renderSaved();
    window.addEventListener("roomopen", function (e) {
        if (e.detail === "xiaohongshuRoom") { readState(); renderConnection(); renderSaved(); }
    });

    // 从授权回跳的最小状态处理：真正换 token 仍由服务端完成。
    (function handleReturn() {
        const q = new URLSearchParams(location.search);
        const code = q.get("xhs_code") || q.get("code");
        const state = q.get("xhs_state") || q.get("state");
        if (!code || !state) return;
        const expected = sessionStorage.getItem("xhsOAuthState");
        if (expected && expected === state) {
            sessionStorage.removeItem("xhsOAuthState");
            xhsState.connected = true;
            xhsState.name = "小红书账号";
            saveState();
            history.replaceState(null, "", location.pathname);
            renderConnection();
            status("✓ 已收到小红书授权回调。若服务端已完成换 token，这里会保持连接状态。", true);
        }
    })();
})();

// ===== 启动时一定停在聊天页 =====
showChatPage();
menuItems.forEach(function (it) { it.classList.toggle("active", it.dataset.page === "chat"); });
