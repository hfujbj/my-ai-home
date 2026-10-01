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

                                                                const avatar = document.createElement("div");
                                                                avatar.className = "avatar";
                                                                avatar.textContent = "♡";

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
bindImageInput(userAvatarFrameInput, "userFrame");
bindImageInput(aiAvatarFrameInput, "aiFrame");

renderAvatarEditorPreviews();
applyAvatarSettingsToChat();
