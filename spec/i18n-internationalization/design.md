# 技术方案: 后端UI界面国际化功能

## 架构与流程 (Architecture & Flow)

```mermaid
graph TB
    A[用户访问系统] --> B{检测浏览器语言}
    B --> C[从localStorage获取用户偏好]
    C --> D[确定显示语言]
    D --> E[加载对应语言包]
    E --> F[渲染国际化界面]
    
    G[用户点击语言切换器] --> H[更新语言状态]
    H --> I[保存到localStorage]
    I --> J[重新渲染界面]
    
    K[组件渲染] --> L[调用t()函数]
    L --> M{翻译键存在?}
    M -->|是| N[返回翻译文本]
    M -->|否| O[回退到英文]
    O --> P[输出警告日志]
```

## 实现细节 (Implementation Details)

### 技术栈选择
- **国际化库**: react-i18next (轻量级，与Next.js兼容性好)
- **语言检测**: i18next-browser-languagedetector
- **语言文件格式**: JSON (支持嵌套结构)
- **状态管理**: 结合现有的React状态和localStorage

### 前端架构

#### 1. 国际化配置 (`lib/i18n.ts`)
```typescript
// 配置i18next实例
// 支持语言: zh(中文), en(英文), ja(日文)
// 默认语言: en
// 回退语言: en
// 语言检测顺序: localStorage -> navigator -> 默认
```

#### 2. 语言文件结构 (`locales/`)
```
locales/
├── zh/
│   └── common.json
├── en/
│   └── common.json
└── ja/
    └── common.json
```

#### 3. 语言切换组件 (`components/LanguageSwitcher.tsx`)
- 下拉选择器样式
- 显示语言名称和图标
- 响应式设计
- 与MUI主题集成

#### 4. 主要修改文件

**pages/index.tsx**:
- 集成i18next Provider
- 添加语言切换器到页头
- 翻译所有硬编码文本

**所有组件文件**:
- 导入useTranslation hook
- 替换硬编码文本为t()函数调用
- 保持组件功能不变

### 语言文件内容结构

```json
{
  "common": {
    "title": "ComfyFlow-Lite",
    "subtitle": "把任意 ComfyUI workflow 一键映射成 REST 与 MCP 接口",
    "tabs": {
      "dashboard": "仪表板",
      "workflows": "工作流",
      "apiTest": "API 测试",
      "aiChat": "AI 聊天",
      "keywords": "关键词管理",
      "settings": "设置"
    },
    "buttons": {
      "create": "创建",
      "edit": "编辑",
      "delete": "删除",
      "save": "保存",
      "cancel": "取消"
    },
    "messages": {
      "success": "操作成功",
      "error": "操作失败"
    }
  }
}
```

### 语言检测逻辑

1. **优先级顺序**:
   - localStorage中的用户偏好
   - 浏览器navigator.language
   - 默认英文

2. **语言映射**:
   - zh-CN, zh-TW, zh → zh
   - en-US, en-GB, en → en  
   - ja-JP, ja → ja

### 性能优化

1. **懒加载**: 只加载当前语言的翻译文件
2. **缓存**: 翻译文件缓存到内存
3. **代码分割**: 语言文件独立打包

## 注意事项 (Caveats)

1. **翻译完整性**: 确保所有三种语言的翻译文件保持同步，避免缺失翻译
2. **文本长度**: 不同语言的文本长度差异可能影响UI布局，需要测试各语言下的界面效果
3. **字体支持**: 确保系统字体能正确显示中文和日文字符
4. **RTL支持**: 当前方案不包含RTL语言支持，如需要需额外配置
5. **SEO影响**: 由于是客户端渲染的国际化，对SEO可能有影响
6. **API响应**: 后端API返回的错误信息也需要考虑国际化
7. **日期格式**: 不同语言环境下的日期、时间格式需要适配
8. **数字格式**: 数字的千分位分隔符在不同语言环境下可能不同
