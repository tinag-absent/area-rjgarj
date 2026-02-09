// Map Incident Data
window.MapData = {
  incidents: [
    {
      id: 'inc-001',
      name: '東京湾次元歪曲事案',
      severity: 'critical',
      position: { x: 65, y: 45 }, // Percentage from top-left
      location: '東京湾沿岸部',
      status: '対応中',
      entity: 'E-002 (波喰い) 複数体確認',
      gsi: '12.4%',
      assignedDivision: '収束部門 第1班',
      description: '東京湾沿岸で大規模な次元境界の歪みを検知。複数の波喰いが出現し、付近の海蝕現象を捕食中。',
      timestamp: '2026-02-06 08:30'
    },
    {
      id: 'inc-002',
      name: '横浜港不根侵入事案',
      severity: 'warning',
      position: { x: 68, y: 48 },
      location: '横浜港周辺',
      status: '監視中',
      entity: '不根（未登録船舶）',
      gsi: '4.2%',
      assignedDivision: '港湾部門',
      description: '未認可の不根が横浜港に接近中。外事部門が交渉を試みている。',
      timestamp: '2026-02-06 10:15'
    },
    {
      id: 'inc-003',
      name: '富士山麓時空歪曲',
      severity: 'critical',
      position: { x: 60, y: 52 },
      location: '富士山西麓',
      status: '対応中',
      entity: 'E-004 (時間遅延帯)',
      gsi: '8.7%',
      assignedDivision: '収束部門 第2班',
      description: '富士山西麓で時間遅延帯が発生。半径500m以内の時間流が通常の1/50に減速。',
      timestamp: '2026-02-06 06:00'
    },
    {
      id: 'inc-004',
      name: '新潟沖境界ゲート',
      severity: 'warning',
      position: { x: 55, y: 35 },
      location: '新潟沖150km',
      status: '監視中',
      entity: 'なし（自然発生）',
      gsi: '5.1%',
      assignedDivision: '港湾部門',
      description: '新潟沖に境界ゲートが自然発生。現時点で実体の侵入は確認されていない。',
      timestamp: '2026-02-06 11:00'
    },
    {
      id: 'inc-005',
      name: '名古屋市内認識異常',
      severity: 'warning',
      position: { x: 58, y: 55 },
      location: '名古屋市中心部',
      status: '対応中',
      entity: 'E-003 (鏡面侵食体) 疑い',
      gsi: '3.8%',
      assignedDivision: '支援部門・外事部門',
      description: '市民複数名が「知らない人物が自分のふりをしている」と通報。鏡面侵食体の可能性。',
      timestamp: '2026-02-06 09:45'
    },
    {
      id: 'inc-006',
      name: '大阪湾残滓回収作業',
      severity: 'safe',
      position: { x: 52, y: 58 },
      location: '大阪湾',
      status: '収束済み',
      entity: 'なし',
      gsi: '0.8%',
      assignedDivision: '工作部門',
      description: '昨日の海蝕現象収束後、残滓の回収作業を実施中。特に問題なし。',
      timestamp: '2026-02-05 18:30'
    },
    {
      id: 'inc-007',
      name: '札幌市郊外漂流者発見',
      severity: 'safe',
      position: { x: 65, y: 15 },
      location: '札幌市郊外',
      status: '対話中',
      entity: 'E-001 (漂流者)',
      gsi: '1.2%',
      assignedDivision: '外事部門',
      description: '迷い込んだ漂流者を発見。友好的で、元の次元への帰還を希望している。',
      timestamp: '2026-02-06 07:20'
    },
    {
      id: 'inc-008',
      name: '福岡次元境界監視',
      severity: 'warning',
      position: { x: 35, y: 65 },
      location: '福岡市沿岸',
      status: '監視中',
      entity: 'なし',
      gsi: '6.3%',
      assignedDivision: '港湾部門',
      description: '境界ゲートの安定性が低下。24時間監視体制を敷いている。',
      timestamp: '2026-02-06 05:00'
    },
    {
      id: 'inc-009',
      name: '仙台市街地空間歪み',
      severity: 'critical',
      position: { x: 68, y: 32 },
      location: '仙台市中心部',
      status: '対応中',
      entity: '[機密]',
      gsi: '15.2%',
      assignedDivision: '収束部門 全班',
      description: '[LEVEL 4以上] 概念捕食者の出現が疑われる。付近住民の記憶に異常な欠損が確認されている。',
      timestamp: '2026-02-06 04:00'
    },
    {
      id: 'inc-010',
      name: '沖縄海域不根商人',
      severity: 'safe',
      position: { x: 30, y: 80 },
      location: '沖縄本島南方海域',
      status: '取引完了',
      entity: 'E-006 (不根の行商人)',
      gsi: '0.5%',
      assignedDivision: '外事部門',
      description: '定期的に訪れる不根の行商人と物資交換を実施。特に問題なし。',
      timestamp: '2026-02-06 12:00'
    }
  ],

  getIncidentsBySeverity(severity) {
    return this.incidents.filter(i => i.severity === severity);
  },

  getIncidentById(id) {
    return this.incidents.find(i => i.id === id);
  },

  getStatistics() {
    return {
      total: this.incidents.length,
      critical: this.getIncidentsBySeverity('critical').length,
      warning: this.getIncidentsBySeverity('warning').length,
      safe: this.getIncidentsBySeverity('safe').length
    };
  }
};
