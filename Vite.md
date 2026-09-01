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


## 7. UI優化

要讓 UI 滿版顯示並完美貼合不同尺寸的裝置螢幕（消除邊緣空白並具備響應式 RWD），請將 `src/App.tsx` 檔案最下方的 `return` 區塊完全替換為以下程式碼。

**主要修改重點**

- 滿版深色背景 (`min-h-screen bg-[#0a0c10]`)：在外層包裹一個與螢幕同高的滿版容器，填滿原本預設的白色網頁背景。

- 彈性置中 (`flex items-center justify-center`)：確保 Widget 區塊在大螢幕時能保持絕對的垂直與水平置中。

- 響應式斷點 (`sm:flex-row`, `flex-wrap`)：針對行動裝置尺寸加入斷點。底部的控制面板在手機螢幕上會自動折行排列，並動態調整內邊距 (`p-4 sm:p-10`) 以防止版面破壞。

- SVG 自適應縮放 (`h-auto max-h-[400px]`)：釋放原本寫死的圖表高度，讓 `D3.js` 根據 `viewBox` 比例隨螢幕寬度自動縮放。

```typescript
  return (
    <div className="min-h-screen w-full bg-[#0a0c10] flex items-center justify-center p-4 sm:p-8 box-border">
      <div className="flex flex-col items-center w-full max-w-5xl p-6 sm:p-10 bg-[#0f1115] text-white rounded-2xl shadow-2xl font-sans">
        
        <div className="flex flex-row justify-between items-center w-full mb-4 gap-4">
          <h1 className="text-xl sm:text-3xl font-semibold tracking-wide">GNN Traffic Congestion Simulator</h1>
          <button 
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors shrink-0"
            onClick={() => setDensity(0.5)}
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-8 w-full text-left sm:text-center">Click any intersection node or press 'Trigger Congestion' to simulate traffic failure</p>

        <svg ref={svgRef} className="w-full h-auto max-h-[400px] bg-transparent mb-10" />

        <div className="flex w-full justify-center gap-8 sm:gap-16 mb-8 text-center">
          <div>
            <div className="text-xs text-gray-500 font-bold tracking-widest mb-2">AFFECTED NODES</div>
            <div className="text-2xl font-semibold">{affectedNodes}</div>
          </div>
          <div className="w-px bg-gray-700"></div>
          <div>
            <div className="text-xs text-gray-500 font-bold tracking-widest mb-2">SYSTEM LOAD</div>
            <div className={`text-2xl font-semibold ${systemLoad === 'Critical' ? 'text-red-400' : systemLoad === 'Warning' ? 'text-yellow-400' : 'text-blue-100'}`}>
              {systemLoad}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap w-full gap-4 sm:gap-6 items-center bg-[#1a1c23] p-4 rounded-xl">
          <button
            className="w-full md:w-auto md:flex-1 py-4 px-6 bg-[#2d3039] hover:bg-[#3a3e49] text-gray-200 rounded-xl font-medium transition-colors"
            onClick={() => triggerCongestionFromNode('n20')}
          >
            Trigger Congestion
          </button>
          
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto px-2 sm:px-4">
            <span className="text-sm text-gray-300 whitespace-nowrap">Network Density</span>
            <input
              type="range"
              min="0.2" max="1.0" step="0.1"
              value={density}
              onChange={(e) => setDensity(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="px-6 py-4 bg-[#2d3039] rounded-xl text-sm font-medium w-full md:w-auto text-center shrink-0">
            {density}
          </div>
        </div>

      </div>
    </div>
  );


} //
```

## 8. **Gemini** 對話中取得 `Interactive Widget` 指令

- 直接提供完整版：明確要求「請提供最終完整的 `App.tsx`」，我會將所有圖表邏輯與 UI 綁定好一次輸出，你只需全選並覆蓋檔案即可。

- 模組化拆分：要求將複雜的圖表運算抽離成自訂 Hook（例如 `useGNNGraph`），讓 `App.tsx` 的 `return` 區塊保持純粹且易讀的宣告式結構。




<!-- ----
# 建立 Vite 專案


## 1. 在 VS Code 開啟終端機（快速鍵 Ctrl + `），執行以下指令建立專案框架並進入目錄：

```bash
npm create vite@latest map-widgets -- --template react-ts
cd map-widgets
```

- 建議您使用鍵盤方向鍵向下切換到 `ESLint`，然後按下 Enter 確認。
- 先不要啟動

    - `ESLint`：這是目前 React 與 TypeScript 生態系中最標準且成熟的語法檢查工具。它能完美對應稍早提到的 VS Code ESLint 擴充套件，在您貼上 Widget 程式碼時，能直接在編輯器內自動提示格式或語法錯誤。

    - `Oxlint`：這是一款較新的工具，主打極致的檢查速度。雖然效能優異，但在我們建立這種小型的沙盒圖表專案時，選擇社群資源與擴充套件支援度最完善的 ESLint 即可，能省去額外的設定麻煩。

## 2. 安裝相依套件
安裝基礎模組、D3.js 圖表庫，以及最新版的 Tailwind CSS 與 PostCSS 獨立外掛：

```bash
npm install
npm install d3 @types/d3
npm install -D tailwindcss @tailwindcss/postcss autoprefixer
```

## 3. 設定環境檔

- 在 `map-widgets` 專案根目錄手動建立兩個設定檔。
- 建立 `tailwind.config.js`：

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- 建立 `postcss.config.js`：
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

## 4. 植入程式碼與全域樣式

開啟 `src/index.css`，刪除所有預設內容，替換為 `Tailwind` 指令：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
- 開啟 `src/App.tsx`，刪除所有預設內容，貼上 `PathfindingVisualizer` 或 `GNNTrafficSimulator` 的完整 `TypeScript` 原始碼。若原本貼上的元件名稱不是 `App`，可將檔案最下方的匯出改為 `export default function App()`。

- 將 `src/App.css` 檔案直接刪除（不再需要）。

## 5. 啟動伺服器與 VS Code 內建預覽
在終端機啟動開發伺服器：

```bash
npm run dev
```

伺服器運行後，按下 `Cmd + Shift + P`（Windows 為 `Ctrl + Shift + P`）開啟命令列，輸入並選擇 Simple Browser: Show。在跳出的網址列填入終端機顯示的本地位址（通常是 `http://localhost:5173`），即可在 VS Code 右側分割視窗即時操作 Widget，並享有邊改邊看的熱更新支援。 
-->