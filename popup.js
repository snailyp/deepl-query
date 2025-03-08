document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeyTypeSelect = document.getElementById('apiKeyType');
  const keyNameInput = document.getElementById('keyName');
  const saveConfigButton = document.getElementById('saveConfig');
  const queryUsageButton = document.getElementById('queryUsage');
  const resultDiv = document.getElementById('result');
  const usedCharsSpan = document.getElementById('usedChars');
  const totalCharsSpan = document.getElementById('totalChars');
  const apiTypeSpan = document.getElementById('apiType');
  const progressBar = document.getElementById('progressBar');
  const remainingDiv = document.getElementById('remaining');
  const savedKeysList = document.getElementById('savedKeysList');
  const paginationContainer = document.getElementById('paginationContainer');
  
  // 分页相关变量
  let currentPage = 1;
  const keysPerPage = 5;
  let totalPages = 1;
  let allKeys = [];
  
  // 错误提示相关元素
  const errorOverlay = document.getElementById('errorOverlay');
  const errorMessage = document.getElementById('errorMessage');
  const errorCloseBtn = document.getElementById('errorCloseBtn');

  // 加载保存的配置和密钥列表
  loadConfig();
  loadSavedKeys();
  
  // 错误提示关闭按钮事件
  errorCloseBtn.addEventListener('click', function() {
    errorOverlay.style.display = 'none';
  });

  // 保存配置按钮点击事件
  saveConfigButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const apiKeyType = apiKeyTypeSelect.value;
    let keyName = keyNameInput.value.trim();

    if (!apiKey) {
      showErrorDialog('请输入 API 密钥!');
      return;
    }

    // 如果没有提供名称，使用默认名称
    if (!keyName) {
      keyName = apiKeyType.toUpperCase() + ' 密钥 ' + new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // 保存当前配置到浏览器存储
    chrome.storage.sync.set({
      deeplApiKey: apiKey,
      deeplApiKeyType: apiKeyType
    });

    // 保存到密钥列表
    saveKeyToList(keyName, apiKey, apiKeyType);
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

  // 加载保存的密钥列表
  function loadSavedKeys() {
    chrome.storage.sync.get('deeplSavedKeys', function(data) {
      if (data.deeplSavedKeys && data.deeplSavedKeys.length > 0) {
        allKeys = data.deeplSavedKeys;
        totalPages = Math.ceil(allKeys.length / keysPerPage);
        renderKeysList(allKeys);
        renderPagination();
      } else {
        // 显示无密钥提示
        savedKeysList.innerHTML = '<div class="no-keys">暂无保存的密钥</div>';
        paginationContainer.innerHTML = '';
      }
    });
  }
  
  // 渲染分页控件
  function renderPagination() {
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    let paginationHtml = '<div class="pagination">';
    
    // 上一页按钮
    paginationHtml += `<button class="page-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>`;
    
    // 页码
    paginationHtml += `<span class="page-info">${currentPage}/${totalPages}</span>`;
    
    // 下一页按钮
    paginationHtml += `<button class="page-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>`;
    
    paginationHtml += '</div>';
    
    paginationContainer.innerHTML = paginationHtml;
    
    // 添加分页按钮事件
    const prevBtn = paginationContainer.querySelector('.prev-btn');
    const nextBtn = paginationContainer.querySelector('.next-btn');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        if (currentPage > 1) {
          currentPage--;
          renderKeysList(allKeys);
          renderPagination();
        }
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
          currentPage++;
          renderKeysList(allKeys);
          renderPagination();
        }
      });
    }
  }

  // 保存密钥到列表
  function saveKeyToList(name, key, type) {
    chrome.storage.sync.get('deeplSavedKeys', function(data) {
      let savedKeys = data.deeplSavedKeys || [];
      
      // 检查是否已存在相同的密钥
      const existingKeyIndex = savedKeys.findIndex(k => k.key === key);
      
      if (existingKeyIndex !== -1) {
        // 更新现有密钥
        savedKeys[existingKeyIndex] = { name, key, type };
        showSuccessDialog('密钥已更新!');
      } else {
        // 添加新密钥
        savedKeys.push({ name, key, type });
        showSuccessDialog('密钥已保存!');
      }
      
      // 更新全局变量
      allKeys = savedKeys;
      totalPages = Math.ceil(allKeys.length / keysPerPage);
      
      // 保存更新后的列表
      chrome.storage.sync.set({ deeplSavedKeys: savedKeys }, function() {
        // 重新渲染密钥列表和分页
        renderKeysList(allKeys);
        renderPagination();
        // 清空名称输入框
        keyNameInput.value = '';
      });
    });
  }

  // 渲染密钥列表
  function renderKeysList(keys) {
    if (!keys || keys.length === 0) {
      savedKeysList.innerHTML = '<div class="no-keys">暂无保存的密钥</div>';
      paginationContainer.innerHTML = '';
      return;
    }
    
    // 计算当前页的密钥
    const startIndex = (currentPage - 1) * keysPerPage;
    const endIndex = Math.min(startIndex + keysPerPage, keys.length);
    const currentPageKeys = keys.slice(startIndex, endIndex);

    let html = '';
    currentPageKeys.forEach((keyItem, i) => {
      const index = startIndex + i;
      // 将密钥隐藏为星号
      const maskedKey = '*'.repeat(Math.min(10, keyItem.key.length)) + 
                        (keyItem.key.length > 10 ? keyItem.key.substring(keyItem.key.length - 4) : '');
      
      html += `
        <div class="key-item" data-index="${index}">
          <div class="key-info">
            <div class="key-name">${keyItem.name}</div>
            <div class="key-type">${keyItem.type.toUpperCase()}</div>
            <div class="key-value">${maskedKey}</div>
          </div>
          <div class="key-actions">
            <button class="btn-toggle-visibility" data-visible="false">显示</button>
            <button class="btn-use">使用</button>
            <button class="btn-delete">删除</button>
          </div>
        </div>
      `;
    });

    savedKeysList.innerHTML = html;

    // 添加按钮的事件监听
    document.querySelectorAll('.btn-use').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.closest('.key-item').dataset.index);
        useKey(index);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
      button.addEventListener('click', function() {
        const index = parseInt(this.closest('.key-item').dataset.index);
        deleteKey(index);
      });
    });
    
    // 添加显示/隐藏密钥按钮事件
    document.querySelectorAll('.btn-toggle-visibility').forEach(button => {
      button.addEventListener('click', function() {
        const keyItem = this.closest('.key-item');
        const index = parseInt(keyItem.dataset.index);
        const keyValueElement = keyItem.querySelector('.key-value');
        const isVisible = this.getAttribute('data-visible') === 'true';
        
        if (isVisible) {
          // 隐藏密钥
          const key = allKeys[index].key;
          const maskedKey = '*'.repeat(Math.min(10, key.length)) + 
                           (key.length > 10 ? key.substring(key.length - 4) : '');
          keyValueElement.textContent = maskedKey;
          this.textContent = '显示';
          this.setAttribute('data-visible', 'false');
        } else {
          // 显示密钥
          keyValueElement.textContent = allKeys[index].key;
          this.textContent = '隐藏';
          this.setAttribute('data-visible', 'true');
        }
      });
    });
  }

  // 使用保存的密钥
  function useKey(index) {
    // 直接从全局变量获取密钥信息
    if (allKeys && allKeys[index]) {
      const keyItem = allKeys[index];
      
      // 填充表单
      apiKeyInput.value = keyItem.key;
      apiKeyTypeSelect.value = keyItem.type;
      
      // 保存为当前配置
      chrome.storage.sync.set({
        deeplApiKey: keyItem.key,
        deeplApiKeyType: keyItem.type
      });
      
      showSuccessDialog('已加载密钥: ' + keyItem.name);
    }
  }

  // 删除保存的密钥
  function deleteKey(index) {
    chrome.storage.sync.get('deeplSavedKeys', function(data) {
      if (data.deeplSavedKeys && data.deeplSavedKeys[index]) {
        const keyName = data.deeplSavedKeys[index].name;
        
        // 从数组中删除
        data.deeplSavedKeys.splice(index, 1);
        allKeys = data.deeplSavedKeys;
        
        // 更新总页数
        totalPages = Math.ceil(allKeys.length / keysPerPage);
        
        // 如果当前页已经没有内容，且不是第一页，则回到上一页
        if (currentPage > totalPages && currentPage > 1) {
          currentPage = totalPages;
        }
        
        // 保存更新后的列表
        chrome.storage.sync.set({ deeplSavedKeys: data.deeplSavedKeys }, function() {
          // 重新渲染列表和分页
          renderKeysList(allKeys);
          renderPagination();
          showSuccessDialog('已删除密钥: ' + keyName);
        });
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
    document.querySelector('.error-tips').style.display = 'block';
    errorOverlay.style.display = 'flex';
  }
  
  // 显示成功提示对话框
  function showSuccessDialog(message) {
    errorMessage.textContent = message;
    document.querySelector('.error-tips').style.display = 'none';
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
