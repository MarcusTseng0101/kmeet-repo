import { useState, useEffect } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────
const VENUES = [
  { id: 1, name: "好樂迪 信義店", jpop: 92, status: "高存活率", rooms: 12, address: "台北市信義區松壽路" },
  { id: 2, name: "錢櫃 復興店", jpop: 78, status: "中存活率", rooms: 8, address: "台北市大安區復興南路" },
  { id: 3, name: "星聚點 西門店", jpop: 45, status: "低存活率", rooms: 6, address: "台北市萬華區峨眉街" },
  { id: 4, name: "錢櫃 SOGO 店", jpop: 83, status: "高存活率", rooms: 10, address: "台北市大安區忠孝東路四段" },
];

const SONG_POOL = [
  { id: 1, title: "Lemon", artist: "米津玄師", lang: "J-pop", alive: 95 },
  { id: 2, title: "Pretender", artist: "Official髭男dism", lang: "J-pop", alive: 88 },
  { id: 3, title: "夜に駆ける", artist: "YOASOBI", lang: "J-pop", alive: 91 },
  { id: 4, title: "怪物", artist: "YOASOBI", lang: "J-pop", alive: 85 },
  { id: 5, title: "Dynamite", artist: "BTS", lang: "K-pop", alive: 97 },
  { id: 6, title: "STAY", artist: "The Kid LAROI", lang: "英文", alive: 82 },
  { id: 7, title: "晴天", artist: "周杰倫", lang: "華語", alive: 99 },
  { id: 8, title: "青花瓷", artist: "周杰倫", lang: "華語", alive: 98 },
  { id: 9, title: "愛你", artist: "王心凌", lang: "華語", alive: 94 },
  { id: 10, title: "ミックスナッツ", artist: "Official髭男dism", lang: "J-pop", alive: 72 },
  { id: 11, title: "告白氣球", artist: "周杰倫", lang: "華語", alive: 99 },
  { id: 12, title: "算什麼男人", artist: "周杰倫", lang: "華語", alive: 96 },
  { id: 13, title: "好不容易", artist: "告五人", lang: "華語", alive: 91 },
  { id: 14, title: "刻在我心底的名字", artist: "盧廣仲", lang: "華語", alive: 93 },
  { id: 15, title: "紅蓮華", artist: "LiSA", lang: "J-pop", alive: 74 },
  { id: 16, title: "炎", artist: "LiSA", lang: "J-pop", alive: 68 },
  { id: 17, title: "廻廻奇譚", artist: "Eve", lang: "J-pop", alive: 71 },
];

const INITIAL_PARTICIPANTS = [
  { id: 1, name: "小雨", avatar: "🌧️", credit: 98, songs: [1, 7], joined: "confirmed" },
  { id: 2, name: "阿豪", avatar: "🎸", credit: 85, songs: [3, 5], joined: "confirmed" },
  { id: 3, name: "Mei", avatar: "🌸", credit: 100, songs: [2, 4], joined: "pending" },
];

// ─── BDD DEMO PARTICIPANTS (A, B, C × 5 songs each) ─────────────────────────
const ROTATION_DEMO = [
  { id: "A", name: "A (小雨)", avatar: "🌧️", songs: [7, 11, 8, 9, 13] },
  { id: "B", name: "B (阿豪)", avatar: "🎸", songs: [3, 5, 1, 4, 10] },
  { id: "C", name: "C (Mei)", avatar: "🌸", songs: [2, 12, 14, 6, 15] },
];

// ─── FAIR ROTATION ALGORITHM ─────────────────────────────────────────────────
// Returns a flat array of slots: [{slotIdx, round, participantId, songId, isLateJoin}]
// lateJoiners: [{id, name, avatar, songs, joinAfterSlot}] — inserted at end of current round
function buildFlatRotation(members, lateJoiners = []) {
  if (members.length === 0) return [];
  const queues = {};
  members.forEach(m => { queues[m.id] = [...m.songs]; });
  const slots = [];
  let slotIdx = 0;
  let round = 1;

  // Build rounds until all queues are empty, inserting late joiners at round boundaries
  const activeMembers = [...members];

  while (activeMembers.some(m => queues[m.id]?.length > 0)) {
    const roundStart = slotIdx;
    // Add any late joiner whose joinAfterSlot falls within this round's start
    lateJoiners.forEach(lj => {
      if (lj.joinAfterSlot < roundStart && !activeMembers.find(m => m.id === lj.id)) {
        activeMembers.push(lj);
        queues[lj.id] = [...lj.songs];
      }
    });

    activeMembers.forEach(m => {
      if (queues[m.id]?.length > 0) {
        const isNew = !!lateJoiners.find(lj => lj.id === m.id && lj.joinAfterSlot < roundStart);
        slots.push({ slotIdx: slotIdx++, round, participantId: m.id, songId: queues[m.id].shift(), isLateJoin: isNew && round === (slots.find(s=>s.participantId===m.id)?.round ?? round) });
      }
    });
    round++;
  }

  // Insert late joiners who haven't been added yet (join mid-last-round)
  lateJoiners.forEach(lj => {
    if (!activeMembers.find(m => m.id === lj.id)) {
      // append at end
      const ljRound = (slots[slots.length - 1]?.round ?? 0) + 1;
      [...lj.songs].forEach(sid => {
        slots.push({ slotIdx: slotIdx++, round: ljRound, participantId: lj.id, songId: sid, isLateJoin: true });
      });
    }
  });

  return slots;
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function SongBadge({ songId, showAlive }) {
  const song = SONG_POOL.find(s => s.id === songId);
  if (!song) return null;
  const aliveColor = song.alive >= 85 ? "#4ade80" : song.alive >= 65 ? "#facc15" : "#f87171";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20, padding: "3px 10px", fontSize: 12, color: "#e2e8f0",
      fontFamily: "'Noto Sans TC', sans-serif",
    }}>
      🎵 {song.title}
      {showAlive && (
        <span style={{ color: aliveColor, fontSize: 10, fontWeight: 700 }}>{song.alive}%</span>
      )}
    </span>
  );
}

function VenueCard({ venue, selected, onSelect }) {
  const barColor = venue.jpop >= 80 ? "#4ade80" : venue.jpop >= 60 ? "#facc15" : "#f87171";
  return (
    <div onClick={() => onSelect(venue)} style={{
      background: selected ? "rgba(232,121,249,0.15)" : "rgba(255,255,255,0.04)",
      border: selected ? "1.5px solid #e879f9" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: "14px 18px", cursor: "pointer",
      transition: "all 0.2s", marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{venue.name}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{venue.address}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
          background: barColor + "22", color: barColor, border: `1px solid ${barColor}44`
        }}>{venue.status}</span>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 11, color: "#94a3b8" }}>J-pop 存活率</div>
        <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 6 }}>
          <div style={{ width: `${venue.jpop}%`, background: barColor, borderRadius: 99, height: 6, transition: "width 0.5s" }} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{venue.jpop}%</div>
      </div>
    </div>
  );
}

function ParticipantRow({ p, onApprove, onReject, showActions }) {
  const creditColor = p.credit >= 90 ? "#4ade80" : p.credit >= 70 ? "#facc15" : "#f87171";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "rgba(255,255,255,0.04)", borderRadius: 12,
      padding: "12px 16px", marginBottom: 8,
      border: p.joined === "confirmed" ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(255,255,255,0.08)"
    }}>
      <div style={{ fontSize: 24 }}>{p.avatar}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 15 }}>{p.name}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          {p.songs.map(sid => <SongBadge key={sid} songId={sid} showAlive />)}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "#64748b" }}>信用分</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: creditColor }}>{p.credit}</div>
      </div>
      {showActions && p.joined === "pending" && (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onApprove(p.id)} style={{
            background: "#4ade8022", color: "#4ade80", border: "1px solid #4ade8044",
            borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 13
          }}>錄取</button>
          <button onClick={() => onReject(p.id)} style={{
            background: "#f8717122", color: "#f87171", border: "1px solid #f8717144",
            borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 13
          }}>拒絕</button>
        </div>
      )}
      {p.joined === "confirmed" && (
        <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>✓ 確認</span>
      )}
    </div>
  );
}

// ─── TABS ────────────────────────────────────────────────────────────────────

// ─── GENRE AUTO-DETECTION ────────────────────────────────────────────────────
function detectGenre(songIds) {
  if (!songIds.length) return null;
  const counts = {};
  songIds.forEach(id => {
    const s = SONG_POOL.find(x => x.id === id);
    if (s) counts[s.lang] = (counts[s.lang] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return null;
  const ratio = top[1] / songIds.length;
  if (ratio >= 0.6) return top[0] + "流行";
  if (sorted.length >= 2) return sorted.map(([l]) => l).slice(0, 2).join(" / ") + " 混合";
  return "綜合";
}

const GENRE_COLORS = {
  "華語流行": { bg: "rgba(251,191,36,0.15)", border: "#fbbf2444", color: "#fbbf24" },
  "J-pop流行": { bg: "rgba(129,140,248,0.15)", border: "#818cf844", color: "#818cf8" },
  "K-pop流行": { bg: "rgba(74,222,128,0.15)", border: "#4ade8044", color: "#4ade80" },
  "英文流行": { bg: "rgba(56,189,248,0.15)", border: "#38bdf844", color: "#38bdf8" },
};
const defaultGenreStyle = { bg: "rgba(232,121,249,0.15)", border: "#e879f944", color: "#e879f9" };

function SongSelector({ label, accent, selected, setSelected, max, query, setQuery }) {
  const filtered = SONG_POOL.filter(s =>
    s.title.includes(query) || s.artist.includes(query)
  );
  const toggle = (id) => {
    if (selected.includes(id)) setSelected(selected.filter(x => x !== id));
    else if (selected.length < max) setSelected([...selected, id]);
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, minHeight: 32 }}>
        {selected.map(sid => (
          <span key={sid} onClick={() => toggle(sid)} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: accent + "22", border: `1px solid ${accent}44`,
            borderRadius: 20, padding: "4px 12px", fontSize: 13, color: accent,
            cursor: "pointer", transition: "all 0.15s"
          }}>
            {SONG_POOL.find(s => s.id === sid)?.title} ✕
          </span>
        ))}
        {selected.length === 0 && (
          <span style={{ fontSize: 12, color: "#475569", padding: "4px 0" }}>尚未選擇</span>
        )}
      </div>
      <input
        placeholder="搜尋歌手 / 歌名…"
        value={query} onChange={e => setQuery(e.target.value)}
        style={{
          width: "100%", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
          padding: "9px 14px", color: "#f1f5f9", fontSize: 13,
          outline: "none", boxSizing: "border-box", marginBottom: 8
        }}
      />
      <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 10, background: "rgba(0,0,0,0.15)" }}>
        {filtered.map(s => {
          const isSelected = selected.includes(s.id);
          const aliveColor = s.alive >= 85 ? "#4ade80" : s.alive >= 65 ? "#facc15" : "#f87171";
          const isDisabled = !isSelected && selected.length >= max;
          return (
            <div key={s.id} onClick={() => !isDisabled && toggle(s.id)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", cursor: isDisabled ? "not-allowed" : "pointer",
              background: isSelected ? accent + "18" : "transparent",
              borderLeft: isSelected ? `3px solid ${accent}` : "3px solid transparent",
              opacity: isDisabled ? 0.35 : 1, transition: "all 0.12s"
            }}>
              <div>
                <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{s.title}</span>
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{s.artist}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#475569", background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: 10 }}>{s.lang}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: aliveColor, minWidth: 34, textAlign: "right" }}>{s.alive}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TabInvitation({ venue, setVenue, hostSongs, setHostSongs, backupSongs, setBackupSongs }) {
  const [activityName, setActivityName] = useState("");
  const [mainQuery, setMainQuery] = useState("");
  const [backupQuery, setBackupQuery] = useState("");
  const [published, setPublished] = useState(false);
  const [publishedData, setPublishedData] = useState(null);

  const genre = detectGenre(hostSongs);
  const genreStyle = GENRE_COLORS[genre] || defaultGenreStyle;
  const canPublish = activityName.trim() && venue && hostSongs.length === 5 && backupSongs.length === 2;

  const publish = () => {
    if (!canPublish) return;
    setPublishedData({ activityName, venue, hostSongs: [...hostSongs], backupSongs: [...backupSongs], genre, ts: new Date() });
    setPublished(true);
  };

  const reset = () => { setPublished(false); setPublishedData(null); };

  if (published && publishedData) {
    return (
      <div>
        {/* Success Banner */}
        <div style={{
          background: "linear-gradient(135deg, rgba(74,222,128,0.12), rgba(129,140,248,0.12))",
          border: "1px solid rgba(74,222,128,0.3)", borderRadius: 16, padding: 20, marginBottom: 20,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#4ade80", marginBottom: 4 }}>邀請函已發布！</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            {publishedData.ts.toLocaleString("zh-TW", { hour: "2-digit", minute: "2-digit" })} 發布
          </div>
        </div>

        {/* Published Card */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#f1f5f9" }}>{publishedData.activityName}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>📍 {publishedData.venue.name}</div>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
              background: genreStyle.bg, color: genreStyle.color, border: `1px solid ${genreStyle.border}`
            }}>🏷 {publishedData.genre}</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 700, letterSpacing: "0.06em" }}>🎤 必唱歌曲</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {publishedData.hostSongs.map(sid => <SongBadge key={sid} songId={sid} showAlive />)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, fontWeight: 700, letterSpacing: "0.06em" }}>🔄 備案歌曲</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {publishedData.backupSongs.map(sid => <SongBadge key={sid} songId={sid} showAlive />)}
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: 12, color: "#475569", display: "flex", gap: 16 }}>
            <span>👥 最多 8 人</span>
            <span>🛡 信用體系啟用</span>
            <span>🔍 審核制</span>
          </div>
        </div>

        <button onClick={reset} style={{
          width: "100%", marginTop: 14, background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          padding: "11px", color: "#64748b", cursor: "pointer", fontSize: 13
        }}>← 重新編輯</button>
      </div>
    );
  }

  return (
    <div>
      {/* Activity Name */}
      <SectionTitle>✏️ 活動名稱</SectionTitle>
      <input
        placeholder="例：周杰倫之夜 · 五月天老歌場"
        value={activityName} onChange={e => setActivityName(e.target.value)}
        style={{
          width: "100%", background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
          padding: "11px 14px", color: "#f1f5f9", fontSize: 14,
          outline: "none", boxSizing: "border-box", marginBottom: 20
        }}
      />

      {/* Venue */}
      <SectionTitle>📍 綁定 KTV 店家</SectionTitle>
      {VENUES.map(v => <VenueCard key={v.id} venue={v} selected={venue?.id === v.id} onSelect={setVenue} />)}

      {/* Must-sing songs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 }}>
        <SectionTitle style={{ margin: 0 }}>🎤 必唱歌曲</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {genre && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              background: genreStyle.bg, color: genreStyle.color, border: `1px solid ${genreStyle.border}`,
              transition: "all 0.3s"
            }}>🏷 {genre}</span>
          )}
          <span style={{
            fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: hostSongs.length === 5 ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
            color: hostSongs.length === 5 ? "#4ade80" : "#64748b",
            border: hostSongs.length === 5 ? "1px solid #4ade8044" : "1px solid rgba(255,255,255,0.08)"
          }}>{hostSongs.length}/5</span>
        </div>
      </div>
      <SongSelector
        label="必唱" accent="#e879f9"
        selected={hostSongs} setSelected={setHostSongs}
        max={5} query={mainQuery} setQuery={setMainQuery}
      />

      {/* Backup songs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 }}>
        <SectionTitle style={{ margin: 0 }}>🔄 備案歌曲</SectionTitle>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
          background: backupSongs.length === 2 ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.06)",
          color: backupSongs.length === 2 ? "#38bdf8" : "#64748b",
          border: backupSongs.length === 2 ? "1px solid #38bdf844" : "1px solid rgba(255,255,255,0.08)"
        }}>{backupSongs.length}/2</span>
      </div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
        當必唱歌曲在店家系統查無時，系統自動切換至備案歌曲。
      </div>
      <SongSelector
        label="備案" accent="#38bdf8"
        selected={backupSongs} setSelected={setBackupSongs}
        max={2} query={backupQuery} setQuery={setBackupQuery}
      />

      {/* Checklist */}
      <div style={{ marginTop: 20, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { ok: !!activityName.trim(), label: "活動名稱已填寫" },
          { ok: !!venue, label: "KTV 店家已綁定" },
          { ok: hostSongs.length === 5, label: `必唱歌曲 5 首 (${hostSongs.length}/5)` },
          { ok: backupSongs.length === 2, label: `備案歌曲 2 首 (${backupSongs.length}/2)` },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ color: item.ok ? "#4ade80" : "#475569", fontSize: 15 }}>{item.ok ? "✓" : "○"}</span>
            <span style={{ color: item.ok ? "#94a3b8" : "#475569" }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14 }}>
        <ActionButton onClick={publish} disabled={!canPublish}>
          {canPublish ? "🚀 發布邀請函" : "請完成以上設定"}
        </ActionButton>
      </div>
    </div>
  );
}

function TabParticipation({ participants, setParticipants, hostSongs }) {
  const [newName, setNewName] = useState("");
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [dupWarning, setDupWarning] = useState(null);   // songId that triggered warning
  const [swapTarget, setSwapTarget] = useState(null);   // songId being replaced
  const [songQuery, setSongQuery] = useState("");
  const avatars = ["🎺", "🥁", "🎹", "🎻", "🪗"];

  // All songs already committed: host's must-sing + other confirmed participants
  const confirmedSongs = participants
    .filter(p => p.joined === "confirmed")
    .flatMap(p => p.songs);
  const takenSongs = [...new Set([...hostSongs, ...confirmedSongs])];

  const handleSelectSong = (id) => {
    // Deselect
    if (selectedSongs.includes(id)) {
      setSelectedSongs(selectedSongs.filter(x => x !== id));
      if (dupWarning === id) setDupWarning(null);
      return;
    }
    // Already at max
    if (selectedSongs.length >= 2) return;
    // Duplicate check
    if (takenSongs.includes(id)) {
      setDupWarning(id);
      setSwapTarget(id);
      return;
    }
    setSelectedSongs([...selectedSongs, id]);
    setDupWarning(null);
  };

  const confirmAnyway = () => {
    if (swapTarget && selectedSongs.length < 2) {
      setSelectedSongs([...selectedSongs, swapTarget]);
    }
    setDupWarning(null);
    setSwapTarget(null);
  };

  const dismissWarning = () => {
    setDupWarning(null);
    setSwapTarget(null);
  };

  const apply = () => {
    if (!newName.trim() || selectedSongs.length === 0) return;
    setParticipants([...participants, {
      id: Date.now(), name: newName.trim(),
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      credit: Math.floor(Math.random() * 30) + 70,
      songs: selectedSongs, joined: "pending"
    }]);
    setNewName(""); setSelectedSongs([]); setDupWarning(null); setSwapTarget(null); setSongQuery("");
  };

  const approve = (id) => setParticipants(participants.map(p => p.id === id ? { ...p, joined: "confirmed" } : p));
  const reject = (id) => setParticipants(participants.filter(p => p.id !== id));

  const filtered = SONG_POOL.filter(s =>
    s.title.includes(songQuery) || s.artist.includes(songQuery)
  );

  const dupSong = dupWarning ? SONG_POOL.find(s => s.id === dupWarning) : null;

  return (
    <div>
      <SectionTitle>📋 報名者列表</SectionTitle>
      {participants.length === 0 && (
        <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "20px 0" }}>尚無報名者</div>
      )}
      {participants.map(p => (
        <ParticipantRow key={p.id} p={p} onApprove={approve} onReject={reject} showActions />
      ))}

      {/* ── New Application Form ── */}
      <div style={{
        marginTop: 24, background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18
      }}>
        <SectionTitle style={{ marginBottom: 14 }}>➕ 模擬新報名</SectionTitle>

        <input
          placeholder="姓名 / 暱稱"
          value={newName} onChange={e => setNewName(e.target.value)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
            padding: "10px 14px", color: "#f1f5f9", fontSize: 14,
            outline: "none", boxSizing: "border-box", marginBottom: 14
          }}
        />

        {/* Selected songs chips */}
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
          提議歌曲（最多 2 首）：
          <span style={{ marginLeft: 6, color: selectedSongs.length === 2 ? "#4ade80" : "#475569", fontWeight: 700 }}>
            {selectedSongs.length}/2
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 34, marginBottom: 10 }}>
          {selectedSongs.map(sid => {
            const isDup = takenSongs.includes(sid);
            return (
              <span key={sid} onClick={() => handleSelectSong(sid)} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: isDup ? "rgba(251,191,36,0.15)" : "rgba(129,140,248,0.15)",
                border: isDup ? "1px solid #fbbf2455" : "1px solid #818cf855",
                borderRadius: 20, padding: "4px 12px", fontSize: 13,
                color: isDup ? "#fbbf24" : "#818cf8", cursor: "pointer"
              }}>
                {isDup && <span style={{ fontSize: 10 }}>⚠</span>}
                {SONG_POOL.find(s => s.id === sid)?.title} ✕
              </span>
            );
          })}
          {selectedSongs.length === 0 && (
            <span style={{ fontSize: 12, color: "#374151", padding: "4px 0" }}>從下方選取歌曲</span>
          )}
        </div>

        {/* ── Duplicate Warning Toast ── */}
        {dupWarning && dupSong && (
          <div style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.35)",
            borderRadius: 12, padding: "14px 16px", marginBottom: 12,
            animation: "slideIn 0.2s ease"
          }}>
            <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 14, marginBottom: 4 }}>
                  這首歌重複了，要換一首嗎？
                </div>
                <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                  《{dupSong.title}》已在
                  {hostSongs.includes(dupSong.id) ? "主揪必唱歌單" : "其他參與者的歌單"}中。
                  加入重複歌曲會降低聚會歌單多樣性。
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={dismissWarning} style={{
                    flex: 1, background: "rgba(251,191,36,0.2)", color: "#fbbf24",
                    border: "1px solid #fbbf2444", borderRadius: 8,
                    padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700
                  }}>換一首 ↩</button>
                  <button onClick={confirmAnyway} style={{
                    flex: 1, background: "rgba(255,255,255,0.05)", color: "#64748b",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    padding: "7px 12px", cursor: "pointer", fontSize: 12
                  }}>還是要加</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Song search & list */}
        <input
          placeholder="搜尋歌手 / 歌名…"
          value={songQuery} onChange={e => setSongQuery(e.target.value)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
            padding: "9px 14px", color: "#f1f5f9", fontSize: 13,
            outline: "none", boxSizing: "border-box", marginBottom: 8
          }}
        />
        <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 10, background: "rgba(0,0,0,0.1)" }}>
          {filtered.map(s => {
            const isSelected = selectedSongs.includes(s.id);
            const isDup = takenSongs.includes(s.id);
            const isDisabled = !isSelected && selectedSongs.length >= 2;
            const aliveColor = s.alive >= 85 ? "#4ade80" : s.alive >= 65 ? "#facc15" : "#f87171";
            return (
              <div key={s.id} onClick={() => !isDisabled && handleSelectSong(s.id)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", cursor: isDisabled ? "not-allowed" : "pointer",
                background: isSelected ? (isDup ? "rgba(251,191,36,0.1)" : "rgba(129,140,248,0.1)") : "transparent",
                borderLeft: isSelected
                  ? (isDup ? "3px solid #fbbf24" : "3px solid #818cf8")
                  : isDup ? "3px solid rgba(251,191,36,0.25)" : "3px solid transparent",
                opacity: isDisabled ? 0.3 : 1, transition: "all 0.12s"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isDup && !isSelected && (
                    <span style={{ fontSize: 10, color: "#fbbf24" }} title="此歌已在歌單中">◈</span>
                  )}
                  <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{s.title}</span>
                  <span style={{ color: "#64748b", fontSize: 11 }}>{s.artist}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {isDup && (
                    <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "2px 7px", borderRadius: 10, border: "1px solid #fbbf2430" }}>已在歌單</span>
                  )}
                  <span style={{ fontSize: 10, color: "#475569", background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 10 }}>{s.lang}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: aliveColor, minWidth: 34, textAlign: "right" }}>{s.alive}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14 }}>
          <ActionButton onClick={apply} disabled={!newName.trim() || selectedSongs.length === 0}>
            送出報名
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function TabVenueSync({ participants, hostSongs, backupSongs, venueScores, setVenueScores, defaultVenue }) {
  const [selected, setSelected] = useState(defaultVenue || null);
  // notFound: { [venueId_songId]: true } — persisted "can't find" reports
  const [notFound, setNotFound] = useState({});
  // found: { [venueId_songId]: true }
  const [found, setFound] = useState({});
  // activeBackup: songId currently shown in backup panel
  const [activeBackup, setActiveBackup] = useState(null);
  // scoreFlash: set of "venueId_songId" keys currently animating score drop
  const [scoreFlash, setScoreFlash] = useState(new Set());

  // Compute effective alive score for a song at a venue
  const effectiveScore = (venueId, song) => {
    const key = `${venueId}_${song.id}`;
    if (venueScores[key] !== undefined) return venueScores[key];
    return song.alive;
  };

  const handleNotFound = (venueId, songId) => {
    const key = `${venueId}_${songId}`;
    // Mark as not found
    setNotFound(prev => ({ ...prev, [key]: true }));
    setFound(prev => { const n = { ...prev }; delete n[key]; return n; });
    // Decay score by 8 points (min 0)
    const song = SONG_POOL.find(s => s.id === songId);
    const current = venueScores[key] !== undefined ? venueScores[key] : song.alive;
    const next = Math.max(0, current - 8);
    setVenueScores(prev => ({ ...prev, [key]: next }));
    // Flash animation
    setScoreFlash(prev => new Set([...prev, key]));
    setTimeout(() => setScoreFlash(prev => { const n = new Set(prev); n.delete(key); return n; }), 1200);
    // Show backup panel: pick first backup song not already shown
    if (backupSongs.length > 0) {
      setActiveBackup({ triggeredBy: songId, backupIds: backupSongs });
    }
  };

  const handleFound = (venueId, songId) => {
    const key = `${venueId}_${songId}`;
    setFound(prev => ({ ...prev, [key]: true }));
    setNotFound(prev => { const n = { ...prev }; delete n[key]; return n; });
    // Slightly boost score (+3, max 100)
    const song = SONG_POOL.find(s => s.id === songId);
    const current = venueScores[key] !== undefined ? venueScores[key] : song.alive;
    setVenueScores(prev => ({ ...prev, [key]: Math.min(100, current + 3) }));
    if (activeBackup?.triggeredBy === songId) setActiveBackup(null);
  };

  // All songs in this gathering (host + confirmed participants)
  const confirmedSongs = participants.filter(p => p.joined === "confirmed").flatMap(p => p.songs);
  const allGatheringSongs = [...new Set([...hostSongs, ...confirmedSongs])];
  // Add 紅蓮華 (id:15) to simulate "在包廂內點歌" scenario — it's a real song but not in gathering yet
  const inRoomSongs = [...new Set([...allGatheringSongs, 15])];

  return (
    <div>
      <SectionTitle>🏪 選擇目前店家</SectionTitle>
      {VENUES.map(v => <VenueCard key={v.id} venue={v} selected={selected?.id === v.id} onSelect={setSelected} />)}

      {selected && (
        <>
          {/* ── Backup Panel ── */}
          {activeBackup && (
            <div style={{
              background: "linear-gradient(135deg, rgba(129,140,248,0.14), rgba(56,189,248,0.10))",
              border: "1px solid rgba(129,140,248,0.35)", borderRadius: 16,
              padding: 18, marginTop: 4, marginBottom: 20,
              animation: "slideIn 0.25s ease"
            }}>
              <style>{`
                @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
                @keyframes scoreDrop { 0%{color:#f87171;transform:scale(1.2)} 60%{color:#f87171} 100%{color:inherit;transform:scale(1)} }
              `}</style>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#818cf8" }}>
                  🔄 自動切換備案歌曲
                </div>
                <button onClick={() => setActiveBackup(null)} style={{
                  background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 0
                }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                《{SONG_POOL.find(s => s.id === activeBackup.triggeredBy)?.title}》點不到，以下是你的備案歌曲關鍵字：
              </div>
              {activeBackup.backupIds.map(bid => {
                const bs = SONG_POOL.find(s => s.id === bid);
                if (!bs) return null;
                const score = effectiveScore(selected.id, bs);
                const scoreColor = score >= 85 ? "#4ade80" : score >= 65 ? "#facc15" : "#f87171";
                return (
                  <div key={bid} style={{
                    background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 8,
                    border: "1px solid rgba(129,140,248,0.2)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 15 }}>{bs.title}</span>
                        <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{bs.artist}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{score}%</span>
                    </div>
                    {/* Search keyword chip */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[bs.title, bs.artist, bs.lang].map((kw, i) => (
                        <span key={i} style={{
                          background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.3)",
                          borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#a5b4fc",
                          fontFamily: "monospace", letterSpacing: "0.02em"
                        }}>🔍 {kw}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 11, color: "#475569", marginTop: 8, textAlign: "center" }}>
                在 KTV 點歌機輸入以上關鍵字搜尋
              </div>
            </div>
          )}

          {/* ── Song List ── */}
          <SectionTitle>🎤 包廂點歌狀態 — {selected.name}</SectionTitle>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
            點擊「點不到」以回報並啟用備案。評分將即時更新。
          </div>
          {inRoomSongs.map(sid => {
            const song = SONG_POOL.find(s => s.id === sid);
            if (!song) return null;
            const key = `${selected.id}_${sid}`;
            const score = effectiveScore(selected.id, song);
            const isNotFound = !!notFound[key];
            const isFound = !!found[key];
            const isFlashing = scoreFlash.has(key);
            const scoreColor = score >= 85 ? "#4ade80" : score >= 65 ? "#facc15" : "#f87171";
            const isBackup = backupSongs.includes(sid);
            return (
              <div key={sid} style={{
                background: isNotFound
                  ? "rgba(248,113,113,0.07)"
                  : isFound ? "rgba(74,222,128,0.06)" : "rgba(255,255,255,0.03)",
                border: isNotFound
                  ? "1px solid rgba(248,113,113,0.25)"
                  : isFound ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 8, transition: "all 0.3s"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{song.title}</span>
                      <span style={{ color: "#64748b", fontSize: 12 }}>{song.artist}</span>
                      {isBackup && (
                        <span style={{ fontSize: 10, color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 8px", borderRadius: 10, border: "1px solid #38bdf825" }}>備案</span>
                      )}
                      {!hostSongs.includes(sid) && !isBackup && (
                        <span style={{ fontSize: 10, color: "#818cf8", background: "rgba(129,140,248,0.1)", padding: "2px 8px", borderRadius: 10, border: "1px solid #818cf825" }}>參與者</span>
                      )}
                      {hostSongs.includes(sid) && (
                        <span style={{ fontSize: 10, color: "#e879f9", background: "rgba(232,121,249,0.1)", padding: "2px 8px", borderRadius: 10, border: "1px solid #e879f925" }}>必唱</span>
                      )}
                    </div>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#475569" }}>存活率</span>
                      <div style={{ width: 80, background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 4 }}>
                        <div style={{
                          width: `${score}%`, background: scoreColor,
                          borderRadius: 99, height: 4, transition: "width 0.6s"
                        }} />
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 800, color: scoreColor,
                        animation: isFlashing ? "scoreDrop 1.2s ease" : "none",
                        display: "inline-block"
                      }}>{score}%</span>
                      {isFlashing && (
                        <span style={{ fontSize: 11, color: "#f87171", animation: "slideIn 0.2s ease" }}>▼ -8</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", marginLeft: 10 }}>
                    {!isNotFound && !isFound && (
                      <>
                        <button onClick={() => handleNotFound(selected.id, sid)} style={{
                          background: "rgba(248,113,113,0.12)", color: "#f87171",
                          border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8,
                          padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700,
                          whiteSpace: "nowrap"
                        }}>點不到此歌</button>
                        <button onClick={() => handleFound(selected.id, sid)} style={{
                          background: "rgba(74,222,128,0.08)", color: "#4ade80",
                          border: "1px solid rgba(74,222,128,0.2)", borderRadius: 8,
                          padding: "5px 12px", cursor: "pointer", fontSize: 12,
                          whiteSpace: "nowrap"
                        }}>找到了 ✓</button>
                      </>
                    )}
                    {isNotFound && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700 }}>✗ 查無此歌</div>
                        <button onClick={() => { const n = {...notFound}; delete n[key]; setNotFound(n); }} style={{
                          fontSize: 11, color: "#475569", background: "none", border: "none",
                          cursor: "pointer", textDecoration: "underline", padding: 0, marginTop: 2
                        }}>撤回</button>
                      </div>
                    )}
                    {isFound && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>✓ 有此歌</div>
                        <button onClick={() => { const n = {...found}; delete n[key]; setFound(n); }} style={{
                          fontSize: 11, color: "#475569", background: "none", border: "none",
                          cursor: "pointer", textDecoration: "underline", padding: 0, marginTop: 2
                        }}>撤回</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{
            marginTop: 16, background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14
          }}>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              💡 每次「點不到」回報將使該店家此歌的存活率 <span style={{ color: "#f87171" }}>-8 分</span>，
              累積回報後系統會自動調整推薦排序，並提醒未來聚會改選高存活率店家。
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabFairRotation({ participants }) {
  // ── Demo mode: use A/B/C/D scenario from BDD ──
  const [useDemo, setUseDemo] = useState(true);
  const [cursor, setCursor] = useState(0); // current slot index (0 = not started, cursor = "next to sing")
  const [started, setStarted] = useState(false);

  // Late joiner D state
  const [dJoined, setDJoined] = useState(false);
  const [dJoinSlot, setDJoinSlot] = useState(null); // which slot D joined after
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);

  const MEMBER_D = { id: "D", name: "D (新朋友)", avatar: "🎵", songs: [5, 16, 17, 6, 12] };

  const baseMembers = useDemo ? ROTATION_DEMO : participants.filter(p => p.joined === "confirmed").map(p => ({
    id: p.id, name: p.name, avatar: p.avatar, songs: p.songs
  }));

  // Find all members including D if joined
  const lateJoiners = dJoined && dJoinSlot !== null
    ? [{ ...MEMBER_D, joinAfterSlot: dJoinSlot }]
    : [];

  const slots = buildFlatRotation(baseMembers, lateJoiners);

  // Group by round for display
  const rounds = [];
  slots.forEach(slot => {
    let r = rounds.find(x => x.round === slot.round);
    if (!r) { r = { round: slot.round, slots: [] }; rounds.push(r); }
    r.slots.push(slot);
  });

  const allMembers = [...baseMembers, ...(dJoined ? [MEMBER_D] : [])];
  const getMember = (id) => allMembers.find(m => m.id === id);
  const getSong = (id) => SONG_POOL.find(s => s.id === id);

  const advance = () => {
    if (cursor < slots.length) {
      const nextCursor = cursor + 1;
      // Check: is this a good moment to join D? (middle of round 2, after B2)
      // B2 is the 2nd slot of round 2 = slotIdx 4 (A1,B1,C1 = round1; A2,B2 = slots 3,4)
      if (!dJoined && nextCursor === 5) setShowJoinPrompt(true);
      setCursor(nextCursor);
      setStarted(true);
    }
  };

  const joinD = () => {
    setDJoinSlot(cursor - 1); // joined after the slot we just finished
    setDJoined(true);
    setShowJoinPrompt(false);
  };

  const reset = () => {
    setCursor(0); setStarted(false);
    setDJoined(false); setDJoinSlot(null); setShowJoinPrompt(false);
  };

  // Current slot = the one at index `cursor` (0-based, cursor = next to sing)
  const currentSlotIdx = cursor; // slot at this index is "now playing"

  // Find which round the cursor is in
  const currentRound = slots[cursor]?.round ?? (slots[slots.length - 1]?.round ?? 1);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <SectionTitle style={{ margin: 0 }}>🎙️ 公平輪唱排程</SectionTitle>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            {allMembers.length} 人 · {slots.length} 首 · {rounds.length} 輪
          </div>
        </div>
        <button onClick={() => { setUseDemo(!useDemo); reset(); }} style={{
          fontSize: 11, color: useDemo ? "#818cf8" : "#64748b",
          background: useDemo ? "rgba(129,140,248,0.1)" : "rgba(255,255,255,0.04)",
          border: useDemo ? "1px solid #818cf833" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8, padding: "4px 10px", cursor: "pointer"
        }}>{useDemo ? "BDD 演示模式" : "實際聚會"}</button>
      </div>

      {/* BDD scenario explanation */}
      {useDemo && (
        <div style={{
          background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.2)",
          borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 12, color: "#94a3b8", lineHeight: 1.7
        }}>
          <strong style={{ color: "#818cf8" }}>場景驗證：</strong>
          A/B/C 各 5 首歌，順序應為 A1→B1→C1→A2→B2→C2…<br/>
          進行到 B2（第 5 首）時，<strong style={{ color: "#fbbf24" }}>D 加入</strong>，應排在 C2 之後開啟新輪。
        </div>
      )}

      {/* D join prompt */}
      {showJoinPrompt && (
        <div style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(232,121,249,0.08))",
          border: "1px solid rgba(251,191,36,0.35)", borderRadius: 14,
          padding: 16, marginBottom: 16, animation: "slideIn 0.25s ease"
        }}>
          <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div style={{ fontWeight: 800, color: "#fbbf24", fontSize: 14, marginBottom: 6 }}>
            🎵 新成員 D 想加入！
          </div>
          <div style={{ fontSize: 12, color: "#92400e", marginBottom: 12, lineHeight: 1.5 }}>
            現在是第 2 輪 B2。讓 D 在 <strong>C2 結束後</strong>從下一輪插入？
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={joinD} style={{
              flex: 1, background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              border: "none", borderRadius: 8, padding: "9px", color: "#1c1917",
              cursor: "pointer", fontSize: 13, fontWeight: 800
            }}>✓ 允許加入</button>
            <button onClick={() => setShowJoinPrompt(false)} style={{
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "9px", color: "#64748b", cursor: "pointer", fontSize: 13
            }}>稍後再說</button>
          </div>
        </div>
      )}

      {/* Rounds */}
      {rounds.map(r => {
        const isCurrentRound = r.slots.some(s => s.slotIdx === currentSlotIdx);
        const isPastRound = r.slots.every(s => s.slotIdx < currentSlotIdx);
        const isLateRound = r.slots.some(s => s.isLateJoin);
        return (
          <div key={r.round} style={{ marginBottom: 20 }}>
            {/* Round header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
                color: isPastRound ? "#374151" : isCurrentRound ? "#e879f9" : "#64748b",
                background: isPastRound ? "rgba(255,255,255,0.03)" : isCurrentRound ? "rgba(232,121,249,0.12)" : "rgba(255,255,255,0.04)",
                border: isCurrentRound ? "1px solid rgba(232,121,249,0.3)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20, padding: "3px 12px"
              }}>第 {r.round} 輪</div>
              {isLateRound && (
                <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid #fbbf2430", borderRadius: 20, padding: "2px 10px" }}>
                  ＋ 新成員插入
                </span>
              )}
              {isPastRound && <span style={{ fontSize: 10, color: "#374151" }}>✓ 完成</span>}
            </div>

            {r.slots.map((slot) => {
              const m = getMember(slot.participantId);
              const song = getSong(slot.songId);
              const isCurrent = slot.slotIdx === currentSlotIdx && started;
              const isDone = slot.slotIdx < currentSlotIdx;
              const isUpcoming = slot.slotIdx > currentSlotIdx;

              return (
                <div key={slot.slotIdx} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: isCurrent
                    ? "rgba(232,121,249,0.12)"
                    : isDone ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)",
                  border: isCurrent
                    ? "1px solid rgba(232,121,249,0.45)"
                    : isDone ? "1px solid rgba(74,222,128,0.12)" : "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 5,
                  opacity: isDone ? 0.5 : 1, transition: "all 0.25s",
                  boxShadow: isCurrent ? "0 0 12px rgba(232,121,249,0.15)" : "none"
                }}>
                  {/* Slot position badge */}
                  <div style={{
                    fontSize: 10, fontWeight: 800, minWidth: 24, textAlign: "center",
                    color: isCurrent ? "#e879f9" : isDone ? "#374151" : "#475569"
                  }}>
                    {String(slot.slotIdx + 1).padStart(2, "0")}
                  </div>

                  <div style={{ fontSize: 18, flexShrink: 0 }}>{m?.avatar ?? "🎤"}</div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: isCurrent ? "#f1f5f9" : isDone ? "#4b5563" : "#94a3b8", fontSize: 14 }}>
                        {m?.name ?? slot.participantId}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: isCurrent ? "#818cf8" : isDone ? "#374151" : "#475569"
                      }}>
                        {m?.id}{r.slots.filter(s => s.participantId === slot.participantId && s.slotIdx <= slot.slotIdx).length}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: isDone ? "#374151" : "#64748b", marginTop: 2 }}>
                      🎵 {song?.title ?? `Song ${slot.songId}`}
                      <span style={{ marginLeft: 6, fontSize: 11, color: "#374151" }}>{song?.artist}</span>
                    </div>
                  </div>

                  {isCurrent && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e879f9", display: "inline-block", animation: "pulse 1s infinite" }} />
                      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
                      <span style={{ fontSize: 11, color: "#e879f9", fontWeight: 800 }}>唱歌中</span>
                    </div>
                  )}
                  {isDone && <span style={{ fontSize: 13, color: "#4ade80" }}>✓</span>}
                  {slot.isLateJoin && !isDone && !isCurrent && (
                    <span style={{ fontSize: 10, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid #fbbf2430", borderRadius: 10, padding: "2px 8px" }}>新</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginTop: 4, marginBottom: 20 }}>
        <ActionButton onClick={advance} disabled={cursor >= slots.length}>
          {!started ? "▶ 開始輪唱"
            : cursor >= slots.length ? "🎉 全部完成！"
            : `▶ 下一首（${cursor + 1}/${slots.length}）`}
        </ActionButton>
        {started && (
          <button onClick={reset} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "12px 16px", color: "#64748b", cursor: "pointer", fontSize: 13,
            flexShrink: 0
          }}>重置</button>
        )}
      </div>

      {/* Algorithm explainer */}
      <div style={{
        background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.15)",
        borderRadius: 12, padding: 14, fontSize: 12, color: "#64748b", lineHeight: 1.7
      }}>
        <div style={{ fontWeight: 700, color: "#818cf8", marginBottom: 6 }}>⚙️ 排程邏輯</div>
        <div>每輪從每位成員各取一首，形成 <code style={{ color: "#a5b4fc", background: "rgba(129,140,248,0.1)", padding: "1px 6px", borderRadius: 4 }}>A1→B1→C1→A2→B2…</code> 的交錯順序。</div>
        <div style={{ marginTop: 4 }}>中途加入者在<strong style={{ color: "#fbbf24" }}>當前輪次結束後</strong>插入下一輪首位，確保不打斷進行中的輪次。</div>
      </div>
    </div>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function SectionTitle({ children, style }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em",
      textTransform: "uppercase", marginBottom: 10, ...style
    }}>{children}</div>
  );
}

function ActionButton({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, width: "100%",
      background: disabled ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #e879f9, #818cf8)",
      border: "none", borderRadius: 10, padding: "13px", color: disabled ? "#475569" : "#fff",
      cursor: disabled ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700,
      transition: "opacity 0.2s", fontFamily: "'Noto Sans TC', sans-serif"
    }}>{children}</button>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "invite", label: "邀請函", icon: "📨" },
  { id: "join", label: "報名", icon: "👥" },
  { id: "venue", label: "店家", icon: "🏪" },
  { id: "rotation", label: "輪唱", icon: "🎙️" },
];

export default function KMeet() {
  const [tab, setTab] = useState("rotation"); // default to rotation tab for BDD demo
  const [venue, setVenue] = useState(VENUES[3]); // 錢櫃 SOGO 店
  const [hostSongs, setHostSongs] = useState([11, 7, 8, 9, 13]); // 告白氣球, 晴天, 青花瓷, 愛你, 好不容易
  const [backupSongs, setBackupSongs] = useState([15, 3]); // 紅蓮華, 夜に駆ける as backups
  const [participants, setParticipants] = useState(INITIAL_PARTICIPANTS);
  // venueScores: { [venueId_songId]: score override (0-100) }
  const [venueScores, setVenueScores] = useState({});

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c1a 0%, #0d1117 50%, #0c1220 100%)",
      fontFamily: "'Noto Sans TC', 'Segoe UI', sans-serif",
      color: "#f1f5f9",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "0 0 80px 0"
    }}>
      {/* Background grain */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        pointerEvents: "none", zIndex: 0
      }} />

      <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{
          padding: "32px 24px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "linear-gradient(135deg, #e879f9, #818cf8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
              boxShadow: "0 0 20px rgba(232,121,249,0.3)"
            }}>🎤</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: "-0.02em", lineHeight: 1 }}>K-Meet</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>KTV 社交聚會平台 · v0.2.0</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <div style={{ fontSize: 11, color: "#4ade80" }}>
                ● {participants.filter(p => p.joined === "confirmed").length} 已確認
              </div>
              <div style={{ fontSize: 11, color: "#facc15" }}>
                ● {participants.filter(p => p.joined === "pending").length} 待審核
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{
          display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)",
          position: "sticky", top: 0, background: "rgba(13,17,23,0.95)",
          backdropFilter: "blur(12px)", zIndex: 10
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, border: "none", background: "transparent",
              padding: "14px 4px", cursor: "pointer",
              borderBottom: tab === t.id ? "2px solid #e879f9" : "2px solid transparent",
              color: tab === t.id ? "#e879f9" : "#475569",
              fontSize: 12, fontWeight: 700, fontFamily: "'Noto Sans TC', sans-serif",
              transition: "all 0.15s", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3
            }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "20px 20px 0" }}>
          {tab === "invite" && (
            <TabInvitation venue={venue} setVenue={setVenue} hostSongs={hostSongs} setHostSongs={setHostSongs} backupSongs={backupSongs} setBackupSongs={setBackupSongs} />
          )}
          {tab === "join" && (
            <TabParticipation participants={participants} setParticipants={setParticipants} hostSongs={hostSongs} />
          )}
          {tab === "venue" && (
            <TabVenueSync participants={participants} hostSongs={hostSongs} backupSongs={backupSongs} venueScores={venueScores} setVenueScores={setVenueScores} defaultVenue={venue} />
          )}
          {tab === "rotation" && (
            <TabFairRotation participants={participants} />
          )}
        </div>
      </div>
    </div>
  );
}
