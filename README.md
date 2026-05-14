# K-Meet 執行日誌

## 專案狀態：v0.2.0 (應用邏輯完備階段)

## 核心版本紀錄

### [v0.1.0] - 基礎聚會框架
- [x] 邀請函發起邏輯：支援 5 首預計歌曲或音樂類型標籤。
- [x] 主揪審核機制：主揪可查看報名者檔案並決定是否錄取。
- [x] 地點關聯：邀請函必須綁定具體合作 KTV 店家。

### [v0.2.0] - 實戰優化與公平性 (Current)
- [x] 協作歌單：參與者報名時可提議 2 首歌曲。
- [x] 備選遞補邏輯：處理「店家無此歌」時的自動切換。
- [x] 公平輪唱演算法：解決霸佔麥克風問題，支援中途加入者。
- [x] 店家數據回報：建立用戶回報機制以修正 J-pop 歌曲存活率。

## 技術指標摘要
- **行為驅動**：所有功能均需通過 `features/` 內的場景測試。
- **數據來源**：歌手+歌名關鍵字搜尋 (取代不穩定序號)。
- **信用體系**：放鳥記錄影響未來報名成功率。

## 檔案結構
```
kmeet/
├── README.md                  # 執行日誌
├── walkthrough.md             # 開發決策日誌
├── src.jsx                    # 主要 React 原型（單檔）
└── features/
    ├── invitation.feature     # 發起聚會與歌單設定
    ├── participation.feature  # 申請加入與歌曲提議
    ├── venue_sync.feature     # 店家存活率與搜尋策略
    └── fair_rotation.feature  # 公平輪唱與動態排程
```

## 技術架構（src.jsx）
| 層級 | 說明 |
|------|------|
| SONG_POOL / VENUES | 靜態資料（模擬 API） |
| buildFlatRotation() | 公平輪唱演算法，支援 lateJoiners |
| detectGenre() | 依歌曲語言分佈自動標記聚會類型 |
| TabInvitation | 邀請函建立、備案歌曲、發布流程 |
| TabParticipation | 報名審核、重複歌曲偵測警示 |
| TabVenueSync | 包廂點歌回報、存活率衰減、備案彈出 |
| TabFairRotation | 輪唱排程、游標推進、中途加入 D 演示 |

## 演算法說明：buildFlatRotation
```
輸入：members[], lateJoiners[{...member, joinAfterSlot}]
輸出：slots[{slotIdx, round, participantId, songId, isLateJoin}]

規則：
- 每輪從每位成員各取一首 → A1,B1,C1 → A2,B2,C2 ...
- lateJoiners 在 joinAfterSlot 所在輪次結束後插入下一輪首位
- slotIdx 不可變，確保排程確定性
```
