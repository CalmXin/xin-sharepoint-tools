// --- DOM Elements ---
const clientIdInput = document.getElementById('clientId');
const clientSecretInput = document.getElementById('clientSecret');
const cloudEnvSelect = document.getElementById('cloudEnv');
const redirectUriInput = document.getElementById('redirectUri');
const copyRedirectUriBtn = document.getElementById('copyRedirectUriBtn');
const getAuthCodeBtn = document.getElementById('getAuthCodeBtn');
const resultContainer = document.getElementById('result-container');
const resultContent = document.getElementById('result-content');
const spinner = document.getElementById('spinner');

const siteIdFinder = document.getElementById('site-id-finder');
const sharepointUrlInput = document.getElementById('sharepointUrl');
const getSiteIdBtn = document.getElementById('getSiteIdBtn');
const siteIdResultContainer = document.getElementById('site-id-result-container');
const siteIdSpinner = document.getElementById('site-id-spinner');
const siteIdResultContent = document.getElementById('site-id-result-content');

// --- App State ---
let appState = {
    accessToken: null,
    cloudEnv: null
};

const authEndpoints = {
    global: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    china: 'https://login.chinacloudapi.cn/common/oauth2/v2.0/authorize',
};

// --- Utility Functions ---
function copyToClipboard(text, button) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    const originalText = button.textContent;
    button.textContent = '已复制!';
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
}

function showResult(title, content, isError = false) {
    spinner.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    const titleColor = isError ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400';
    let formattedContent = `${content}`;
    if (isError) {
        try {
            const errorJson = JSON.parse(content);
            formattedContent = `<pre class="p-4 bg-gray-100 dark:bg-gray-900 rounded-md break-all font-mono text-sm">${JSON.stringify(errorJson, null, 2)}</pre>`;
        } catch (e) {
            formattedContent = `<div class="p-4 bg-gray-100 dark:bg-gray-900 rounded-md break-all font-mono text-sm">${content}</div>`;
        }
    }
    resultContent.innerHTML = `<h4 class="font-bold text-lg mb-2 ${titleColor}">${title}</h4>${formattedContent}`;
}

function showSiteIdResult(title, content, isError = false) {
    siteIdSpinner.classList.add('hidden');
    siteIdResultContainer.classList.remove('hidden');
    const titleColor = isError ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400';
    let formattedContent = content;
    if (isError) {
        try {
            const errorJson = JSON.parse(content);
            formattedContent = `<pre class="p-4 bg-gray-100 dark:bg-gray-900 rounded-md break-all font-mono text-sm">${JSON.stringify(errorJson, null, 2)}</pre>`;
        } catch (e) {
            formattedContent = `<div class="p-4 bg-gray-100 dark:bg-gray-900 rounded-md break-all font-mono text-sm">${content}</div>`;
        }
    }
    siteIdResultContent.innerHTML = `<h4 class="font-bold text-lg mb-2 ${titleColor}">${title}</h4>${formattedContent}`;
}

// --- Core Logic ---
function handleStartAuth() {
    const clientId = clientIdInput.value;
    const clientSecret = clientSecretInput.value;

    if (!clientId || !clientSecret) {
        alert('请输入应用 ID 和客户端密码');
        return;
    }

    localStorage.setItem('ms_graph_tool_config', JSON.stringify({
        clientId: clientId,
        clientSecret: clientSecret,
        cloudEnv: cloudEnvSelect.value,
        sharepointUrl: sharepointUrlInput.value
    }));

    const scope = 'offline_access Files.ReadWrite.All Sites.Read.All';
    const redirectUri = window.location.origin + window.location.pathname;
    window.location.href = `${authEndpoints[cloudEnvSelect.value]}?client_id=${clientId}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}`;
}

async function handleGetToken(code) {
    const config = JSON.parse(localStorage.getItem('ms_graph_tool_config') || '{}');
    if (!config.clientId || !config.clientSecret) {
        showResult('错误', '找不到本地存储的ID和密钥，请重新填写。', true);
        return;
    }
    spinner.classList.remove('hidden');
    resultContainer.classList.remove('hidden');
    resultContent.innerHTML = '';

    try {
        const response = await fetch('/api/token', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                code: code,
                redirect_uri: window.location.origin + window.location.pathname,
                cloud_env: config.cloudEnv,
                client_id: config.clientId,
                client_secret: config.clientSecret
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(data));
        }

        appState.accessToken = data.access_token;
        appState.cloudEnv = config.cloudEnv;

        const resultHtml = `
                      <div class="space-y-4">
                          <div class="result-wrapper"><p class="font-semibold text-gray-700 dark:text-gray-300">刷新令牌 (Refresh Token):</p><div class="relative"><p class="text-sm p-3 bg-gray-100 dark:bg-gray-700 rounded break-all" id="refreshTokenText">${data.refresh_token}</p><button class="copy-btn" onclick="copyToClipboard(document.getElementById('refreshTokenText').textContent, this)">复制</button></div></div>
                          <div class="result-wrapper"><p class="font-semibold text-gray-700 dark:text-gray-300">访问令牌 (Access Token):</p><div class="relative"><p class="text-sm p-3 bg-gray-100 dark:bg-gray-700 rounded break-all" id="accessTokenText">${data.access_token}</p><button class="copy-btn" onclick="copyToClipboard(document.getElementById('accessTokenText').textContent, this)">复制</button></div></div>
                      </div>`;
        showResult('令牌获取成功！', resultHtml);

        siteIdFinder.classList.remove('hidden');

    } catch (error) {
        showResult('获取令牌失败', error.message, true);
    }
}

async function handleGetSiteId() {
    const fullUrl = sharepointUrlInput.value;
    if (!fullUrl) {
        alert('请输入 SharePoint 网站 URL');
        return;
    }
    if (!appState.accessToken) {
        alert('访问令牌不可用。请先完成步骤1。');
        return;
    }

    let hostname, sitePath;
    try {
        const urlObject = new URL(fullUrl);
        hostname = urlObject.hostname;
        sitePath = urlObject.pathname;
    } catch (e) {
        alert('输入的 SharePoint URL 格式无效。');
        return;
    }

    const config = JSON.parse(localStorage.getItem('ms_graph_tool_config') || '{}');
    config.sharepointUrl = fullUrl;
    localStorage.setItem('ms_graph_tool_config', JSON.stringify(config));

    siteIdSpinner.classList.remove('hidden');
    siteIdResultContainer.classList.remove('hidden');
    siteIdResultContent.innerHTML = '';

    try {
        const response = await fetch('/api/site-id', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                accessToken: appState.accessToken,
                cloudEnv: appState.cloudEnv,
                hostname: hostname,
                sitePath: sitePath
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(data));
        }

        const siteId = data.id;
        const resultHtml = `
                    <div class="result-wrapper">
                      <p class="font-semibold text-gray-700 dark:text-gray-300">网站信息:</p>
                      <div class="relative text-sm p-3 bg-gray-100 dark:bg-gray-700 rounded break-all" id="siteIdText">
                        <p><strong>ID:</strong> ${siteId}</p>
                        <p><strong>名称:</strong> ${data.displayName}</p>
                        <p><strong>URL:</strong> <a href="${data.webUrl}" target="_blank" class="text-blue-500 hover:underline">${data.webUrl}</a></p>
                        <button class="copy-btn" style="top: 1rem; transform: none;" onclick="copyToClipboard('${siteId}', this)">复制ID</button>
                      </div>
                    </div>
                `;

        showSiteIdResult('Site ID 获取成功!', resultHtml);

    } catch (error) {
        showSiteIdResult('获取 Site ID 失败', error.message, true);
    }
}

// --- Event Listeners & Page Load ---
window.onload = async () => {
    const savedConfig = JSON.parse(localStorage.getItem('ms_graph_tool_config') || '{}');
    if (savedConfig.clientId) clientIdInput.value = savedConfig.clientId;
    if (savedConfig.clientSecret) clientSecretInput.value = savedConfig.clientSecret;
    if (savedConfig.cloudEnv) cloudEnvSelect.value = savedConfig.cloudEnv;
    if (savedConfig.sharepointUrl) sharepointUrlInput.value = savedConfig.sharepointUrl;

    redirectUriInput.value = window.location.origin + window.location.pathname;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        await handleGetToken(code);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    getAuthCodeBtn.addEventListener('click', handleStartAuth);
    getSiteIdBtn.addEventListener('click', handleGetSiteId);
    copyRedirectUriBtn.addEventListener('click', (e) => {
        e.preventDefault();
        copyToClipboard(redirectUriInput.value, e.target);
    });
};