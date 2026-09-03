# Widget 建置流程 (React + TS + Tailwind v4 + D3.js)

## 1. 初始化專案
```bash
npm create vite@latest map-widgets -- --template react-ts
# 提示：當詢問「Which linter to use?」時，請選擇 ESLint
cd map-widgets
```

## 2. 安裝核心套件
```bash
npm install
npm install d3 @types/d3
npm install tailwindcss @tailwindcss/vite
```

## 3. 設定 Vite 環境 (`vite.config.ts`)
將專案根目錄的 `vite.config.ts` 內容完整替換如下，啟用 Tailwind 外掛：
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

## 4. 更新樣式與清理檔案
1. 開啟 `src/index.css`，清空所有預設內容，並加入最新版 Tailwind 宣告：
   ```css
   @import "tailwindcss";
   ```
2. 直接刪除不需要的預設樣式檔 `src/App.css`。

## 5. 植入程式碼 (`src/App.tsx`)
開啟 `src/App.tsx`，清空所有預設內容，並將包含完整 UI 結構與 D3 擴散動畫邏輯的 Widget 原始碼完整貼入。

## 6. 啟動與預覽
```bash
npm run dev
```
伺服器啟動後，在 VS Code 內按下 `Ctrl + Shift + P` 呼叫命令列，執行 **Simple Browser: Show**，接著輸入 `http://localhost:5173` 即可在編輯器側邊欄即時操作動態圖表。