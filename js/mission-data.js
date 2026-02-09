// Mission Database
window.MissionData = {
  missions: [
    {
      id: 'MISSION-2026-001',
      title: '東京湾次元歪曲事案',
      status: 'active',
      priority: 'critical',
      location: '東京湾沿岸部',
      coordinates: '35.6236°N, 139.7815°E',
      startDate: '2026-02-06 08:30',
      endDate: null,
      assignedDivisions: ['収束部門 第1班', '支援部門'],
      entity: 'E-002 (波喰い) 複数体確認',
      gsi: 12.4,
      description: '東京湾沿岸で大規模な次元境界の歪みを検知。複数の波喰いが出現し、付近の海蝕現象を捕食中。',
      
      timeline: [
        { time: '2026-02-06 08:30', event: '異常検知 - 自動警報発令', type: 'alert' },
        { time: '2026-02-06 08:45', event: '収束部門 第1班出動', type: 'deployment' },
        { time: '2026-02-06 09:20', event: '波喰い3体確認', type: 'discovery' },
        { time: '2026-02-06 10:00', event: 'M-001-α 空間安定化フィールド展開', type: 'action' },
        { time: '2026-02-06 10:30', event: 'M-003-γ 実体無力化パルス使用 - 2体消滅', type: 'action' },
        { time: '2026-02-06 11:15', event: '残り1体追跡中', type: 'ongoing' }
      ],
      
      modules: ['M-001-α', 'M-003-γ', 'M-008-θ'],
      casualties: 0,
      civilianEvacuation: 50,
      
      reports: [
        {
          time: '2026-02-06 09:00',
          author: '機関員 K-042-118',
          content: '現場到着。GSI値が急上昇しています。視界不良、次元の歪みによる光学異常を確認。'
        },
        {
          time: '2026-02-06 10:45',
          author: '機関員 K-015-203',
          content: '実体無力化パルス成功。ただし周辺の電子機器に甚大な被害。復旧に時間を要します。'
        }
      ],
      
      notes: '残り1体の波喰いは東京湾深部に逃走。追跡には潜水装備が必要。支援部門にドローン支援を要請済み。',
      securityLevel: 2
    },
    
    {
      id: 'MISSION-2026-002',
      title: '横浜港不根侵入事案',
      status: 'monitoring',
      priority: 'warning',
      location: '横浜港周辺',
      coordinates: '35.4437°N, 139.6380°E',
      startDate: '2026-02-06 10:15',
      endDate: null,
      assignedDivisions: ['港湾部門', '外事部門'],
      entity: '不根（未登録船舶）',
      gsi: 4.2,
      description: '未認可の不根が横浜港に接近中。外事部門が交渉を試みている。',
      
      timeline: [
        { time: '2026-02-06 10:15', event: '未認可不根検知', type: 'alert' },
        { time: '2026-02-06 10:30', event: '港湾部門・外事部門合同対応開始', type: 'deployment' },
        { time: '2026-02-06 11:00', event: '交渉チーム接触成功', type: 'action' },
        { time: '2026-02-06 11:30', event: '不根側の要求確認中', type: 'ongoing' }
      ],
      
      modules: ['M-002-β', 'M-006-ζ'],
      casualties: 0,
      civilianEvacuation: 0,
      
      reports: [
        {
          time: '2026-02-06 10:45',
          author: '機関員 K-088-091 (外事部門)',
          content: '不根の行商人と思われます。ただし、通常のルートとは異なる航路で接近。警戒が必要です。'
        }
      ],
      
      notes: '友好的な対応を継続中。ただし予期せぬ事態に備え、次元境界封鎖モジュールを待機させている。',
      securityLevel: 1
    },
    
    {
      id: 'MISSION-2026-003',
      title: '富士山麓時空歪曲収束作戦',
      status: 'active',
      priority: 'critical',
      location: '富士山西麓',
      coordinates: '35.3606°N, 138.7274°E',
      startDate: '2026-02-06 06:00',
      endDate: null,
      assignedDivisions: ['収束部門 第2班', '工作部門'],
      entity: 'E-004 (時間遅延帯)',
      gsi: 8.7,
      description: '富士山西麓で時間遅延帯が発生。半径500m以内の時間流が通常の1/50に減速。',
      
      timeline: [
        { time: '2026-02-06 06:00', event: '登山者からの異常報告', type: 'alert' },
        { time: '2026-02-06 06:30', event: '収束部門出動 - 時間遅延帯確認', type: 'deployment' },
        { time: '2026-02-06 08:00', event: 'M-004-δ 時空間歪曲装置搬入', type: 'preparation' },
        { time: '2026-02-06 09:30', event: '装置起動 - 時間流の調整開始', type: 'action' },
        { time: '2026-02-06 11:00', event: '時間流が通常の1/10まで回復', type: 'ongoing' }
      ],
      
      modules: ['M-004-δ', 'M-001-α', 'M-008-θ'],
      casualties: 0,
      civilianEvacuation: 15,
      
      reports: [
        {
          time: '2026-02-06 07:00',
          author: '機関員 K-023-156',
          content: '時間遅延帯内部に取り残された登山者3名を確認。救出には特殊装備が必要です。'
        },
        {
          time: '2026-02-06 10:00',
          author: '機関員 K-067-234 (工作部門)',
          content: '時空間歪曲装置の調整に成功。ただし完全収束には推定12時間が必要。'
        }
      ],
      
      notes: '装置の長時間使用により、機関員に時間感覚喪失症の兆候。1時間ごとのローテーション体制を導入。',
      securityLevel: 3
    },
    
    {
      id: 'MISSION-2026-004',
      title: '新潟沖境界ゲート監視任務',
      status: 'monitoring',
      priority: 'warning',
      location: '新潟沖150km',
      coordinates: '37.9161°N, 139.0364°E',
      startDate: '2026-02-06 05:00',
      endDate: null,
      assignedDivisions: ['港湾部門'],
      entity: 'なし（自然発生）',
      gsi: 5.1,
      description: '新潟沖に境界ゲートが自然発生。現時点で実体の侵入は確認されていない。',
      
      timeline: [
        { time: '2026-02-06 05:00', event: '境界ゲート自然発生を検知', type: 'alert' },
        { time: '2026-02-06 05:30', event: '港湾部門監視船出動', type: 'deployment' },
        { time: '2026-02-06 08:00', event: '24時間監視体制確立', type: 'action' },
        { time: '2026-02-06 11:00', event: 'ゲート安定性低下の兆候', type: 'ongoing' }
      ],
      
      modules: ['M-002-β (待機)', 'M-001-α'],
      casualties: 0,
      civilianEvacuation: 0,
      
      reports: [
        {
          time: '2026-02-06 09:30',
          author: '機関員 K-102-045 (港湾部門)',
          content: 'ゲートの開閉周期を観測中。周期は約2時間。次の開放時に実体侵入のリスクあり。'
        }
      ],
      
      notes: '自然発生ゲートは通常48時間以内に自然閉鎖する。ただし予断を許さない状況。',
      securityLevel: 1
    },
    
    {
      id: 'MISSION-2026-005',
      title: '名古屋市内鏡面侵食体捜索',
      status: 'active',
      priority: 'warning',
      location: '名古屋市中心部',
      coordinates: '35.1815°N, 136.9066°E',
      startDate: '2026-02-06 09:45',
      endDate: null,
      assignedDivisions: ['支援部門', '外事部門'],
      entity: 'E-003 (鏡面侵食体) 疑い',
      gsi: 3.8,
      description: '市民複数名が「知らない人物が自分のふりをしている」と通報。鏡面侵食体の可能性。',
      
      timeline: [
        { time: '2026-02-06 09:45', event: '市民からの通報', type: 'alert' },
        { time: '2026-02-06 10:00', event: '外事部門・支援部門出動', type: 'deployment' },
        { time: '2026-02-06 10:30', event: '次元共鳴パターン検査開始', type: 'action' },
        { time: '2026-02-06 11:00', event: '容疑者3名を特定', type: 'discovery' },
        { time: '2026-02-06 11:45', event: '隔離施設への移送準備中', type: 'ongoing' }
      ],
      
      modules: ['M-006-ζ', 'M-008-θ'],
      casualties: 0,
      civilianEvacuation: 0,
      
      reports: [
        {
          time: '2026-02-06 10:45',
          author: '機関員 K-055-178 (支援部門)',
          content: '3名中2名から微細な次元共鳴パターンの異常を検知。鏡面侵食体の可能性が高い。'
        }
      ],
      
      notes: '市民への記憶操作が必要。外事部門がカバーストーリーを準備中。',
      securityLevel: 2
    },
    
    {
      id: 'MISSION-2025-347',
      title: '大阪湾海蝕現象収束作戦',
      status: 'completed',
      priority: 'warning',
      location: '大阪湾',
      coordinates: '34.6198°N, 135.4305°E',
      startDate: '2026-02-05 14:00',
      endDate: '2026-02-05 18:30',
      assignedDivisions: ['収束部門 第3班', '工作部門'],
      entity: 'E-001 (漂流者) 3体',
      gsi: 0.8,
      description: '大阪湾で発生した海蝕現象。漂流者3体が迷い込んだが、友好的に対話し帰還を支援。',
      
      timeline: [
        { time: '2026-02-05 14:00', event: '海蝕現象検知', type: 'alert' },
        { time: '2026-02-05 14:30', event: '収束部門出動', type: 'deployment' },
        { time: '2026-02-05 15:00', event: '漂流者3体確認 - 友好的', type: 'discovery' },
        { time: '2026-02-05 16:00', event: '外事部門による対話開始', type: 'action' },
        { time: '2026-02-05 17:00', event: '元の次元への帰還支援', type: 'action' },
        { time: '2026-02-05 17:45', event: '3体すべて帰還完了', type: 'success' },
        { time: '2026-02-05 18:30', event: '残滓回収完了 - 任務終了', type: 'completed' }
      ],
      
      modules: ['M-001-α', 'M-005-ε'],
      casualties: 0,
      civilianEvacuation: 0,
      
      reports: [
        {
          time: '2026-02-05 16:30',
          author: '機関員 K-091-012',
          content: '漂流者たちは協力的。元の次元の座標情報を提供してくれました。'
        },
        {
          time: '2026-02-05 18:00',
          author: '機関員 K-034-087 (工作部門)',
          content: '残滓の回収完了。高品質のエネルギー結晶を入手。モジュール開発に使用可能。'
        }
      ],
      
      result: '任務完了。漂流者の帰還支援に成功し、良好な関係を築けた。回収した残滓は研究用途に活用予定。',
      notes: '友好的な異次元生命体との初接触事例として記録。',
      securityLevel: 1
    },
    
    {
      id: 'MISSION-2026-006',
      title: '札幌市郊外漂流者帰還支援',
      status: 'active',
      priority: 'safe',
      location: '札幌市郊外',
      coordinates: '43.0642°N, 141.3469°E',
      startDate: '2026-02-06 07:20',
      endDate: null,
      assignedDivisions: ['外事部門'],
      entity: 'E-001 (漂流者)',
      gsi: 1.2,
      description: '迷い込んだ漂流者を発見。友好的で、元の次元への帰還を希望している。',
      
      timeline: [
        { time: '2026-02-06 07:20', event: '漂流者発見', type: 'discovery' },
        { time: '2026-02-06 07:45', event: '外事部門接触', type: 'deployment' },
        { time: '2026-02-06 08:30', event: '対話により帰還希望を確認', type: 'action' },
        { time: '2026-02-06 10:00', event: '次元座標の特定作業中', type: 'ongoing' }
      ],
      
      modules: ['M-001-α'],
      casualties: 0,
      civilianEvacuation: 0,
      
      reports: [
        {
          time: '2026-02-06 09:00',
          author: '機関員 K-078-134 (外事部門)',
          content: '漂流者は非常に協力的。次元座標のデータを提供してくれています。帰還は今日中に可能と思われます。'
        }
      ],
      
      notes: '過去の大阪湾事案の経験が活きている。スムーズな対応が可能。',
      securityLevel: 1
    },
    
    {
      id: 'MISSION-2026-007',
      title: '福岡次元境界安定化作業',
      status: 'monitoring',
      priority: 'warning',
      location: '福岡市沿岸',
      coordinates: '33.5904°N, 130.4017°E',
      startDate: '2026-02-06 05:00',
      endDate: null,
      assignedDivisions: ['港湾部門'],
      entity: 'なし',
      gsi: 6.3,
      description: '境界ゲートの安定性が低下。24時間監視体制を敷いている。',
      
      timeline: [
        { time: '2026-02-06 05:00', event: '境界安定性低下を検知', type: 'alert' },
        { time: '2026-02-06 05:30', event: '港湾部門24時間監視開始', type: 'deployment' },
        { time: '2026-02-06 09:00', event: 'M-001-α 予防的展開', type: 'action' },
        { time: '2026-02-06 11:30', event: '安定性わずかに回復', type: 'ongoing' }
      ],
      
      modules: ['M-001-α', 'M-002-β (待機)'],
      casualties: 0,
      civilianEvacuation: 0,
      
      reports: [
        {
          time: '2026-02-06 08:00',
          author: '機関員 K-112-098 (港湾部門)',
          content: 'GSI値は高いが、現時点で実体侵入の兆候なし。予防的措置を継続します。'
        }
      ],
      
      notes: '定期的にGSI値のスパイクが発生。パターンを解析中。',
      securityLevel: 1
    },
    
    {
      id: 'MISSION-2026-008',
      title: '仙台市街地概念侵食対応',
      status: 'active',
      priority: 'critical',
      location: '仙台市中心部',
      coordinates: '38.2682°N, 140.8694°E',
      startDate: '2026-02-06 04:00',
      endDate: null,
      assignedDivisions: ['収束部門 全班', '外事部門', '支援部門'],
      entity: '[LEVEL 4以上機密]',
      gsi: 15.2,
      description: '[機密情報] 概念捕食者の出現が疑われる。付近住民の記憶に異常な欠損が確認されている。',
      
      timeline: [
        { time: '2026-02-06 04:00', event: '[機密] 異常検知', type: 'alert' },
        { time: '2026-02-06 04:30', event: '[機密] 全部門緊急招集', type: 'deployment' },
        { time: '2026-02-06 06:00', event: '[機密] 概念捕食者と推定', type: 'discovery' },
        { time: '2026-02-06 08:00', event: '[機密] 隔離エリア設定', type: 'action' },
        { time: '2026-02-06 11:00', event: '[機密] 対応継続中', type: 'ongoing' }
      ],
      
      modules: ['[機密]'],
      casualties: 0,
      civilianEvacuation: 3200,
      
      reports: [
        {
          time: '2026-02-06 07:00',
          author: '[LEVEL 4以上]',
          content: '[データ削除済]'
        }
      ],
      
      notes: 'LEVEL 4以上の権限が必要。この案件の詳細は高度に機密化されています。',
      securityLevel: 4
    },
    
    {
      id: 'MISSION-2026-009',
      title: '沖縄海域不根商人対応',
      status: 'completed',
      priority: 'safe',
      location: '沖縄本島南方海域',
      coordinates: '26.2124°N, 127.6809°E',
      startDate: '2026-02-06 10:00',
      endDate: '2026-02-06 12:00',
      assignedDivisions: ['外事部門'],
      entity: 'E-006 (不根の行商人)',
      gsi: 0.5,
      description: '定期的に訪れる不根の行商人と物資交換を実施。',
      
      timeline: [
        { time: '2026-02-06 10:00', event: '不根接近を確認', type: 'alert' },
        { time: '2026-02-06 10:30', event: '外事部門接触', type: 'deployment' },
        { time: '2026-02-06 11:00', event: '物資交換開始', type: 'action' },
        { time: '2026-02-06 11:45', event: '交換完了', type: 'success' },
        { time: '2026-02-06 12:00', event: '不根出航 - 任務完了', type: 'completed' }
      ],
      
      modules: [],
      casualties: 0,
      civilianEvacuation: 0,
      
      reports: [
        {
          time: '2026-02-06 11:30',
          author: '機関員 K-099-145 (外事部門)',
          content: '今回も良好な取引。次元間の珍しい資材と情報を入手しました。次回訪問は約1ヶ月後の予定。'
        }
      ],
      
      result: '任務完了。定期交易ルートの維持に成功。貴重な次元間資材を獲得。',
      notes: '友好的な関係を継続中。重要な情報源として価値が高い。',
      securityLevel: 1
    }
  ],

  searchMissions(filters) {
    let results = this.missions;

    if (filters.status && filters.status !== 'all') {
      results = results.filter(m => m.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      results = results.filter(m => m.priority === filters.priority);
    }

    if (filters.searchText) {
      const text = filters.searchText.toLowerCase();
      results = results.filter(m => 
        m.title.toLowerCase().includes(text) ||
        m.location.toLowerCase().includes(text) ||
        m.id.toLowerCase().includes(text) ||
        m.description.toLowerCase().includes(text)
      );
    }

    if (filters.division) {
      results = results.filter(m =>
        m.assignedDivisions.some(d => d.includes(filters.division))
      );
    }

    return results;
  },

  getMissionById(id) {
    return this.missions.find(m => m.id === id);
  },

  getStatistics() {
    return {
      total: this.missions.length,
      active: this.missions.filter(m => m.status === 'active').length,
      monitoring: this.missions.filter(m => m.status === 'monitoring').length,
      completed: this.missions.filter(m => m.status === 'completed').length,
      critical: this.missions.filter(m => m.priority === 'critical').length
    };
  }
};
