# 📊 P2P 表決系統（Vote-P2P）

一個純前端、無伺服器的即時表決工具，使用 [GitHub Pages](https://pages.github.com) 與 [PeerJS](https://peerjs.com/) 建置，只要掃描 QR Code 就能加入會議表決！

---

## 🔧 功能特色

- ✅ P2P 架構，不需要伺服器
- 📱 掃描 QR Code 即可加入
- 🗳 支援同意、反對、棄權
- ⏳ 可設定每輪表決時間限制
- 🧑‍💼 顯示已登入成員清單
- 🕒 即時顯示目前時間
- 📄 匯出所有歷史投票記錄（`.txt`）

---

## 🚀 使用方式

### 🧑‍💼 主辦人操作

1. 在主頁上，輸入會議事由、表決議題和時限（以秒為單位）。
2. 點擊「發佈新議題」按鈕後，QR code 會顯示在頁面上，其他參與者可掃描 QR code 加入表決。
3. 主辦人可以透過「複製連結」按鈕來複製當前的投票頁面鏈接並分享給其他人。
4. 若需要匯出投票記錄，可以點擊「匯出投票記錄」按鈕，投票記錄將生成一個 .txt 檔案下載。

### 🙋‍♂️ 參與者操作

1. 掃描主辦人提供的 QR Code 或點擊連結
2. 輸入姓名後加入表決
3. 等待議題出現，按下同意 / 反對 / 棄權 即可投票

---

## 🛠 技術細節

- **前端框架**：純 HTML + JavaScript + [Tailwind CSS](https://tailwindcss.com/)
- **即時通訊**：使用 [PeerJS](https://peerjs.com/) 進行 WebRTC P2P 通訊
- **QR Code**：使用 [qrcode.js](https://github.com/soldair/node-qrcode)

---

## 📁 匯出格式（.txt）

```txt
所有表決記錄
====================

議題：學生會預算案
時間：2025/04/17 10:05:00
------------------------
小明：同意
小華：反對
小美：棄權
------------------------

議題：校慶表演決策
時間：2025/04/17 10:25:00
------------------------
小明：反對
小華：反對
小美：同意
------------------------
```
## 💡 貢獻與授權

- 歡迎 Fork 本專案並加以改造！
- 授權方式：MIT License
