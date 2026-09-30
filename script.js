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
            menuPlaceholder.classList.remove("show");
        } else {
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

