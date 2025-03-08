document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeyTypeSelect = document.getElementById('apiKeyType');
  const saveConfigButton = document.getElementById('saveConfig');
  const queryUsageButton = document.getElementById('queryUsage');
  const resultDiv = document.getElementById('result');
  const usedCharsSpan = document.getElementById('usedChars');
  const totalCharsSpan = document.getElementById('totalChars');
  const apiTypeSpan = document.getElementById('apiType');
  const progressBar = document.getElementById('progressBar');
  const remainingDiv = document.getElementById('remaining');
  
  // 错误提示相关元素
  const errorOverlay = document.getElementById('errorOverlay');
  const errorMessage = document.getElementById('errorMessage');
  const errorCloseBtn = document.getElementById('errorCloseBtn');

  // 加载保存的配置
  loadConfig();
  
  // 错误提示关闭按钮事件
  errorCloseBtn.addEventListener('click', function() {
    errorOverlay.style.display = 'none';
  });

  // 保存配置按钮点击事件
  saveConfigButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const apiKeyType = apiKeyTypeSelect.value;

    if (!apiKey) {
      showErrorDialog('请输入 API 密钥!');
      return;
    }

    // 保存配置到浏览器存储
    chrome.storage.sync.set({
      deeplApiKey: apiKey,
      deeplApiKeyType: apiKeyType
    }, function() {
      // 使用自定义对话框替代alert
      showSuccessDialog('API 配置已保存!');
    });
  });

  // 查询余量按钮点击事件
  queryUsageButton.addEventListener('click', function() {
    // 直接使用输入框中的值进行查询，而不是从存储中获取
    const apiKey = apiKeyInput.value.trim();
    const apiKeyType = apiKeyTypeSelect.value;

    if (!apiKey) {
      showErrorDialog('请输入 API 密钥!');
      return;
    }

    checkDeeplUsage(apiKey, apiKeyType);
  });

  // 加载保存的配置
  function loadConfig() {
    chrome.storage.sync.get(['deeplApiKey', 'deeplApiKeyType'], function(data) {
      if (data.deeplApiKey) {
        apiKeyInput.value = data.deeplApiKey;
      }
      if (data.deeplApiKeyType) {
        apiKeyTypeSelect.value = data.deeplApiKeyType;
      }
    });
  }

  // 检查DeepL API使用情况
  function checkDeeplUsage(apiKey, apiKeyType) {
    // 设置加载状态
    resultDiv.style.display = 'none';
    queryUsageButton.disabled = true;
    queryUsageButton.textContent = '查询中...';

    // 通过background script发送请求，避免CORS问题
    chrome.runtime.sendMessage({
      action: 'checkDeeplUsage',
      apiKey: apiKey,
      apiKeyType: apiKeyType
    }, response => {
      // 恢复按钮状态
      queryUsageButton.disabled = false;
      queryUsageButton.textContent = '查询余量';
      
      if (response && response.success) {
        // 显示结果
        displayResult(response.data, response.apiKeyType);
      } else if (response) {
        // 显示自定义错误提示
        showErrorDialog(response.error);
      } else {
        // 处理无响应的情况
        showErrorDialog('无法连接到扩展程序后台。请重新加载扩展或重启浏览器。');
      }
    });
  }

  // 显示错误提示对话框
  function showErrorDialog(message) {
    // 设置错误信息
    let errorText = message;
    
    // 根据错误类型提供更具体的提示
    if (message.includes('Failed to fetch')) {
      errorText = '网络请求失败，无法连接到 DeepL API 服务器。请检查您的网络连接并稍后重试。';
    } else if (message.includes('403')) {
      errorText = 'API 密钥无效或权限不足。请检查您的 API 密钥是否正确，以及是否选择了正确的 API 类型（Free/Pro）。';
    } else if (message.includes('401')) {
      errorText = '身份验证失败。请检查您的 API 密钥是否正确。';
    } else if (message.includes('429')) {
      errorText = '请求过于频繁，已超出 API 限制。请稍后再试。';
    }
    
    errorMessage.textContent = errorText;
    errorOverlay.style.display = 'flex';
  }
  
  // 显示成功提示对话框
  function showSuccessDialog(message) {
    errorMessage.textContent = message;
    errorOverlay.style.display = 'flex';
  }
  
  // 显示结果
  function displayResult(data, apiKeyType) {
    // 计算使用百分比
    const usagePercent = (data.character_count / data.character_limit * 100).toFixed(2);
    
    // 字符数格式化
    const usedChars = data.character_count.toLocaleString();
    const totalChars = data.character_limit.toLocaleString();
    const remainingChars = (data.character_limit - data.character_count).toLocaleString();
    
    // 更新UI
    usedCharsSpan.textContent = usedChars;
    totalCharsSpan.textContent = totalChars;
    apiTypeSpan.textContent = apiKeyType.toUpperCase();
    
    // 设置进度条
    progressBar.style.width = usagePercent + '%';
    progressBar.textContent = usagePercent + '%';
    
    // 根据使用百分比设置进度条颜色
    if (usagePercent > 90) {
      progressBar.style.backgroundColor = '#e74c3c'; // 红色
    } else if (usagePercent > 70) {
      progressBar.style.backgroundColor = '#f39c12'; // 橙色
    } else {
      progressBar.style.backgroundColor = '#27ae60'; // 绿色
    }
    
    // 更新余量信息
    const remainingPercent = (100 - usagePercent).toFixed(2);
    remainingDiv.innerHTML = `余量: <b>${remainingPercent}%</b> (${remainingChars} 字符)`;
    
    // 显示结果区域
    resultDiv.style.display = 'block';
  }
});
