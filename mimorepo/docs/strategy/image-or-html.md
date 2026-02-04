# 截图与HTML信息处理的Token节约策略

## 核心原则
- **优先文本提取**：文本信息比图像编码更节约token
- **分层处理**：根据信息密度选择不同处理方式
- **智能压缩**：去除冗余信息，保留核心内容

## 截图处理策略

### 1. OCR优先策略
```javascript
// 使用OCR提取文本而非直接分析图像
const extractedText = await ocrExtract(image);
// 文本token消耗：~1 token per 4字符
// 图像token消耗：~226 tokens (85x85) 到 ~733 tokens (512x512)
```

### 2. 区域识别与裁剪
```javascript
// 只提取包含关键信息的区域
const relevantRegions = await detectUIComponents(image);
const croppedImages = await cropRegions(image, relevantRegions);
```

### 3. 元数据替代
```javascript
// 用结构化描述替代部分图像
const layoutInfo = {
    type: "dashboard",
    sections: ["header", "sidebar", "main_content"],
    colorscheme: "light"
};
```

## HTML处理策略

### 1. 内容提取与净化
```javascript
// 移除无关标签和属性
const cleanHtml = removeUnusedAttributes(html);
const essentialContent = extractTextContent(cleanHtml);
```

### 2. 结构化表示
```javascript
// 将DOM转换为紧凑的JSON结构
const domStructure = {
    tag: "div",
    class: "container",
    children: [
        {tag: "h1", text: "标题"},
        {tag: "p", text: "内容摘要"}
    ]
};
```

### 3. 样式简化
```javascript
// 提取关键CSS规则而非完整样式表
const keyStyles = {
    layout: "flexbox",
    colorTheme: "blue_primary",
    responsive: true
};
```

## 混合处理策略

### 1. 智能选择算法
```javascript
function chooseRepresentation(content) {
    if (hasTextualStructure(content)) {
        return "text_extraction";
    } else if (hasVisualComplexity(content)) {
        return "ocr + minimal_image";
    } else {
        return "structured_metadata";
    }
}
```

### 2. 分层信息传递
```javascript
// 第一层：结构元数据 (最节约)
const structureInfo = await getPageStructure(url);

// 第二层：关键内容文本
const essentialText = extractImportantContent(html);

// 第三层：特定区域截图（按需）
const specificScreenshots = await captureKeyAreas();
```

## Token优化技巧

### 1. 文本压缩
- 使用缩写和符号
- 移除格式化字符
- 合并重复信息

### 2. 上下文管理
```javascript
// 建立共享上下文，避免重复描述
const sharedContext = {
    pageType: "电商页面",
    commonElements: ["导航栏", "购物车", "用户菜单"]
};
```

### 3. 增量更新
```javascript
// 只传递变化部分
const changes = diff(previousState, currentState);
```

## 实际应用示例

### 场景1：页面截图分析
```javascript
// 低效方式：直接发送截图
const tokensUsed = ~733;

// 高效方式：OCR + 关键区域截图
const textContent = await ocrExtract(screenshot);  // ~50 tokens
const keyArea = await cropScreenshot(screenshot, area);  // ~200 tokens
const totalTokens = ~250;
```

### 场景2：HTML页面理解
```javascript
// 低效方式：完整HTML
const htmlContent = await fetchFullHtml();  // ~2000+ tokens

// 高效方式：结构化提取
const pageStructure = extractStructure(html);  // ~150 tokens
const mainContent = extractMainContent(html);  // ~300 tokens
const totalTokens = ~450;
```

## 效果对比

| 处理方式 | Token消耗 | 准确性 | 适用场景 |
|---------|-----------|--------|----------|
| 完整图像 | 600-800 | 高 | 复杂视觉设计 |
| OCR文本 | 50-200 | 中 | 文本密集页面 |
| 结构化数据 | 100-300 | 高 | 规则化页面 |
| 混合方式 | 200-400 | 高 | 大多数场景 |

## 最佳实践

1. **预处理优先**：在发送给模型前进行最大程度的信息压缩
2. **动态调整**：根据具体任务选择最适合的表示方式
3. **缓存复用**：对重复出现的元素使用引用而非重复描述
4. **批量处理**：将相关信息打包处理，减少上下文切换

通过以上策略，可以在保持信息完整性的前提下，将token消耗降低60-80%。