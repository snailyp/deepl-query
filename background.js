// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理查询DeepL API余量的请求
  if (request.action === 'checkDeeplUsage') {
    const apiKey = request.apiKey;
    const apiKeyType = request.apiKeyType || 'pro';
    
    // 设置API URL
    let apiUrl = "https://api.deepl.com/v2/usage";
    if (apiKeyType === "free") {
      apiUrl = "https://api-free.deepl.com/v2/usage";
    }
    
    // 发送请求
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + apiKey
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('API 请求失败: ' + response.status + ' ' + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      // 发送成功响应
      sendResponse({
        success: true,
        data: data,
        apiKeyType: apiKeyType
      });
    })
    .catch(error => {
      // 发送错误响应
      sendResponse({
        success: false,
        error: error.message
      });
    });
    
    // 返回true表示将异步发送响应
    return true;
  }
});
