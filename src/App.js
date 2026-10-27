import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Lock,
  Settings,
  Trash2,
  Plus,
  X,
  ListPlus,
  Clock,
  Edit2,
  KeyRound,
  Calendar as CalendarIcon,
  Zap,
  Copy,
  Moon,
  Sun,
  Target,
  Trophy,
  ArrowUp,
  ArrowDown,
  Award,
  Sparkles,
  UserPlus,
  EyeOff,
  Bell,
  Download,
  CheckCircle,
  MessageCircle,
  Send,
  Search,
  FileText,
  AlertTriangle,
  Activity,
  LogOut
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';

// ============================================================================
// 1. Firebase 初期化 (既存の duofit プロジェクト・DB設定をそのまま継承)
// ============================================================================
let app, auth, db;
const appId = 'skillmap-pro-app'; // 既存の筋トレアプリ(withfit-app)と完全に分離された専用DB名前空間
const FIREBASE_PROJECT_ID = "duofit-app-75cb2";
const APP_VERSION = "SkillMap Pro v2.0.0";

try {
  const firebaseConfig = {
    apiKey: "AIzaSyDQTfLhyuc8PEoMtw-FvEq4k9HShRJz_io",
    authDomain: "duofit-app-75cb2.firebaseapp.com",
    projectId: "duofit-app-75cb2",
    storageBucket: "duofit-app-75cb2.firebasestorage.app",
    messagingSenderId: "949622687026",
    appId: "1:949622687026:web:bcc53a734a31fc1a2a432b",
    measurementId: "G-73S4GC5XQY"
  };
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Offline persistence notice:", err.code);
    });
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Firestore ドキュメントID プレフィックス (既存の duofit データと衝突せず安全に共存)
const PREFIX_MEMBER = 'sm_mem_';
const PREFIX_SKILL = 'sm_skl_';
const PREFIX_PERIOD = 'sm_prd_';
const PREFIX_EVAL = 'sm_evl_';
const PREFIX_BACKUP = 'sm_bkp_';
const CONFIG_DOC_ID = 'sm_system_config';

// ============================================================================
// 2. 定数・評価基準・初期マスターデータ
// ============================================================================
const LEVEL_DEFINITIONS = [
  {
    level: 1,
    short: 'Lv.1 基礎・学習中',
    label: 'Lv.1 知識習得・補助作業',
    desc: 'マニュアルや先輩の指示・サポートがあれば作業できる段階',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    cell: 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    colorHex: '#64748b'
  },
  {
    level: 2,
    short: 'Lv.2 指導下で遂行',
    label: 'Lv.2 条件付き自立遂行',
    desc: '定型業務は1人でこなせるが、非定型や難度の高い場面では確認が必要',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-800',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    cell: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800/80',
    colorHex: '#0ea5e9'
  },
  {
    level: 3,
    short: 'Lv.3 独力で完遂',
    label: 'Lv.3 独力遂行（一人前基準）',
    desc: '通常業務から応用対応まで、誰の助けも借りず独力で確実に完遂できる',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    cell: 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    colorHex: '#10b981'
  },
  {
    level: 4,
    short: 'Lv.4 指導・改善',
    label: 'Lv.4 他者への指導・業務改善',
    desc: '高い専門性を持ち、後輩へのOJT指導や業務プロセスの改善・標準化ができる',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-800',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
    cell: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700',
    colorHex: '#6366f1'
  },
  {
    level: 5,
    short: 'Lv.5 熟練・変革',
    label: 'Lv.5 エキスパート・組織牽引',
    desc: '組織の第一人者として高度な課題解決や全体戦略・仕組みづくりを主導できる',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    cell: 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-900 dark:from-amber-900/70 dark:to-orange-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-sm',
    colorHex: '#f59e0b'
  }
];

const DEFAULT_CATEGORIES = [
  '専門技術・実務',
  '品質・安全・管理',
  '問題解決・改善',
  'チームワーク・連携',
  'リーダーシップ・育成'
];

const CATEGORY_STYLES = {
  '専門技術・実務': {
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80',
    dot: 'bg-indigo-500',
    accent: '#6366f1'
  },
  '品質・安全・管理': {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80',
    dot: 'bg-emerald-500',
    accent: '#10b981'
  },
  '問題解決・改善': {
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800/80',
    dot: 'bg-sky-500',
    accent: '#0ea5e9'
  },
  'チームワーク・連携': {
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800/80',
    dot: 'bg-purple-500',
    accent: '#a855f7'
  },
  'リーダーシップ・育成': {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
    dot: 'bg-amber-500',
    accent: '#f59e0b'
  }
};

const getCategoryStyle = (cat) => {
  return CATEGORY_STYLES[cat] || {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
    accent: '#64748b'
  };
};

const MEMBER_STATUSES = [
  { value: 'active', label: '在籍（対象）', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { value: 'transferred', label: '異動', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { value: 'leave', label: '休職中', badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
  { value: 'retired', label: '退職', badge: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700' }
];

const INITIAL_PERIODS = [
  {
    id: `${PREFIX_PERIOD}2025_2H`,
    name: '2025年度 下期',
    code: '2025-2H',
    startDate: '2025-10-01',
    endDate: '2026-03-31',
    isCurrent: false,
    isLocked: true,
    order: 1
  },
  {
    id: `${PREFIX_PERIOD}2026_1H`,
    name: '2026年度 上期',
    code: '2026-1H',
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    isCurrent: false,
    isLocked: false,
    order: 2
  },
  {
    id: `${PREFIX_PERIOD}2026_2H`,
    name: '2026年度 下期',
    code: '2026-2H',
    startDate: '2026-10-01',
    endDate: '2027-03-31',
    isCurrent: true,
    isLocked: false,
    order: 3
  }
];

const INITIAL_SKILLS = [
  {
    id: `${PREFIX_SKILL}01`,
    category: '専門技術・実務',
    name: '基本業務遂行・標準作業',
    description: '担当領域の標準手順書（SOP）を理解し、正確・迅速に日常業務を遂行するスキル',
    requiredLevel: 3,
    order: 1,
    active: true
  },
  {
    id: `${PREFIX_SKILL}02`,
    category: '専門技術・実務',
    name: '専門機器・システム活用',
    description: '業務で使用するシステム・ツール・設備の特性を理解し、高度な機能や設定を使いこなす力',
    requiredLevel: 3,
    order: 2,
    active: true
  },
  {
    id: `${PREFIX_SKILL}03`,
    category: '専門技術・実務',
    name: 'トラブルシューティング・異常処置',
    description: 'イレギュラーや設備・業務トラブル発生時に、原因を特定し迅速に一次対応・復旧を行う力',
    requiredLevel: 3,
    order: 3,
    active: true
  },
  {
    id: `${PREFIX_SKILL}04`,
    category: '品質・安全・管理',
    name: '品質管理・ミス防止徹底',
    description: '品質基準を遵守し、ダブルチェックやポカヨケの仕組みを通じて手戻り・不具合ゼロを実現する力',
    requiredLevel: 3,
    order: 4,
    active: true
  },
  {
    id: `${PREFIX_SKILL}05`,
    category: '品質・安全・管理',
    name: '安全衛生・コンプライアンス遵守',
    description: '5S（整理・整頓・清掃・清潔・躾）や情報セキュリティ、安全ルールを徹底しリスクを未然に防ぐ力',
    requiredLevel: 3,
    order: 5,
    active: true
  },
  {
    id: `${PREFIX_SKILL}06`,
    category: '品質・安全・管理',
    name: '納期・スケジュール管理',
    description: '業務の優先順位を見極め、進捗遅れのリスクを早期に察知して納期通りに完遂する力',
    requiredLevel: 3,
    order: 6,
    active: true
  },
  {
    id: `${PREFIX_SKILL}07`,
    category: '問題解決・改善',
    name: '課題発見・業務効率化（カイゼン）',
    description: '現状のムリ・ムダ・ムラに気づき、具体的な改善提案や自動化・標準化を実行する力',
    requiredLevel: 3,
    order: 7,
    active: true
  },
  {
    id: `${PREFIX_SKILL}08`,
    category: '問題解決・改善',
    name: 'データ分析・論理的思考',
    description: '実績データや事実に基づいて根本原因を分析し、納得感のある対策を立案する力',
    requiredLevel: 3,
    order: 8,
    active: true
  },
  {
    id: `${PREFIX_SKILL}09`,
    category: 'チームワーク・連携',
    name: '報連相・ドキュメント共有',
    description: '正確かつ簡潔な報告・連絡・相談を行い、属人化を防ぐマニュアルや記録を残す力',
    requiredLevel: 3,
    order: 9,
    active: true
  },
  {
    id: `${PREFIX_SKILL}10`,
    category: 'チームワーク・連携',
    name: '他部署連携・顧客折衝',
    description: '関連部署や社内外の関係者と円滑に調整・交渉し、チーム全体の成果を最大化する力',
    requiredLevel: 3,
    order: 10,
    active: true
  },
  {
    id: `${PREFIX_SKILL}11`,
    category: 'リーダーシップ・育成',
    name: '後輩指導・OJTトレーナー',
    description: '新入社員や後輩メンバーの理解度に合わせて丁寧に指導し、戦力化を支援する力',
    requiredLevel: 3,
    order: 11,
    active: true
  },
  {
    id: `${PREFIX_SKILL}12`,
    category: 'リーダーシップ・育成',
    name: '目標管理・プロジェクト推進',
    description: 'グループ目標の達成に向けて計画を策定し、周囲を巻き込みながら推進・完遂する力',
    requiredLevel: 3,
    order: 12,
    active: true
  }
];

const INITIAL_MEMBERS = [
  {
    id: `${PREFIX_MEMBER}01`,
    name: '道辻 勇太',
    roleTitle: 'シニアリーダー',
    department: '第1グループ',
    grade: 'G3',
    status: 'active',
    pin: '',
    joinedDate: '2021-04',
    avatarColor: 'from-indigo-500 to-blue-600',
    order: 1
  },
  {
    id: `${PREFIX_MEMBER}02`,
    name: '佐藤 健一',
    roleTitle: 'サブリーダー',
    department: '第1グループ',
    grade: 'G3',
    status: 'active',
    pin: '',
    joinedDate: '2022-04',
    avatarColor: 'from-emerald-500 to-teal-600',
    order: 2
  },
  {
    id: `${PREFIX_MEMBER}03`,
    name: '鈴木 美咲',
    roleTitle: '中堅メンバー',
    department: '第1グループ',
    grade: 'G2',
    status: 'active',
    pin: '',
    joinedDate: '2023-04',
    avatarColor: 'from-purple-500 to-indigo-600',
    order: 3
  },
  {
    id: `${PREFIX_MEMBER}04`,
    name: '高橋 翔太',
    roleTitle: 'メンバー',
    department: '第1グループ',
    grade: 'G2',
    status: 'active',
    pin: '',
    joinedDate: '2024-04',
    avatarColor: 'from-sky-500 to-blue-600',
    order: 4
  },
  {
    id: `${PREFIX_MEMBER}05`,
    name: '田中 彩花',
    roleTitle: 'ジュニアメンバー',
    department: '第2グループ',
    grade: 'G1',
    status: 'active',
    pin: '',
    joinedDate: '2025-04',
    avatarColor: 'from-rose-500 to-pink-600',
    order: 5
  },
  {
    id: `${PREFIX_MEMBER}06`,
    name: '伊藤 大輔',
    roleTitle: 'スペシャリスト',
    department: '第2グループ',
    grade: 'G3',
    status: 'active',
    pin: '',
    joinedDate: '2020-10',
    avatarColor: 'from-amber-500 to-orange-600',
    order: 6
  }
];

// 初期デモ評価データの生成
function buildInitialEvaluations() {
  const evals = {};
  const presetScores = {
    [`${PREFIX_MEMBER}01`]: {
      '2025_2H': [4, 4, 3, 4, 4, 4, 3, 3, 4, 3, 3, 3],
      '2026_1H': [4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 3],
      '2026_2H': [5, 4, 4, 5, 5, 4, 4, 4, 5, 4, 4, 4]
    },
    [`${PREFIX_MEMBER}02`]: {
      '2025_2H': [3, 3, 3, 4, 4, 3, 3, 3, 3, 3, 2, 2],
      '2026_1H': [4, 3, 3, 4, 4, 4, 3, 3, 4, 3, 3, 3],
      '2026_2H': [4, 4, 4, 4, 4, 4, 4, 3, 4, 4, 3, 3]
    },
    [`${PREFIX_MEMBER}03`]: {
      '2025_2H': [3, 3, 2, 3, 3, 3, 2, 2, 3, 3, 2, 1],
      '2026_1H': [3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 2, 2],
      '2026_2H': [4, 4, 3, 4, 4, 4, 3, 3, 4, 4, 3, 2]
    },
    [`${PREFIX_MEMBER}04`]: {
      '2025_2H': [2, 2, 1, 2, 3, 2, 1, 1, 2, 2, 1, 1],
      '2026_1H': [3, 3, 2, 3, 3, 2, 2, 2, 3, 2, 1, 1],
      '2026_2H': [3, 3, 3, 3, 4, 3, 3, 2, 3, 3, 2, 2]
    },
    [`${PREFIX_MEMBER}05`]: {
      '2025_2H': [1, 1, 1, 2, 2, 1, 1, 1, 2, 1, 1, 1],
      '2026_1H': [2, 2, 1, 2, 3, 2, 2, 1, 2, 2, 1, 1],
      '2026_2H': [2, 3, 2, 3, 3, 2, 2, 2, 3, 2, 1, 1]
    },
    [`${PREFIX_MEMBER}06`]: {
      '2025_2H': [4, 4, 4, 3, 3, 3, 4, 4, 3, 3, 3, 3],
      '2026_1H': [5, 5, 4, 4, 4, 3, 4, 4, 3, 3, 3, 3],
      '2026_2H': [5, 5, 5, 4, 4, 4, 5, 5, 4, 3, 4, 3]
    }
  };

  Object.entries(presetScores).forEach(([memId, periodMap]) => {
    Object.entries(periodMap).forEach(([pSuffix, arr]) => {
      const periodId = `${PREFIX_PERIOD}${pSuffix}`;
      const docId = `${PREFIX_EVAL}${periodId}_${memId}`;
      const scores = {};
      const targets = {};
      INITIAL_SKILLS.forEach((sk, idx) => {
        const sc = arr[idx] || 3;
        scores[sk.id] = sc;
        targets[sk.id] = Math.min(5, sc + 1);
      });
      evals[docId] = {
        id: docId,
        periodId,
        memberId: memId,
        scores,
        targets,
        selfComment: '今期は重点テーマである標準化と後輩フォローを意識して業務に取り組みました。次期はさらなる専門性向上と改善提案の件数増加を目指します。',
        managerComment: '着実なスキルアップが見られます。次期はチーム全体の底上げに向けてOJTやドキュメント整備もリードしてください。',
        status: 'submitted',
        updatedAt: Date.now() - Math.floor(Math.random() * 3600000 * 48)
      };
    });
  });

  return evals;
}

// ============================================================================
// 3. カスタム SVG コンポーネント (ロゴ & レーダーチャート)
// ============================================================================
const SkillMapLogo = ({ size = 28, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="36" height="36" rx="10" className="fill-indigo-600 dark:fill-indigo-500" />
    <polygon
      points="18,5 30,11.5 30,24.5 18,31 6,24.5 6,11.5"
      stroke="white"
      strokeOpacity="0.35"
      strokeWidth="1.5"
      fill="none"
    />
    <polygon
      points="18,8 27,13.5 25,23.5 18,28 9,23 11,13"
      fill="rgba(56, 189, 248, 0.35)"
      stroke="#38bdf8"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="18" cy="8" r="2" fill="white" />
    <circle cx="27" cy="13.5" r="2" fill="white" />
    <circle cx="25" cy="23.5" r="2" fill="white" />
    <circle cx="18" cy="28" r="2" fill="white" />
    <circle cx="9" cy="23" r="2" fill="white" />
    <circle cx="11" cy="13" r="2" fill="white" />
  </svg>
);

/**
 * SVG スキルレーダーチャート (現在スコア vs 比較スコア/目標スコア)
 */
const RadarChart = ({
  axes = [], // [{ label, value, compareValue, targetValue }]
  size = 280,
  showCompare = false,
  showTarget = false,
  compareLabel = "前期",
  primaryLabel = "今期"
}) => {
  if (!axes || axes.length < 3) {
    return (
      <div className="flex items-center justify-center h-48 text-xs font-bold text-slate-400">
        3カテゴリ以上のデータでレーダーチャートを表示します
      </div>
    );
  }

  const center = size / 2;
  const radius = size * 0.33;
  const levels = [1, 2, 3, 4, 5];
  const count = axes.length;

  const getPoint = (index, val) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (Math.max(0, Math.min(5, val)) / 5) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const buildPolygonPoints = (key) =>
    axes
      .map((item, i) => {
        const pt = getPoint(i, item[key] || 0);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* 背景グリッド多角形 */}
        {levels.map((lv) => {
          const pts = axes
            .map((_, i) => {
              const pt = getPoint(i, lv);
              return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={lv}
              points={pts}
              fill={lv === 5 ? 'rgba(99, 102, 241, 0.03)' : 'none'}
              stroke="currentColor"
              className={lv === 3 ? "text-emerald-400/50 dark:text-emerald-500/40" : "text-slate-200 dark:text-slate-800"}
              strokeWidth={lv === 3 ? "1.5" : "1"}
              strokeDasharray={lv === 3 ? "3,3" : undefined}
            />
          );
        })}

        {/* 軸線 */}
        {axes.map((_, i) => {
          const end = getPoint(i, 5);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="1"
            />
          );
        })}

        {/* 目盛り数字 */}
        {levels.map((lv) => {
          const yPos = center - (lv / 5) * radius;
          return (
            <text
              key={lv}
              x={center + 4}
              y={yPos + 3}
              className="fill-slate-400 dark:fill-slate-500 text-[9px] font-bold select-none"
            >
              {lv}
            </text>
          );
        })}

        {/* 比較対象ポリゴン (前期など) */}
        {showCompare && (
          <polygon
            points={buildPolygonPoints('compareValue')}
            fill="rgba(148, 163, 184, 0.2)"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="4,3"
          />
        )}

        {/* 目標ポリゴン */}
        {showTarget && (
          <polygon
            points={buildPolygonPoints('targetValue')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="3,3"
          />
        )}

        {/* メインポリゴン (現在値) */}
        <polygon
          points={buildPolygonPoints('value')}
          fill="rgba(99, 102, 241, 0.25)"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* メイン頂点ドット & ラベル */}
        {axes.map((item, i) => {
          const pt = getPoint(i, item.value || 0);
          const labelPt = getPoint(i, 6.25);
          const shortLabel = item.label.length > 9 ? item.label.slice(0, 9) + '…' : item.label;
          return (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                className="fill-white dark:fill-slate-900 stroke-indigo-600 dark:stroke-indigo-400"
                strokeWidth="2.5"
              />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-700 dark:fill-slate-300 text-[10px] font-extrabold select-none"
              >
                {shortLabel}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-indigo-600 dark:fill-indigo-400 text-[10px] font-black select-none"
              >
                {(item.value || 0).toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs font-bold text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500/30 border-2 border-indigo-500 inline-block" />
          {primaryLabel}
        </span>
        {showCompare && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-slate-400 inline-block" />
            {compareLabel}
          </span>
        )}
        {showTarget && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-500 inline-block" />
            目標レベル
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-b-2 border-dashed border-emerald-500 inline-block" />
          一人前基準 (Lv.3)
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// 4. ヘルパー関数
// ============================================================================
const formatTimeAgo = (ts) => {
  if (!ts) return '未保存';
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'たった今';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getLevelMeta = (lv) => {
  const num = Number(lv) || 0;
  return LEVEL_DEFINITIONS.find((d) => d.level === num) || null;
};

// ============================================================================
// 5. メインアプリケーション コンポーネント
// ============================================================================
export default function App() {
  // --- 認証・テーマ・基本ステート ---
  const [, setFirebaseUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('sm_theme') === 'dark';
  });
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // --- データストア (Firestore と双方向同期 + LocalStorage キャッシュ) ---
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('sm_cache_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });
  const [skills, setSkills] = useState(() => {
    const saved = localStorage.getItem('sm_cache_skills');
    return saved ? JSON.parse(saved) : INITIAL_SKILLS;
  });
  const [periods, setPeriods] = useState(() => {
    const saved = localStorage.getItem('sm_cache_periods');
    return saved ? JSON.parse(saved) : INITIAL_PERIODS;
  });
  const [evaluations, setEvaluations] = useState(() => {
    const saved = localStorage.getItem('sm_cache_evaluations');
    return saved ? JSON.parse(saved) : buildInitialEvaluations();
  });
  const [backups, setBackups] = useState(() => {
    const saved = localStorage.getItem('sm_cache_backups');
    return saved ? JSON.parse(saved) : [];
  });
  const [systemConfig, setSystemConfig] = useState(() => {
    const saved = localStorage.getItem('sm_cache_config');
    return saved
      ? JSON.parse(saved)
      : {
          orgName: '技術・業務推進グループ',
          managerPin: '0000',
          requireMemberPin: false,
          categories: DEFAULT_CATEGORIES
        };
  });

  // --- セッション＆アクセス制御ステート (要件2 & 要件8 & 非機能セキュリティ) ---
  // sessionRole: null (未ログイン) | 'member' (メンバー専用モード) | 'manager' (グループ長モード)
  const [sessionRole, setSessionRole] = useState(() => localStorage.getItem('sm_session_role') || null);
  const [activeMemberId, setActiveMemberId] = useState(() => localStorage.getItem('sm_active_member_id') || '');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [comparePeriodId, setComparePeriodId] = useState('');

  // --- ナビゲーションタブ ---
  // memberタブ: 'input' (自己評価入力) | 'growth' (個人分析・半期推移) | 'guide' (評価基準ガイド)
  // managerタブ: 'matrix' (一覧マトリクス) | 'analytics' (組織分析・ランキング) | 'members' (メンバー管理) | 'skills' (評価項目管理) | 'periods' (半期・データ保全)
  const [memberTab, setMemberTab] = useState('input');
  const [managerTab, setManagerTab] = useState('matrix');

  // --- ログインモーダル・PIN認証用ステート ---
  const [loginStep, setLoginStep] = useState('select'); // 'select' | 'member_pin' | 'manager_pin'
  const [pendingMember, setPendingMember] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // --- メンバー画面用フィルタ・入力補助ステート ---
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [openNoteSkillId, setOpenNoteSkillId] = useState(null);

  // --- グループ長マトリクス画面用フィルタ・詳細ドロワーステート ---
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState('ALL');
  const [matrixDeptFilter, setMatrixDeptFilter] = useState('ALL');
  const [matrixStatusFilter, setMatrixStatusFilter] = useState('active');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixSortBy, setMatrixSortBy] = useState('order'); // 'order' | 'avg_desc' | 'avg_asc' | 'gap_desc'
  const [matrixShowDiff, setMatrixShowDiff] = useState(true);
  const [inspectingMemberId, setInspectingMemberId] = useState(null);
  const [managerFeedbackDraft, setManagerFeedbackDraft] = useState('');

  // --- マスター管理用モーダル・フォームステート ---
  const [editingMember, setEditingMember] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPeriodForm, setNewPeriodForm] = useState({
    name: '',
    code: '',
    startDate: '',
    endDate: '',
    copyFromPeriodId: ''
  });
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [newManagerPin, setNewManagerPin] = useState('');

  const fileInputRef = useRef(null);
  const initialSeedAttempted = useRef(false);

  // --- トースト通知表示 ---
  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type, id: Date.now() });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // --- ダークモード反映 ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sm_theme', 'light');
    }
  }, [isDarkMode]);

  // --- ローカルキャッシュの自動保存 ---
  useEffect(() => {
    localStorage.setItem('sm_cache_members', JSON.stringify(members));
  }, [members]);
  useEffect(() => {
    localStorage.setItem('sm_cache_skills', JSON.stringify(skills));
  }, [skills]);
  useEffect(() => {
    localStorage.setItem('sm_cache_periods', JSON.stringify(periods));
  }, [periods]);
  useEffect(() => {
    localStorage.setItem('sm_cache_evaluations', JSON.stringify(evaluations));
  }, [evaluations]);
  useEffect(() => {
    localStorage.setItem('sm_cache_backups', JSON.stringify(backups));
  }, [backups]);
  useEffect(() => {
    localStorage.setItem('sm_cache_config', JSON.stringify(systemConfig));
  }, [systemConfig]);

  // --- 期間選択の初期化 ---
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const current = periods.find((p) => p.isCurrent) || periods[periods.length - 1];
      setSelectedPeriodId(current.id);
      const sorted = [...periods].sort((a, b) => (a.order || 0) - (b.order || 0));
      const idx = sorted.findIndex((p) => p.id === current.id);
      if (idx > 0) {
        setComparePeriodId(sorted[idx - 1].id);
      } else if (sorted.length > 1) {
        setComparePeriodId(sorted[0].id);
      }
    }
  }, [periods, selectedPeriodId]);

  // ============================================================================
  // 6. Firebase リアルタイム同期 (要件4: リアルタイム反映 & 既存DB枠の活用)
  // ============================================================================
  useEffect(() => {
    if (!auth || !db) return;

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.warn("Anonymous auth fallback:", e);
      }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setFirebaseUser(u);
    });

    // 1) メンバー一覧 (accounts コレクション内の sm_mem_ ドキュメント)
    const accountsRef = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
    const unsubMembers = onSnapshot(
      accountsRef,
      (snapshot) => {
        setIsCloudSynced(true);
        const loadedMembers = [];
        let loadedConfig = null;

        snapshot.forEach((docSnap) => {
          const id = docSnap.id;
          const data = docSnap.data();
          if (id === CONFIG_DOC_ID) {
            loadedConfig = data;
          } else if (id.startsWith(PREFIX_MEMBER)) {
            loadedMembers.push({ ...data, id });
          }
        });

        if (loadedConfig) {
          setSystemConfig((prev) => ({ ...prev, ...loadedConfig }));
        }

        if (loadedMembers.length > 0) {
          loadedMembers.sort((a, b) => (a.order || 99) - (b.order || 99));
          setMembers(loadedMembers);
        } else if (!initialSeedAttempted.current) {
          // 初回起動時にFirestoreにスキルマップ用データがまだ無ければ初期シードを投入
          initialSeedAttempted.current = true;
          seedInitialDataToFirestore();
        }
      },
      (err) => {
        console.warn("Accounts realtime listener warning:", err);
      }
    );

    // 2) スキル評価項目 (exercises コレクション内の sm_skl_ ドキュメント)
    const exercisesRef = collection(db, 'artifacts', appId, 'public', 'data', 'exercises');
    const unsubSkills = onSnapshot(
      exercisesRef,
      (snapshot) => {
        const loadedSkills = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id.startsWith(PREFIX_SKILL)) {
            loadedSkills.push({ ...docSnap.data(), id: docSnap.id });
          }
        });
        if (loadedSkills.length > 0) {
          loadedSkills.sort((a, b) => (a.order || 99) - (b.order || 99));
          setSkills(loadedSkills);
        }
      },
      (err) => console.warn("Skills listener warning:", err)
    );

    // 3) 評価期間 (gyms コレクション内の sm_prd_ ドキュメント)
    const gymsRef = collection(db, 'artifacts', appId, 'public', 'data', 'gyms');
    const unsubPeriods = onSnapshot(
      gymsRef,
      (snapshot) => {
        const loadedPeriods = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id.startsWith(PREFIX_PERIOD)) {
            loadedPeriods.push({ ...docSnap.data(), id: docSnap.id });
          }
        });
        if (loadedPeriods.length > 0) {
          loadedPeriods.sort((a, b) => (a.order || 0) - (b.order || 0));
          setPeriods(loadedPeriods);
        }
      },
      (err) => console.warn("Periods listener warning:", err)
    );

    // 4) 自己評価データ (workouts コレクション内の sm_evl_ ドキュメント)
    const workoutsRef = collection(db, 'artifacts', appId, 'public', 'data', 'workouts');
    const unsubEvals = onSnapshot(
      workoutsRef,
      (snapshot) => {
        const loadedEvals = {};
        let newestEvent = null;

        snapshot.docChanges().forEach((change) => {
          if (change.doc.id.startsWith(PREFIX_EVAL) && (change.type === 'added' || change.type === 'modified')) {
            const d = change.doc.data();
            if (d.updatedAt && Date.now() - d.updatedAt < 15000) {
              newestEvent = {
                memberId: d.memberId,
                updatedAt: d.updatedAt
              };
            }
          }
        });

        snapshot.forEach((docSnap) => {
          if (docSnap.id.startsWith(PREFIX_EVAL)) {
            loadedEvals[docSnap.id] = { ...docSnap.data(), id: docSnap.id };
          }
        });

        if (Object.keys(loadedEvals).length > 0) {
          setEvaluations(loadedEvals);
        }
        if (newestEvent) {
          setLastRealtimeEvent(newestEvent);
        }
      },
      (err) => console.warn("Evaluations listener warning:", err)
    );

    // 5) バックアップ履歴 (reports コレクション内の sm_bkp_ ドキュメント)
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const unsubBackups = onSnapshot(
      reportsRef,
      (snapshot) => {
        const loadedBackups = [];
        snapshot.forEach((docSnap) => {
          if (docSnap.id.startsWith(PREFIX_BACKUP)) {
            loadedBackups.push({ ...docSnap.data(), id: docSnap.id });
          }
        });
        if (loadedBackups.length > 0) {
          loadedBackups.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setBackups(loadedBackups);
        }
      },
      (err) => console.warn("Backups listener warning:", err)
    );

    return () => {
      unsubAuth();
      unsubMembers();
      unsubSkills();
      unsubPeriods();
      unsubEvals();
      unsubBackups();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 初回シードデータのFirestore書き込み ---
  const seedInitialDataToFirestore = async (forceReset = false) => {
    if (!db) return;
    try {
      const seedEvals = buildInitialEvaluations();
      const cfg = {
        orgName: '技術・業務推進グループ',
        managerPin: '0000',
        requireMemberPin: false,
        categories: DEFAULT_CATEGORIES
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', CONFIG_DOC_ID), cfg, { merge: true });

      for (const m of INITIAL_MEMBERS) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', m.id), m, { merge: true });
      }
      for (const s of INITIAL_SKILLS) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', s.id), s, { merge: true });
      }
      for (const p of INITIAL_PERIODS) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', p.id), p, { merge: true });
      }
      for (const [evId, evData] of Object.entries(seedEvals)) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', evId), evData, { merge: true });
      }

      if (forceReset) {
        setMembers(INITIAL_MEMBERS);
        setSkills(INITIAL_SKILLS);
        setPeriods(INITIAL_PERIODS);
        setEvaluations(seedEvals);
        setSystemConfig(cfg);
        showToast('サンプルデータを初期状態に復元しました');
      }
    } catch (e) {
      console.warn("Seed write notice:", e);
    }
  };

  // ============================================================================
  // 7. Firestore 保存アクション群 (即時ローカル反映 + クラウド非同期保存)
  // ============================================================================
  const saveEvaluationDoc = async (periodId, memberId, patch) => {
    const docId = `${PREFIX_EVAL}${periodId}_${memberId}`;
    const existing = evaluations[docId] || {
      id: docId,
      periodId,
      memberId,
      scores: {},
      targets: {},
      notes: {},
      selfComment: '',
      managerComment: '',
      status: 'draft'
    };
    const updated = {
      ...existing,
      ...patch,
      id: docId,
      periodId,
      memberId,
      updatedAt: Date.now()
    };

    setEvaluations((prev) => ({ ...prev, [docId]: updated }));

    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', docId), updated, { merge: true });
      } catch (e) {
        console.warn("Eval cloud save error:", e);
      }
    }
  };

  const handleSetScore = (skillId, scoreValue) => {
    if (!activeMemberId || !selectedPeriodId) return;
    const currentPeriodObj = periods.find((p) => p.id === selectedPeriodId);
    if (currentPeriodObj?.isLocked && sessionRole !== 'manager') {
      showToast('この評価期間はロックされているため変更できません', 'error');
      return;
    }

    const docId = `${PREFIX_EVAL}${selectedPeriodId}_${activeMemberId}`;
    const currentEval = evaluations[docId] || { scores: {}, targets: {} };
    const nextScores = { ...(currentEval.scores || {}), [skillId]: scoreValue };
    const nextTargets = { ...(currentEval.targets || {}) };
    if (!nextTargets[skillId]) {
      nextTargets[skillId] = Math.min(5, scoreValue + 1);
    }

    saveEvaluationDoc(selectedPeriodId, activeMemberId, {
      scores: nextScores,
      targets: nextTargets
    });
  };

  const handleSetTarget = (skillId, targetValue) => {
    if (!activeMemberId || !selectedPeriodId) return;
    const docId = `${PREFIX_EVAL}${selectedPeriodId}_${activeMemberId}`;
    const currentEval = evaluations[docId] || { scores: {}, targets: {} };
    const nextTargets = { ...(currentEval.targets || {}), [skillId]: targetValue };
    saveEvaluationDoc(selectedPeriodId, activeMemberId, { targets: nextTargets });
  };

  const handleSetSkillNote = (skillId, noteText) => {
    if (!activeMemberId || !selectedPeriodId) return;
    const docId = `${PREFIX_EVAL}${selectedPeriodId}_${activeMemberId}`;
    const currentEval = evaluations[docId] || { notes: {} };
    const nextNotes = { ...(currentEval.notes || {}), [skillId]: noteText };
    saveEvaluationDoc(selectedPeriodId, activeMemberId, { notes: nextNotes });
  };

  const handleCopyFromPreviousPeriod = () => {
    if (!activeMemberId || !selectedPeriodId || !comparePeriodId) return;
    const prevDocId = `${PREFIX_EVAL}${comparePeriodId}_${activeMemberId}`;
    const prevEval = evaluations[prevDocId];
    if (!prevEval || !prevEval.scores || Object.keys(prevEval.scores).length === 0) {
      showToast('比較元の前期データが見つかりません', 'error');
      return;
    }
    saveEvaluationDoc(selectedPeriodId, activeMemberId, {
      scores: { ...prevEval.scores },
      targets: { ...(prevEval.targets || {}) },
      selfComment: prevEval.selfComment || ''
    });
    showToast('前期の自己評価スコアを引き継ぎました');
  };

  // --- メンバーの追加・更新・削除 (要件6) ---
  const handleSaveMember = async (memberData) => {
    const id = memberData.id || `${PREFIX_MEMBER}${Date.now()}`;
    const payload = {
      ...memberData,
      id,
      order: Number(memberData.order) || members.length + 1,
      updatedAt: Date.now()
    };

    setMembers((prev) => {
      const exists = prev.some((m) => m.id === id);
      const next = exists ? prev.map((m) => (m.id === id ? payload : m)) : [...prev, payload];
      return next.sort((a, b) => (a.order || 99) - (b.order || 99));
    });

    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', id), payload, { merge: true });
      } catch (e) {
        console.warn("Save member error:", e);
      }
    }
    setShowMemberModal(false);
    setEditingMember(null);
    showToast('メンバー情報を保存しました');
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('このメンバーを削除しますか？（異動や退職の場合はステータス変更を推奨します）')) return;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (db) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', memberId));
      } catch (e) {}
    }
    showToast('メンバーを削除しました');
  };

  // --- 評価項目の追加・更新・並び替え (要件7) ---
  const handleSaveSkill = async (skillData) => {
    const id = skillData.id || `${PREFIX_SKILL}${Date.now()}`;
    const payload = {
      ...skillData,
      id,
      requiredLevel: Number(skillData.requiredLevel) || 3,
      order: Number(skillData.order) || skills.length + 1,
      active: skillData.active !== false,
      updatedAt: Date.now()
    };

    setSkills((prev) => {
      const exists = prev.some((s) => s.id === id);
      const next = exists ? prev.map((s) => (s.id === id ? payload : s)) : [...prev, payload];
      return next.sort((a, b) => (a.order || 99) - (b.order || 99));
    });

    // 新規カテゴリが含まれていればシステム設定にも追加
    if (payload.category && !systemConfig.categories?.includes(payload.category)) {
      const nextCats = [...(systemConfig.categories || DEFAULT_CATEGORIES), payload.category];
      updateSystemConfig({ categories: nextCats });
    }

    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', id), payload, { merge: true });
      } catch (e) {
        console.warn("Save skill error:", e);
      }
    }
    setShowSkillModal(false);
    setEditingSkill(null);
    showToast('評価項目を保存しました');
  };

  const handleMoveSkillOrder = async (skillId, direction) => {
    const sorted = [...skills].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex((s) => s.id === skillId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = { ...sorted[idx], order: swapIdx + 1 };
    const b = { ...sorted[swapIdx], order: idx + 1 };
    const next = sorted.map((s, i) => {
      if (i === idx) return b;
      if (i === swapIdx) return a;
      return { ...s, order: i + 1 };
    });
    setSkills(next);

    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', a.id), a, { merge: true });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', b.id), b, { merge: true });
      } catch (e) {}
    }
  };

  // --- 半期期間の追加・切替・ロック (要件5) ---
  const handleCreatePeriod = async () => {
    if (!newPeriodForm.name.trim()) {
      showToast('期間名（例: 2027年度 上期）を入力してください', 'error');
      return;
    }
    const id = `${PREFIX_PERIOD}${Date.now()}`;
    const newPeriod = {
      id,
      name: newPeriodForm.name.trim(),
      code: newPeriodForm.code.trim() || newPeriodForm.name.trim(),
      startDate: newPeriodForm.startDate || '',
      endDate: newPeriodForm.endDate || '',
      isCurrent: true,
      isLocked: false,
      order: periods.length + 1
    };

    const updatedPeriods = periods.map((p) => ({ ...p, isCurrent: false })).concat(newPeriod);
    setPeriods(updatedPeriods);
    setSelectedPeriodId(id);

    if (db) {
      try {
        for (const p of updatedPeriods) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', p.id), p, { merge: true });
        }
      } catch (e) {}
    }

    // 前期データの引き継ぎコピー指定がある場合
    if (newPeriodForm.copyFromPeriodId) {
      const sourcePeriodId = newPeriodForm.copyFromPeriodId;
      const clonedEvals = {};
      Object.values(evaluations).forEach((ev) => {
        if (ev.periodId === sourcePeriodId) {
          const newEvId = `${PREFIX_EVAL}${id}_${ev.memberId}`;
          clonedEvals[newEvId] = {
            id: newEvId,
            periodId: id,
            memberId: ev.memberId,
            scores: { ...(ev.scores || {}) },
            targets: { ...(ev.targets || {}) },
            notes: {},
            selfComment: '',
            managerComment: '',
            status: 'draft',
            updatedAt: Date.now()
          };
        }
      });
      setEvaluations((prev) => ({ ...prev, ...clonedEvals }));
      if (db) {
        for (const [evId, evObj] of Object.entries(clonedEvals)) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', evId), evObj, { merge: true });
        }
      }
    }

    setShowPeriodModal(false);
    setNewPeriodForm({ name: '', code: '', startDate: '', endDate: '', copyFromPeriodId: '' });
    showToast(`新しい評価期間「${newPeriod.name}」を開始しました`);
  };

  const handleTogglePeriodLock = async (period) => {
    const updated = { ...period, isLocked: !period.isLocked };
    setPeriods((prev) => prev.map((p) => (p.id === period.id ? updated : p)));
    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', period.id), updated, { merge: true });
      } catch (e) {}
    }
    showToast(updated.isLocked ? `「${period.name}」を確定ロックしました` : `「${period.name}」のロックを解除しました`);
  };

  const handleSetCurrentPeriod = async (periodId) => {
    const updatedList = periods.map((p) => ({ ...p, isCurrent: p.id === periodId }));
    setPeriods(updatedList);
    setSelectedPeriodId(periodId);
    if (db) {
      try {
        for (const p of updatedList) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', p.id), p, { merge: true });
        }
      } catch (e) {}
    }
    showToast('現在の評価対象期間を切り替えました');
  };

  // --- システム設定更新 ---
  const updateSystemConfig = async (patch) => {
    const next = { ...systemConfig, ...patch };
    setSystemConfig(next);
    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', CONFIG_DOC_ID), next, { merge: true });
      } catch (e) {}
    }
  };

  // --- クラウドスナップショット保存 & JSON/CSV エクスポート (非機能要件: データ保全) ---
  const handleCreateCloudBackup = async (label = '手動スナップショット') => {
    const bkpId = `${PREFIX_BACKUP}${Date.now()}`;
    const snapshotObj = {
      id: bkpId,
      label,
      createdAt: Date.now(),
      memberCount: members.length,
      skillCount: skills.length,
      periodCount: periods.length,
      payload: JSON.stringify({
        members,
        skills,
        periods,
        evaluations,
        systemConfig
      })
    };

    setBackups((prev) => [snapshotObj, ...prev.slice(0, 14)]);
    if (db) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', bkpId), snapshotObj, { merge: true });
      } catch (e) {}
    }
    showToast('クラウドにバックアップスナップショットを保存しました');
  };

  const handleRestoreBackup = async (backupItem) => {
    if (!window.confirm(`「${backupItem.label}」(${formatTimeAgo(backupItem.createdAt)}) の状態へ復元しますか？`)) return;
    try {
      const parsed = JSON.parse(backupItem.payload);
      if (parsed.members) setMembers(parsed.members);
      if (parsed.skills) setSkills(parsed.skills);
      if (parsed.periods) setPeriods(parsed.periods);
      if (parsed.evaluations) setEvaluations(parsed.evaluations);
      if (parsed.systemConfig) setSystemConfig(parsed.systemConfig);

      if (db) {
        for (const m of parsed.members || []) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', m.id), m, { merge: true });
        }
        for (const s of parsed.skills || []) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exercises', s.id), s, { merge: true });
        }
        for (const p of parsed.periods || []) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gyms', p.id), p, { merge: true });
        }
        for (const [evId, evObj] of Object.entries(parsed.evaluations || {})) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'workouts', evId), evObj, { merge: true });
        }
      }
      showToast('バックアップからデータを復元しました');
    } catch (e) {
      showToast('復元に失敗しました', 'error');
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        members,
        skills,
        periods,
        evaluations,
        systemConfig
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skillmap_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSONバックアップファイルをダウンロードしました');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!parsed.members || !parsed.skills) {
          showToast('有効なバックアップファイルではありません', 'error');
          return;
        }
        await handleRestoreBackup({
          label: file.name,
          createdAt: Date.now(),
          payload: JSON.stringify(parsed)
        });
      } catch (err) {
        showToast('JSONファイルの読み込みに失敗しました', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const activeSkillsList = skills.filter((s) => s.active !== false);
    const currentPeriodObj = periods.find((p) => p.id === selectedPeriodId);
    const headers = [
      '期間',
      '氏名',
      '部署・グループ',
      '役職',
      '等級',
      'ステータス',
      '平均スコア',
      ...activeSkillsList.map((s) => `[${s.category}] ${s.name}`),
      '本人振り返りコメント',
      'グループ長フィードバック'
    ];

    const rows = members.map((m) => {
      const ev = evaluations[`${PREFIX_EVAL}${selectedPeriodId}_${m.id}`] || { scores: {} };
      const vals = activeSkillsList.map((s) => ev.scores?.[s.id] || '');
      const scoredNums = vals.filter((v) => Number(v) > 0).map(Number);
      const avg = scoredNums.length > 0 ? (scoredNums.reduce((a, b) => a + b, 0) / scoredNums.length).toFixed(2) : '0.00';
      const stLabel = MEMBER_STATUSES.find((st) => st.value === m.status)?.label || m.status;
      return [
        currentPeriodObj?.name || '',
        m.name,
        m.department || '',
        m.roleTitle || '',
        m.grade || '',
        stLabel,
        avg,
        ...vals,
        `"${(ev.selfComment || '').replace(/"/g, '""')}"`,
        `"${(ev.managerComment || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `スキルマップ一覧_${currentPeriodObj?.code || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Excel用CSVファイルを出力しました');
  };

  // ============================================================================
  // 8. 派生データ・集計メモ化
  // ============================================================================
  const activeSkills = useMemo(() => skills.filter((s) => s.active !== false), [skills]);
  const categories = useMemo(() => {
    const fromSkills = Array.from(new Set(activeSkills.map((s) => s.category)));
    const combined = Array.from(new Set([...(systemConfig.categories || DEFAULT_CATEGORIES), ...fromSkills]));
    return combined;
  }, [activeSkills, systemConfig.categories]);

  const currentPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) || periods[periods.length - 1],
    [periods, selectedPeriodId]
  );

  const comparePeriod = useMemo(
    () => periods.find((p) => p.id === comparePeriodId) || null,
    [periods, comparePeriodId]
  );

  const loggedInMember = useMemo(
    () => members.find((m) => m.id === activeMemberId) || null,
    [members, activeMemberId]
  );

  // ログイン中メンバーの今期＆比較期データ (※メンバーモード時は自分の評価のみ参照可能: 要件2 & 非機能セキュリティ)
  const myCurrentEval = useMemo(() => {
    if (!activeMemberId || !selectedPeriodId) return { scores: {}, targets: {}, notes: {}, selfComment: '', managerComment: '' };
    return (
      evaluations[`${PREFIX_EVAL}${selectedPeriodId}_${activeMemberId}`] || {
        scores: {},
        targets: {},
        notes: {},
        selfComment: '',
        managerComment: ''
      }
    );
  }, [evaluations, selectedPeriodId, activeMemberId]);

  const myCompareEval = useMemo(() => {
    if (!activeMemberId || !comparePeriodId) return { scores: {}, targets: {} };
    return evaluations[`${PREFIX_EVAL}${comparePeriodId}_${activeMemberId}`] || { scores: {}, targets: {} };
  }, [evaluations, comparePeriodId, activeMemberId]);

  // ログイン中メンバーの統計・レーダーチャート用データ
  const myStats = useMemo(() => {
    const scores = myCurrentEval.scores || {};
    const prevScores = myCompareEval.scores || {};
    const targets = myCurrentEval.targets || {};

    let sum = 0;
    let count = 0;
    let prevSum = 0;
    let prevCount = 0;
    let achievedRequiredCount = 0;

    activeSkills.forEach((sk) => {
      const val = Number(scores[sk.id]) || 0;
      const pVal = Number(prevScores[sk.id]) || 0;
      if (val > 0) {
        sum += val;
        count++;
        if (val >= (sk.requiredLevel || 3)) achievedRequiredCount++;
      }
      if (pVal > 0) {
        prevSum += pVal;
        prevCount++;
      }
    });

    const avg = count > 0 ? sum / count : 0;
    const prevAvg = prevCount > 0 ? prevSum / prevCount : 0;
    const progressPct = activeSkills.length > 0 ? Math.round((count / activeSkills.length) * 100) : 0;

    // カテゴリ別平均
    const radarAxes = categories.map((cat) => {
      const catSkills = activeSkills.filter((s) => s.category === cat);
      if (catSkills.length === 0) return { label: cat, value: 0, compareValue: 0, targetValue: 3 };
      const cVals = catSkills.map((s) => Number(scores[s.id]) || 0).filter((v) => v > 0);
      const pVals = catSkills.map((s) => Number(prevScores[s.id]) || 0).filter((v) => v > 0);
      const tVals = catSkills.map((s) => Number(targets[s.id]) || s.requiredLevel || 3);
      return {
        label: cat,
        value: cVals.length > 0 ? cVals.reduce((a, b) => a + b, 0) / cVals.length : 0,
        compareValue: pVals.length > 0 ? pVals.reduce((a, b) => a + b, 0) / pVals.length : 0,
        targetValue: tVals.length > 0 ? tVals.reduce((a, b) => a + b, 0) / tVals.length : 3
      };
    });

    return {
      avg,
      prevAvg,
      diffAvg: avg - prevAvg,
      inputCount: count,
      totalCount: activeSkills.length,
      progressPct,
      achievedRequiredCount,
      radarAxes
    };
  }, [myCurrentEval, myCompareEval, activeSkills, categories]);

  // グループ長用：全体統計・マトリクス集計
  const managerStats = useMemo(() => {
    if (sessionRole !== 'manager') return null;

    const filteredMembers = members
      .filter((m) => {
        if (matrixStatusFilter !== 'ALL' && m.status !== matrixStatusFilter) return false;
        if (matrixDeptFilter !== 'ALL' && m.department !== matrixDeptFilter) return false;
        if (matrixSearch.trim()) {
          const q = matrixSearch.trim().toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            (m.roleTitle || '').toLowerCase().includes(q) ||
            (m.department || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .map((m) => {
        const ev = evaluations[`${PREFIX_EVAL}${selectedPeriodId}_${m.id}`] || { scores: {}, targets: {} };
        const prevEv = comparePeriodId
          ? evaluations[`${PREFIX_EVAL}${comparePeriodId}_${m.id}`] || { scores: {} }
          : { scores: {} };

        const vals = activeSkills.map((s) => Number(ev.scores?.[s.id]) || 0).filter((v) => v > 0);
        const prevVals = activeSkills.map((s) => Number(prevEv.scores?.[s.id]) || 0).filter((v) => v > 0);
        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        const prevAvg = prevVals.length > 0 ? prevVals.reduce((a, b) => a + b, 0) / prevVals.length : 0;
        const completionPct = activeSkills.length > 0 ? Math.round((vals.length / activeSkills.length) * 100) : 0;

        return {
          ...m,
          evalDoc: ev,
          prevEvalDoc: prevEv,
          avg,
          prevAvg,
          diffAvg: prevVals.length > 0 ? avg - prevAvg : 0,
          completionPct,
          inputCount: vals.length
        };
      });

    if (matrixSortBy === 'avg_desc') {
      filteredMembers.sort((a, b) => b.avg - a.avg);
    } else if (matrixSortBy === 'avg_asc') {
      filteredMembers.sort((a, b) => a.avg - b.avg);
    } else if (matrixSortBy === 'growth_desc') {
      filteredMembers.sort((a, b) => b.diffAvg - a.diffAvg);
    } else {
      filteredMembers.sort((a, b) => (a.order || 99) - (b.order || 99));
    }

    // スキルごとのチーム平均・Lv3以上充足人数
    const skillAggregates = {};
    activeSkills.forEach((sk) => {
      const scores = filteredMembers.map((m) => Number(m.evalDoc.scores?.[sk.id]) || 0).filter((v) => v > 0);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const qualifiedCount = scores.filter((v) => v >= (sk.requiredLevel || 3)).length;
      const expertCount = scores.filter((v) => v >= 4).length;
      skillAggregates[sk.id] = {
        avg,
        qualifiedCount,
        expertCount,
        totalResponded: scores.length,
        isShortage: qualifiedCount < Math.min(2, filteredMembers.length) // 2名未満なら属人化・不足アラート
      };
    });

    // チーム全体レーダー軸
    const teamRadarAxes = categories.map((cat) => {
      const catSkills = activeSkills.filter((s) => s.category === cat);
      if (catSkills.length === 0) return { label: cat, value: 0, compareValue: 0, targetValue: 3 };
      let sum = 0;
      let cnt = 0;
      let pSum = 0;
      let pCnt = 0;
      filteredMembers.forEach((m) => {
        catSkills.forEach((s) => {
          const v = Number(m.evalDoc.scores?.[s.id]) || 0;
          const pv = Number(m.prevEvalDoc.scores?.[s.id]) || 0;
          if (v > 0) {
            sum += v;
            cnt++;
          }
          if (pv > 0) {
            pSum += pv;
            pCnt++;
          }
        });
      });
      return {
        label: cat,
        value: cnt > 0 ? sum / cnt : 0,
        compareValue: pCnt > 0 ? pSum / pCnt : 0,
        targetValue: 3.5
      };
    });

    const overallScores = filteredMembers.filter((m) => m.avg > 0).map((m) => m.avg);
    const teamOverallAvg = overallScores.length > 0 ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length : 0;
    const submittedMembersCount = filteredMembers.filter((m) => m.completionPct === 100).length;

    return {
      filteredMembers,
      skillAggregates,
      teamRadarAxes,
      teamOverallAvg,
      submittedMembersCount
    };
  }, [
    sessionRole,
    members,
    activeSkills,
    categories,
    evaluations,
    selectedPeriodId,
    comparePeriodId,
    matrixStatusFilter,
    matrixDeptFilter,
    matrixSearch,
    matrixSortBy
  ]);

  // ============================================================================
  // 9. ログイン・ロール切替処理 (要件8: アクセス制御)
  // ============================================================================
  const handleSelectMemberLogin = (member) => {
    if (systemConfig.requireMemberPin && member.pin) {
      setPendingMember(member);
      setPinInput('');
      setPinError('');
      setLoginStep('member_pin');
    } else {
      completeMemberLogin(member);
    }
  };

  const completeMemberLogin = (member) => {
    setSessionRole('member');
    setActiveMemberId(member.id);
    localStorage.setItem('sm_session_role', 'member');
    localStorage.setItem('sm_active_member_id', member.id);
    setLoginStep('select');
    setPendingMember(null);
    setPinInput('');
    showToast(`${member.name} さんとしてログインしました`);
  };

  const handleVerifyMemberPin = (e) => {
    e.preventDefault();
    if (!pendingMember) return;
    if (pinInput === pendingMember.pin) {
      completeMemberLogin(pendingMember);
    } else {
      setPinError('暗証番号(PIN)が一致しません');
    }
  };

  const handleVerifyManagerPin = (e) => {
    e.preventDefault();
    const expectedPin = systemConfig.managerPin || '0000';
    if (pinInput === expectedPin) {
      setSessionRole('manager');
      localStorage.setItem('sm_session_role', 'manager');
      setLoginStep('select');
      setPinInput('');
      setPinError('');
      showToast('グループ長（管理者）モードでログインしました');
    } else {
      setPinError('グループ長パスコードが正しくありません（初期値: 0000）');
    }
  };

  const handleLogout = () => {
    setSessionRole(null);
    setActiveMemberId('');
    setInspectingMemberId(null);
    localStorage.removeItem('sm_session_role');
    localStorage.removeItem('sm_active_member_id');
    setLoginStep('select');
    setPinInput('');
    setPinError('');
  };

  // ============================================================================
  // 10. 画面レンダリング: 未ログイン時（ロール＆メンバー選択ポータル）
  // ============================================================================
  if (!sessionRole || (sessionRole === 'member' && !loggedInMember)) {
    const activeMembersList = members.filter((m) => m.status === 'active');

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between p-4 sm:p-8 select-none">
        {/* 上部バー */}
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkillMapLogo size={36} />
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                SkillMap Pro
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  REALTIME CLOUD
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">{systemConfig.orgName || 'スキルマップ管理システム'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isCloudSynced ? 'Firebase 同期中' : 'ローカル保護モード'}
            </span>
          </div>
        </header>

        {/* メインカード */}
        <main className="max-w-4xl w-full mx-auto my-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-bold mb-3">
              <Sparkles size={14} />
              現在対象期間: {currentPeriod?.name || '2026年度 下期'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              利用モードを選択して開始
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              メンバーは自分のスキル自己評価のみ安全に閲覧・入力できます。全体のマトリクス一覧や半期管理・項目編集はグループ長モードから行えます。
            </p>
          </div>

          {loginStep === 'select' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左2カラム: メンバー自己評価ログイン */}
              <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white">メンバー自己評価ログイン</h3>
                      <p className="text-xs text-slate-400">あなたの名前を選択して自己評価画面を開きます（他メンバーの評価は非表示）</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                    対象 {activeMembersList.length} 名
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-80 overflow-y-auto pr-1">
                  {activeMembersList.map((m) => {
                    const ev = evaluations[`${PREFIX_EVAL}${selectedPeriodId}_${m.id}`];
                    const count = ev?.scores ? Object.keys(ev.scores).filter((k) => ev.scores[k] > 0).length : 0;
                    const pct = activeSkills.length > 0 ? Math.round((count / activeSkills.length) * 100) : 0;

                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMemberLogin(m)}
                        className="group text-left p-4 rounded-2xl bg-slate-800/60 hover:bg-indigo-600/20 border border-slate-700/80 hover:border-indigo-500/60 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${
                              m.avatarColor || 'from-indigo-500 to-blue-600'
                            } flex items-center justify-center text-white font-black text-base shadow-md shrink-0`}
                          >
                            {m.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm text-white group-hover:text-indigo-200 truncate flex items-center gap-1.5">
                              {m.name}
                              {systemConfig.requireMemberPin && m.pin && (
                                <Lock size={12} className="text-slate-400 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 truncate mt-0.5">
                              {m.department} ・ {m.roleTitle}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span
                            className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              pct === 100
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : pct > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {pct === 100 ? '入力済' : `${pct}%`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 右1カラム: グループ長（管理者）ダッシュボード */}
              <div className="bg-gradient-to-b from-indigo-950/90 to-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-lg mb-4">
                    <KeyRound size={24} />
                  </div>
                  <h3 className="text-lg font-black text-white">グループ長・管理者画面</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    全メンバーの自己評価マトリクス一覧、ヒートマップ分析、半期ごとの評価更新、メンバー・評価項目の追加変更を行います。
                  </p>

                  <ul className="mt-5 space-y-2 text-xs text-slate-300 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                      全メンバー×全スキルのヒートマップ一覧
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                      リアルタイム入力反映・未提出者確認
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                      半期期間切替・スキル項目・メンバー管理
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                      クラウド自動保全＆Excel CSV出力
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setPinInput('');
                    setPinError('');
                    setLoginStep('manager_pin');
                  }}
                  className="mt-6 w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  <Lock size={16} />
                  グループ長画面を開く
                </button>
              </div>
            </div>
          )}

          {/* メンバーPIN確認ダイアログ */}
          {loginStep === 'member_pin' && pendingMember && (
            <form
              onSubmit={handleVerifyMemberPin}
              className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
            >
              <h3 className="text-lg font-extrabold text-white mb-1">{pendingMember.name} さんの本人確認</h3>
              <p className="text-xs text-slate-400 mb-4">個人用PINコードを入力してください</p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PINコードを入力"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-lg tracking-widest font-black focus:outline-none focus:border-indigo-500"
              />
              {pinError && <p className="text-xs text-rose-400 font-bold mt-2">{pinError}</p>}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setLoginStep('select')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold"
                >
                  ログイン
                </button>
              </div>
            </form>
          )}

          {/* グループ長PIN確認ダイアログ */}
          {loginStep === 'manager_pin' && (
            <form
              onSubmit={handleVerifyManagerPin}
              className="max-w-md mx-auto bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">グループ長 認証</h3>
                  <p className="text-xs text-slate-400">管理者パスコードを入力してください（初期設定: 0000）</p>
                </div>
              </div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="パスコード (初期値: 0000)"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-lg tracking-widest font-black focus:outline-none focus:border-indigo-500 mt-2"
              />
              {pinError && <p className="text-xs text-rose-400 font-bold mt-2">{pinError}</p>}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setLoginStep('select')}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white text-xs font-extrabold"
                >
                  認証して開く
                </button>
              </div>
            </form>
          )}
        </main>

        {/* フッター */}
        <footer className="max-w-4xl w-full mx-auto text-center text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/80 pt-4">
          <span>{APP_VERSION} ・ Firebase Project: {FIREBASE_PROJECT_ID}</span>
          <span>アクセス制御: メンバー個別表示保護 / グループ長全体俯瞰</span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // 11. メインワークスペース (メンバー専用画面 または グループ長専用画面)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* トースト通知 */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-extrabold animate-bounce bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-700 dark:border-slate-200">
          {toastMessage.type === 'error' ? (
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          ) : (
            <CheckCircle size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 上部グローバルナビゲーションヘッダー */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* 左ロゴ＆ロールバッジ */}
          <div className="flex items-center gap-3 min-w-0">
            <SkillMapLogo size={32} className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-slate-900 dark:text-white truncate">
                  SkillMap Pro
                </span>
                {sessionRole === 'manager' ? (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-sm shrink-0">
                    グループ長モード
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm shrink-0">
                    メンバー個人専用
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">
                {sessionRole === 'manager'
                  ? `${systemConfig.orgName} ・ 全メンバー管理`
                  : `${loggedInMember?.department} ・ ${loggedInMember?.name}（他メンバーの評価は非表示）`}
              </p>
            </div>
          </div>

          {/* 中央〜右: 評価期間セレクター＆比較期間セレクター (要件5: 半期ごとの管理) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <CalendarIcon size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                    {p.name} {p.isCurrent ? '（現在）' : ''} {p.isLocked ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400">比較対象:</span>
              <select
                value={comparePeriodId}
                onChange={(e) => setComparePeriodId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-slate-900">比較なし</option>
                {periods
                  .filter((p) => p.id !== selectedPeriodId)
                  .map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* リアルタイムステータスドット */}
            <div
              title={isCloudSynced ? 'Firebase Firestore リアルタイム同期中' : 'ローカルキャッシュ動作中'}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5" />
              <span>LIVE</span>
            </div>

            {/* テーマ切替 */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="ダークモード切替"
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* ログアウト / モード切替 */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold transition-colors"
              title="ユーザー切替・ログアウト"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">切替</span>
            </button>
          </div>
        </div>

        {/* サブナビゲーションタブバー */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/70 overflow-x-auto">
          {sessionRole === 'member' ? (
            <div className="flex items-center gap-1 py-1.5">
              <button
                onClick={() => setMemberTab('input')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  memberTab === 'input'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Zap size={14} />
                1. 自己評価入力
              </button>
              <button
                onClick={() => setMemberTab('growth')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  memberTab === 'growth'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Activity size={14} />
                2. 個人スキル分析・半期推移
              </button>
              <button
                onClick={() => setMemberTab('guide')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  memberTab === 'guide'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Award size={14} />
                3. 5段階評価基準ガイド
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 py-1.5">
              <button
                onClick={() => setManagerTab('matrix')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  managerTab === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Target size={14} />
                全体スキルマップ一覧
              </button>
              <button
                onClick={() => setManagerTab('analytics')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  managerTab === 'analytics'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Trophy size={14} />
                組織分析・育成優先度
              </button>
              <button
                onClick={() => setManagerTab('members')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  managerTab === 'members'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users size={14} />
                メンバー管理 ({members.length})
              </button>
              <button
                onClick={() => setManagerTab('skills')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  managerTab === 'skills'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ListPlus size={14} />
                評価項目管理 ({activeSkills.length})
              </button>
              <button
                onClick={() => setManagerTab('periods')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  managerTab === 'periods'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings size={14} />
                半期管理・データ保全
              </button>
            </div>
          )}

          {/* リアルタイム更新イベント通知バー (要件4) */}
          {lastRealtimeEvent && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full">
              <Bell size={12} className="animate-bounce" />
              <span>
                リアルタイム反映: {members.find((m) => m.id === lastRealtimeEvent.memberId)?.name || 'メンバー'} の評価が更新されました ({formatTimeAgo(lastRealtimeEvent.updatedAt)})
              </span>
            </div>
          )}
        </div>
      </header>

      {/* =====================================================================
          12. メンバー専用ビュー (要件1, 要件2, 要件5, 非機能セキュリティ)
      ===================================================================== */}
      {sessionRole === 'member' && loggedInMember && (
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
          {/* セキュリティ＆個人ステータスバナー */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                  loggedInMember.avatarColor || 'from-indigo-500 to-blue-600'
                } flex items-center justify-center text-white font-black text-xl shadow-md shrink-0`}
              >
                {loggedInMember.name.slice(0, 1)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">{loggedInMember.name}</h2>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {loggedInMember.department} / {loggedInMember.roleTitle} ({loggedInMember.grade})
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <EyeOff size={12} />
                    個人専用表示（他メンバーからは閲覧不可）
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  対象期間: <strong className="text-slate-800 dark:text-slate-200">{currentPeriod?.name}</strong>
                  {' ・ '}最終保存: {formatTimeAgo(myCurrentEval.updatedAt)}（ボタン選択で即座にグループ長画面へリアルタイム反映されます）
                </p>
              </div>
            </div>

            {/* 4つの個人KPIミニカード */}
            <div className="grid grid-cols-3 gap-3 shrink-0">
              <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-center">
                <div className="text-[10px] font-bold text-slate-400">入力進捗</div>
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {myStats.inputCount}<span className="text-xs text-slate-400">/{myStats.totalCount}</span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-center">
                <div className="text-[10px] font-bold text-slate-400">平均スコア</div>
                <div className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-1">
                  {myStats.avg.toFixed(2)}
                  {comparePeriod && myStats.prevAvg > 0 && (
                    <span
                      className={`text-[10px] font-extrabold ${
                        myStats.diffAvg >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {myStats.diffAvg >= 0 ? `+${myStats.diffAvg.toFixed(1)}` : myStats.diffAvg.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-center">
                <div className="text-[10px] font-bold text-slate-400">一人前(Lv.3+)達成</div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {myStats.achievedRequiredCount}<span className="text-xs text-slate-400">項目</span>
                </div>
              </div>
            </div>
          </div>

          {/* メンバータブ1: 自己評価入力 (要件1) */}
          {memberTab === 'input' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左2カラム: スキル項目リスト＆5段階ワンタップ評価 */}
              <div className="lg:col-span-2 space-y-4">
                {/* フィルタ＆前期引き継ぎツールバー */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setSelectedCategoryFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                        selectedCategoryFilter === 'ALL'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      すべて ({activeSkills.length})
                    </button>
                    {categories.map((cat) => {
                      const count = activeSkills.filter((s) => s.category === cat).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                            selectedCategoryFilter === cat
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={skillSearchQuery}
                        onChange={(e) => setSkillSearchQuery(e.target.value)}
                        placeholder="項目を検索..."
                        className="pl-7 pr-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold w-32 sm:w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  {comparePeriod && !currentPeriod?.isLocked && (
                    <button
                      onClick={handleCopyFromPreviousPeriod}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-extrabold shrink-0 transition-colors"
                      title="前回の評価スコアをベースとしてコピーし、変化した項目だけ修正できます"
                    >
                      <Copy size={13} />
                      {comparePeriod.name}から値を引き継ぐ
                    </button>
                  )}
                  </div>
                </div>

                {/* 各スキル項目の評価カード */}
                <div className="space-y-3">
                  {activeSkills
                    .filter((sk) => selectedCategoryFilter === 'ALL' || sk.category === selectedCategoryFilter)
                    .filter((sk) =>
                      !skillSearchQuery.trim()
                        ? true
                        : sk.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
                          (sk.description || '').toLowerCase().includes(skillSearchQuery.toLowerCase())
                    )
                    .map((sk) => {
                      const currentScore = Number(myCurrentEval.scores?.[sk.id]) || 0;
                      const prevScore = Number(myCompareEval.scores?.[sk.id]) || 0;
                      const targetScore = Number(myCurrentEval.targets?.[sk.id]) || sk.requiredLevel || 3;
                      const diff = currentScore > 0 && prevScore > 0 ? currentScore - prevScore : 0;
                      const catStyle = getCategoryStyle(sk.category);
                      const selectedMeta = getLevelMeta(currentScore);
                      const skillNote = myCurrentEval.notes?.[sk.id] || '';

                      return (
                        <div
                          key={sk.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${catStyle.badge}`}>
                                  {sk.category}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  推奨基準: Lv.{sk.requiredLevel || 3}
                                </span>
                                {prevScore > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                                    {comparePeriod?.name || '前期'}: Lv.{prevScore}
                                  </span>
                                )}
                                {diff !== 0 && (
                                  <span
                                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                      diff > 0
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    }`}
                                  >
                                    {diff > 0 ? `▲ +${diff} UP` : `▼ ${diff}`}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{sk.name}</h3>
                              {sk.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sk.description}</p>
                              )}
                            </div>

                            {/* 次期目標レベル設定 + メモ開閉 */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 px-2.5 py-1 rounded-xl">
                                <Target size={12} className="text-amber-600 dark:text-amber-400" />
                                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">目標:</span>
                                <select
                                  value={targetScore}
                                  onChange={(e) => handleSetTarget(sk.id, Number(e.target.value))}
                                  className="bg-transparent text-xs font-extrabold text-amber-800 dark:text-amber-200 focus:outline-none cursor-pointer"
                                >
                                  {[1, 2, 3, 4, 5].map((lv) => (
                                    <option key={lv} value={lv} className="bg-white dark:bg-slate-900">
                                      Lv.{lv}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <button
                                onClick={() => setOpenNoteSkillId(openNoteSkillId === sk.id ? null : sk.id)}
                                className={`p-1.5 rounded-xl border text-xs font-bold transition-colors ${
                                  skillNote
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                                }`}
                                title="根拠・実績メモを入力"
                              >
                                <FileText size={14} />
                              </button>
                            </div>
                          </div>

                          {/* 5段階自己評価ボタングループ (要件1: 5段階で自己評価できる) */}
                          <div className="grid grid-cols-5 gap-2 mt-3">
                            {LEVEL_DEFINITIONS.map((def) => {
                              const isSelected = currentScore === def.level;
                              return (
                                <button
                                  key={def.level}
                                  type="button"
                                  onClick={() => handleSetScore(sk.id, def.level)}
                                  className={`py-2.5 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                                    isSelected
                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                                      : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="text-sm sm:text-base font-black">Lv.{def.level}</span>
                                  <span
                                    className={`text-[10px] font-bold mt-0.5 line-clamp-1 ${
                                      isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                  >
                                    {def.short.replace(`Lv.${def.level} `, '')}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {/* 選択中のレベル基準説明 */}
                          {selectedMeta && (
                            <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between">
                              <span>
                                <strong className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {selectedMeta.label}:
                                </strong>{' '}
                                {selectedMeta.desc}
                              </span>
                            </div>
                          )}

                          {/* 項目別メモ欄 */}
                          {(openNoteSkillId === sk.id || skillNote) && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                              <input
                                type="text"
                                value={skillNote}
                                onChange={(e) => handleSetSkillNote(sk.id, e.target.value)}
                                placeholder="具体的な実績や習得中の資格・課題メモを記入（任意）"
                                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* 右1カラム: リアルタイムスキルレーダー＆振り返りコメント・グループ長フィードバック */}
              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm sticky top-28 space-y-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center justify-between">
                      <span>スキルバランス（リアルタイム）</span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        進捗 {myStats.progressPct}%
                      </span>
                    </h3>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${myStats.progressPct}%` }}
                      />
                    </div>
                  </div>

                  <RadarChart
                    axes={myStats.radarAxes}
                    size={260}
                    showCompare={Boolean(comparePeriod)}
                    showTarget={true}
                    primaryLabel={currentPeriod?.name || '今期'}
                    compareLabel={comparePeriod?.name || '前期'}
                  />

                  {/* 自己評価総括コメント */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
                      今期の振り返り・次期に向けた目標コメント
                    </label>
                    <textarea
                      rows={3}
                      value={myCurrentEval.selfComment || ''}
                      onChange={(e) =>
                        saveEvaluationDoc(selectedPeriodId, activeMemberId, {
                          selfComment: e.target.value,
                          status: 'submitted'
                        })
                      }
                      placeholder="今期成長した点や、次期重点的に習得したいスキルを記入してください"
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* グループ長からのフィードバック表示 */}
                  {myCurrentEval.managerComment && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/70">
                      <div className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                        <MessageCircle size={13} />
                        グループ長からのフィードバックコメント
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {myCurrentEval.managerComment}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      saveEvaluationDoc(selectedPeriodId, activeMemberId, { status: 'submitted' });
                      showToast('自己評価を確定・提出済としてマークしました！');
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <CheckCircle size={15} />
                    今期の自己評価を提出完了にする
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* メンバータブ2: 個人スキル分析・半期推移 (要件2 & 要件5) */}
          {memberTab === 'growth' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 半期比較テーブル */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                  半期ごとの成長推移・目標ギャップ一覧
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {comparePeriod ? `${comparePeriod.name} と ${currentPeriod?.name} の比較` : `${currentPeriod?.name} の評価詳細`}
                </p>

                <div className="space-y-2.5">
                  {activeSkills.map((sk) => {
                    const cur = Number(myCurrentEval.scores?.[sk.id]) || 0;
                    const prev = Number(myCompareEval.scores?.[sk.id]) || 0;
                    const target = Number(myCurrentEval.targets?.[sk.id]) || sk.requiredLevel || 3;
                    const diff = cur > 0 && prev > 0 ? cur - prev : 0;
                    return (
                      <div
                        key={sk.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="text-[10px] font-bold text-slate-400">{sk.category}</div>
                          <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                            {sk.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {comparePeriod && (
                            <span className="text-xs font-bold text-slate-400">
                              前期: {prev > 0 ? `Lv.${prev}` : '-'}
                            </span>
                          )}
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                            今期: {cur > 0 ? `Lv.${cur}` : '未'}
                          </span>
                          {diff !== 0 && (
                            <span
                              className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                                diff > 0
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            目標 Lv.{target}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 強み＆重点育成スキル抽出 */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-3">
                    <Trophy size={18} />
                    あなたの強み・リードできるスキル (Lv.4〜5)
                  </h3>
                  <div className="space-y-2">
                    {activeSkills.filter((sk) => (Number(myCurrentEval.scores?.[sk.id]) || 0) >= 4).length === 0 ? (
                      <p className="text-xs text-slate-400">Lv.4以上の項目を達成するとここに表示されます</p>
                    ) : (
                      activeSkills
                        .filter((sk) => (Number(myCurrentEval.scores?.[sk.id]) || 0) >= 4)
                        .map((sk) => (
                          <div
                            key={sk.id}
                            className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 flex items-center justify-between"
                          >
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{sk.name}</span>
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                              Lv.{myCurrentEval.scores?.[sk.id]}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-base font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 mb-3">
                    <Target size={18} />
                    次期重点ステップアップ候補（目標とのギャップあり）
                  </h3>
                  <div className="space-y-2">
                    {activeSkills
                      .filter((sk) => {
                        const cur = Number(myCurrentEval.scores?.[sk.id]) || 0;
                        const tgt = Number(myCurrentEval.targets?.[sk.id]) || sk.requiredLevel || 3;
                        return cur > 0 && cur < tgt;
                      })
                      .map((sk) => {
                        const cur = Number(myCurrentEval.scores?.[sk.id]) || 0;
                        const tgt = Number(myCurrentEval.targets?.[sk.id]) || sk.requiredLevel || 3;
                        return (
                          <div
                            key={sk.id}
                            className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 flex items-center justify-between"
                          >
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{sk.name}</span>
                            <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                              現在 Lv.{cur} → 目標 Lv.{tgt}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* メンバータブ3: 5段階評価基準ガイド */}
          {memberTab === 'guide' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                5段階スキル評価基準ガイドライン
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                自己評価を行う際は、以下の共通基準に照らし合わせて客観的にレベルを選択してください。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {LEVEL_DEFINITIONS.map((def) => (
                  <div
                    key={def.level}
                    className={`p-4 rounded-2xl border ${def.bg} ${def.border} flex flex-col justify-between`}
                  >
                    <div>
                      <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-lg mb-2 ${def.badge}`}>
                        レベル {def.level}
                      </span>
                      <h4 className={`text-sm font-extrabold ${def.text} mb-2`}>{def.label}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{def.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      {/* =====================================================================
          13. グループ長（管理者）専用ビュー (要件3, 4, 5, 6, 7, 8)
      ===================================================================== */}
      {sessionRole === 'manager' && managerStats && (
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
          {/* グループ長サマリーKPIバー */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>対象メンバー数</span>
                <Users size={15} className="text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {managerStats.filteredMembers.length} <span className="text-xs font-bold text-slate-400">名</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                100%入力完了: {managerStats.submittedMembersCount}名
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>グループ全体平均レベル</span>
                <Activity size={15} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                Lv.{managerStats.teamOverallAvg.toFixed(2)}
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-1">
                全 {activeSkills.length} スキル項目の総合平均
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>要育成・属人化注意スキル</span>
                <AlertTriangle size={15} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {Object.values(managerStats.skillAggregates).filter((a) => a.isShortage).length}{' '}
                <span className="text-xs font-bold text-slate-400">項目</span>
              </div>
              <div className="text-[11px] font-bold text-slate-400 mt-1">
                Lv.3以上の保有者が2名未満の項目
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>クイック出力・保全</span>
                <Download size={15} className="text-sky-500" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleExportCSV}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold text-center transition-colors"
                >
                  Excel CSV出力
                </button>
                <button
                  onClick={() => handleCreateCloudBackup('グループ長手動保存')}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-extrabold transition-colors"
                >
                  保全
                </button>
              </div>
            </div>
          </div>

          {/* =================================================================
              グループ長タブ1: 全体スキルマップ一覧マトリクス (要件3 & 要件4)
          ================================================================= */}
          {managerTab === 'matrix' && (
            <div className="space-y-4">
              {/* フィルタ＆表示コントロールバー */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* 検索 */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                      placeholder="メンバー名・役職で検索..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* カテゴリ絞込 */}
                  <select
                    value={matrixCategoryFilter}
                    onChange={(e) => setMatrixCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold focus:outline-none"
                  >
                    <option value="ALL">全スキルカテゴリ ({activeSkills.length})</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* 部署絞込 */}
                  <select
                    value={matrixDeptFilter}
                    onChange={(e) => setMatrixDeptFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold focus:outline-none"
                  >
                    <option value="ALL">全グループ・部署</option>
                    {Array.from(new Set(members.map((m) => m.department).filter(Boolean))).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>

                  {/* 在籍ステータス絞込 */}
                  <select
                    value={matrixStatusFilter}
                    onChange={(e) => setMatrixStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold focus:outline-none"
                  >
                    <option value="active">在籍メンバーのみ</option>
                    <option value="ALL">異動・退職含む全員</option>
                    {MEMBER_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}のみ
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {/* 並び替え */}
                  <select
                    value={matrixSortBy}
                    onChange={(e) => setMatrixSortBy(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold focus:outline-none"
                  >
                    <option value="order">標準順</option>
                    <option value="avg_desc">平均スコア高い順</option>
                    <option value="avg_asc">平均スコア低い順</option>
                    <option value="growth_desc">前期比成長順</option>
                  </select>

                  {/* 前期比バッジ表示トグル */}
                  {comparePeriod && (
                    <button
                      onClick={() => setMatrixShowDiff(!matrixShowDiff)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                        matrixShowDiff
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'
                      }`}
                    >
                      前期比差分 {matrixShowDiff ? 'ON' : 'OFF'}
                    </button>
                  )}
                </div>
              </div>

              {/* マトリクス表本体 (要件3: グループ長は全メンバーの自己評価を表形式で確認できる) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                        <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 px-4 py-3.5 min-w-[210px] text-xs font-black text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700">
                          メンバー（クリックで詳細・1on1）
                        </th>
                        <th className="px-3 py-3.5 text-center text-xs font-black text-slate-700 dark:text-slate-200 min-w-[84px] border-r border-slate-200 dark:border-slate-700">
                          平均 / 前期比
                        </th>
                        {activeSkills
                          .filter((s) => matrixCategoryFilter === 'ALL' || s.category === matrixCategoryFilter)
                          .map((sk) => {
                            const agg = managerStats.skillAggregates[sk.id] || {};
                            const catStyle = getCategoryStyle(sk.category);
                            return (
                              <th
                                key={sk.id}
                                className="px-2.5 py-3 text-center min-w-[108px] max-w-[130px] border-r border-slate-200/60 dark:border-slate-800 align-top"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${catStyle.badge}`}>
                                    {sk.category}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
                                    {sk.name}
                                  </span>
                                  {agg.isShortage && (
                                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                      <AlertTriangle size={10} />
                                      要育成
                                    </span>
                                  )}
                                </div>
                              </th>
                            );
                          })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {managerStats.filteredMembers.map((m) => {
                        const visibleSkills = activeSkills.filter(
                          (s) => matrixCategoryFilter === 'ALL' || s.category === matrixCategoryFilter
                        );

                        return (
                          <tr
                            key={m.id}
                            className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
                          >
                            {/* 固定左列: メンバー情報 */}
                            <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-4 py-3 border-r border-slate-200 dark:border-slate-800">
                              <button
                                onClick={() => {
                                  setInspectingMemberId(m.id);
                                  setManagerFeedbackDraft(m.evalDoc.managerComment || '');
                                }}
                                className="flex items-center gap-2.5 text-left w-full group"
                              >
                                <div
                                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                                    m.avatarColor || 'from-indigo-500 to-blue-600'
                                  } flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm`}
                                >
                                  {m.name.slice(0, 1)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate flex items-center gap-1">
                                    {m.name}
                                    {m.status !== 'active' && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {MEMBER_STATUSES.find((s) => s.value === m.status)?.label}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-400 truncate">
                                    {m.department} ・ {m.roleTitle}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Clock size={9} />
                                    {formatTimeAgo(m.evalDoc.updatedAt)}
                                  </div>
                                </div>
                              </button>
                            </td>

                            {/* 平均スコア列 */}
                            <td className="px-3 py-3 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                              <div className="text-sm font-black text-slate-900 dark:text-white">
                                {m.avg > 0 ? m.avg.toFixed(2) : '-'}
                              </div>
                              {matrixShowDiff && comparePeriod && m.diffAvg !== 0 && (
                                <div
                                  className={`text-[10px] font-extrabold ${
                                    m.diffAvg > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                                  }`}
                                >
                                  {m.diffAvg > 0 ? `+${m.diffAvg.toFixed(2)}` : m.diffAvg.toFixed(2)}
                                </div>
                              )}
                            </td>

                            {/* 各スキル評価ヒートマップセル */}
                            {visibleSkills.map((sk) => {
                              const val = Number(m.evalDoc.scores?.[sk.id]) || 0;
                              const prevVal = Number(m.prevEvalDoc.scores?.[sk.id]) || 0;
                              const diff = val > 0 && prevVal > 0 ? val - prevVal : 0;
                              const meta = getLevelMeta(val);
                              const note = m.evalDoc.notes?.[sk.id];

                              return (
                                <td
                                  key={sk.id}
                                  className="p-1.5 text-center border-r border-slate-100 dark:border-slate-800/60"
                                >
                                  {val > 0 ? (
                                    <div
                                      title={`${m.name} - ${sk.name}: Lv.${val}${note ? ` (メモ: ${note})` : ''}`}
                                      className={`mx-auto w-full max-w-[88px] py-1.5 px-2 rounded-xl border font-black text-xs flex items-center justify-center gap-1 ${meta?.cell}`}
                                    >
                                      <span>Lv.{val}</span>
                                      {matrixShowDiff && diff !== 0 && (
                                        <span
                                          className={`text-[9px] font-extrabold ${
                                            diff > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-500'
                                          }`}
                                        >
                                          {diff > 0 ? `↑${diff}` : `↓${Math.abs(diff)}`}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-300 dark:text-slate-700">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {/* 最下行: スキル別チーム平均＆Lv.3以上充足人数サマリー */}
                      <tr className="bg-indigo-50/60 dark:bg-indigo-950/40 border-t-2 border-indigo-200 dark:border-indigo-800 font-extrabold">
                        <td className="sticky left-0 z-10 bg-indigo-50 dark:bg-slate-900 px-4 py-3 text-xs font-black text-indigo-900 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-800">
                          項目別平均 / 一人前(Lv.3+)人数
                        </td>
                        <td className="px-3 py-3 text-center text-xs font-black text-indigo-700 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-800">
                          全体 {managerStats.teamOverallAvg.toFixed(2)}
                        </td>
                        {activeSkills
                          .filter((s) => matrixCategoryFilter === 'ALL' || s.category === matrixCategoryFilter)
                          .map((sk) => {
                            const agg = managerStats.skillAggregates[sk.id] || { avg: 0, qualifiedCount: 0 };
                            return (
                              <td key={sk.id} className="px-2 py-2.5 text-center border-r border-slate-200/50 dark:border-slate-800">
                                <div className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                                  平均 {agg.avg.toFixed(1)}
                                </div>
                                <div
                                  className={`text-[10px] font-extrabold mt-0.5 ${
                                    agg.isShortage ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                                  }`}
                                >
                                  Lv.3+: {agg.qualifiedCount}名
                                </div>
                              </td>
                            );
                          })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              グループ長タブ2: 組織分析・育成優先度 (レーダー・ギャップ分析)
          ================================================================= */}
          {managerTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* グループ全体スキルレーダー */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col items-center">
                <div className="w-full mb-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    グループ全体 カテゴリ別スキルバランス
                  </h3>
                  <p className="text-xs text-slate-500">
                    全メンバーの平均値を前期（{comparePeriod?.name || '比較期'}）と重ねて表示しています
                  </p>
                </div>
                <RadarChart
                  axes={managerStats.teamRadarAxes}
                  size={310}
                  showCompare={Boolean(comparePeriod)}
                  showTarget={true}
                  primaryLabel={currentPeriod?.name || '今期チーム平均'}
                  compareLabel={comparePeriod?.name || '前期チーム平均'}
                />
              </div>

              {/* ボトルネック・属人化リスク分析リスト */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    スキル充足度・優先育成ランキング
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    チーム平均が低い順に表示しています。Lv.3（独力遂行）以上の人数が少ない項目は優先的なOJT対象です。
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {[...activeSkills]
                    .sort(
                      (a, b) =>
                        (managerStats.skillAggregates[a.id]?.avg || 0) -
                        (managerStats.skillAggregates[b.id]?.avg || 0)
                    )
                    .map((sk) => {
                      const agg = managerStats.skillAggregates[sk.id] || { avg: 0, qualifiedCount: 0, expertCount: 0 };
                      const pct = Math.min(100, Math.round((agg.avg / 5) * 100));
                      return (
                        <div
                          key={sk.id}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 mr-2">{sk.category}</span>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-white">{sk.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  agg.isShortage
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                一人前(Lv.3+): {agg.qualifiedCount}名 / 指導者(Lv.4+): {agg.expertCount}名
                              </span>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                平均 {agg.avg.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                agg.avg < 2.8 ? 'bg-amber-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              グループ長タブ3: メンバー管理 (要件6: 追加・異動・退職などに対応)
          ================================================================= */}
          {managerTab === 'members' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    メンバー管理（追加・異動・退職・ロール設定）
                  </h3>
                  <p className="text-xs text-slate-500">
                    プログラム修正なしでメンバーの追加や部署異動・退職ステータス変更を行えます。過去期間の評価履歴はそのまま保全されます。
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingMember({
                      name: '',
                      department: '第1グループ',
                      roleTitle: 'メンバー',
                      grade: 'G2',
                      status: 'active',
                      pin: '',
                      avatarColor: 'from-indigo-500 to-blue-600',
                      order: members.length + 1
                    });
                    setShowMemberModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm shrink-0"
                >
                  <UserPlus size={15} />
                  新規メンバーを追加
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((m) => {
                  const stObj = MEMBER_STATUSES.find((s) => s.value === m.status) || MEMBER_STATUSES[0];
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${
                            m.avatarColor || 'from-indigo-500 to-blue-600'
                          } flex items-center justify-center text-white font-black text-sm shrink-0`}
                        >
                          {m.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {m.name}
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${stObj.badge}`}>
                              {stObj.label}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-500 truncate mt-0.5">
                            {m.department} ・ {m.roleTitle} ({m.grade})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingMember({ ...m });
                            setShowMemberModal(true);
                          }}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          title="編集・異動・ステータス変更"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-500 border border-slate-200 dark:border-slate-700"
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              グループ長タブ4: 評価項目管理 (要件7: 評価項目の追加・変更に対応)
          ================================================================= */}
          {managerTab === 'skills' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    評価項目（スキル項目）マスター管理
                  </h3>
                  <p className="text-xs text-slate-500">
                    評価項目の追加・名称変更・カテゴリ整理・推奨レベル設定を画面上から自由に行えます（非機能要件: 保守性）。
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingSkill({
                      name: '',
                      category: categories[0] || '専門技術・実務',
                      description: '',
                      requiredLevel: 3,
                      active: true,
                      order: skills.length + 1
                    });
                    setShowSkillModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-sm shrink-0"
                >
                  <Plus size={15} />
                  新規スキル項目を追加
                </button>
              </div>

              {/* カテゴリの追加バー */}
              <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mr-2">登録カテゴリ:</span>
                {categories.map((c) => (
                  <span
                    key={c}
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${getCategoryStyle(c).badge}`}
                  >
                    {c}
                  </span>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="新しいカテゴリ名..."
                    className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                  <button
                    onClick={() => {
                      if (!newCategoryName.trim()) return;
                      if (!categories.includes(newCategoryName.trim())) {
                        updateSystemConfig({ categories: [...categories, newCategoryName.trim()] });
                      }
                      setNewCategoryName('');
                      showToast('カテゴリを追加しました');
                    }}
                    className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold"
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* スキル項目リスト */}
              <div className="space-y-2.5">
                {skills.map((sk, idx) => {
                  const catStyle = getCategoryStyle(sk.category);
                  return (
                    <div
                      key={sk.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        sk.active !== false
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          : 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex flex-col gap-1 pt-0.5">
                          <button
                            onClick={() => handleMoveSkillOrder(sk.id, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => handleMoveSkillOrder(sk.id, 'down')}
                            disabled={idx === skills.length - 1}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${catStyle.badge}`}>
                              {sk.category}
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">{sk.name}</span>
                            <span className="text-[11px] font-bold text-slate-400">
                              推奨基準: Lv.{sk.requiredLevel || 3}
                            </span>
                            {sk.active === false && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                                非表示（アーカイブ）
                              </span>
                            )}
                          </div>
                          {sk.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sk.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingSkill({ ...sk });
                            setShowSkillModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                        >
                          <Edit2 size={13} />
                          編集
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              グループ長タブ5: 半期管理・データ保全・セキュリティ設定 (要件5 & 非機能要件)
          ================================================================= */}
          {managerTab === 'periods' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 半期評価期間の管理 */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      半期ごとの評価期間管理
                    </h3>
                    <p className="text-xs text-slate-500">
                      半期ごとに期間を追加し、過去期間の評価をロック・保持したまま新しい期の評価を開始できます。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNewPeriodForm({
                        name: '2027年度 上期',
                        code: '2027-1H',
                        startDate: '2027-04-01',
                        endDate: '2027-09-30',
                        copyFromPeriodId: selectedPeriodId
                      });
                      setShowPeriodModal(true);
                    }}
                    className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={14} />
                    新しい半期を追加
                  </button>
                </div>

                <div className="space-y-2.5">
                  {periods.map((p) => (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                        p.isCurrent
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{p.name}</span>
                          {p.isCurrent && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                              現在の対象期間
                            </span>
                          )}
                          {p.isLocked && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              🔒 確定ロック中
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-bold mt-0.5">
                          期間: {p.startDate || '-'} 〜 {p.endDate || '-'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!p.isCurrent && (
                          <button
                            onClick={() => handleSetCurrentPeriod(p.id)}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold hover:bg-indigo-50"
                          >
                            現在期に設定
                          </button>
                        )}
                        <button
                          onClick={() => handleTogglePeriodLock(p)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold"
                        >
                          {p.isLocked ? 'ロック解除' : '確定ロック'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* セキュリティ・組織名設定 */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    アクセス制御・セキュリティ設定
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">グループ・組織名</label>
                      <input
                        type="text"
                        value={systemConfig.orgName || ''}
                        onChange={(e) => updateSystemConfig({ orgName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        グループ長パスコード変更（現在: {systemConfig.managerPin || '0000'}）
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newManagerPin}
                          onChange={(e) => setNewManagerPin(e.target.value)}
                          placeholder="新しい暗証番号"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                        />
                        <button
                          onClick={() => {
                            if (!newManagerPin.trim()) return;
                            updateSystemConfig({ managerPin: newManagerPin.trim() });
                            setNewManagerPin('');
                            showToast('グループ長パスコードを更新しました');
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold"
                        >
                          変更
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(systemConfig.requireMemberPin)}
                      onChange={(e) => updateSystemConfig({ requireMemberPin: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    メンバーログイン時にも個人PINコード（設定されている場合）を必須にする
                  </label>
                </div>
              </div>

              {/* データ保全・バックアップ・復元 (非機能要件: データ保全) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    データ保全・バックアップ＆復元センター
                  </h3>
                  <p className="text-xs text-slate-500">
                    誤操作やデータ消失に備え、クラウドスナップショット保存やJSONファイル出力・復元がワンクリックで行えます。
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleCreateCloudBackup('手動バックアップ')}
                    className="py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} />
                    クラウド保全作成
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="py-2.5 px-3 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                  >
                    <Download size={14} />
                    JSONフル保存
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-extrabold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    JSONから復元
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </div>

                {/* スナップショット一覧 */}
                <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                  <div className="text-xs font-extrabold text-slate-400">保存済みスナップショット履歴</div>
                  {backups.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      まだスナップショットはありません。「クラウド保全作成」を押すと即座に記録されます。
                    </p>
                  ) : (
                    backups.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{b.label}</div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {formatTimeAgo(b.createdAt)} ・ メンバー{b.memberCount}名 / スキル{b.skillCount}項目
                          </div>
                        </div>
                        <button
                          onClick={() => handleRestoreBackup(b)}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
                        >
                          この時点に復元
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">初期デモデータのリセット</span>
                  <button
                    onClick={() => {
                      if (window.confirm('サンプル初期データを再投入しますか？')) {
                        seedInitialDataToFirestore(true);
                      }
                    }}
                    className="text-xs font-extrabold text-rose-500 hover:underline"
                  >
                    サンプル初期状態に戻す
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* =====================================================================
          14. モーダル＆ドロワー群 (グループ長用 1on1 詳細ドロワー / メンバー編集 / スキル編集 / 期間追加)
      ===================================================================== */}
      {/* メンバー個人詳細・1on1フィードバックドロワー */}
      {sessionRole === 'manager' && inspectingMemberId && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          {(() => {
            const targetMember = managerStats?.filteredMembers.find((m) => m.id === inspectingMemberId) ||
              members.find((m) => m.id === inspectingMemberId);
            if (!targetMember) return null;
            const ev = evaluations[`${PREFIX_EVAL}${selectedPeriodId}_${targetMember.id}`] || { scores: {}, targets: {}, notes: {} };
            const prevEv = comparePeriodId
              ? evaluations[`${PREFIX_EVAL}${comparePeriodId}_${targetMember.id}`] || { scores: {} }
              : { scores: {} };

            const memberRadarAxes = categories.map((cat) => {
              const catSkills = activeSkills.filter((s) => s.category === cat);
              const cVals = catSkills.map((s) => Number(ev.scores?.[s.id]) || 0).filter((v) => v > 0);
              const pVals = catSkills.map((s) => Number(prevEv.scores?.[s.id]) || 0).filter((v) => v > 0);
              return {
                label: cat,
                value: cVals.length > 0 ? cVals.reduce((a, b) => a + b, 0) / cVals.length : 0,
                compareValue: pVals.length > 0 ? pVals.reduce((a, b) => a + b, 0) / pVals.length : 0,
                targetValue: 3
              };
            });

            return (
              <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full overflow-y-auto p-6 shadow-2xl border-l border-slate-200 dark:border-slate-800 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                        targetMember.avatarColor || 'from-indigo-500 to-blue-600'
                      } flex items-center justify-center text-white font-black text-lg`}
                    >
                      {targetMember.name.slice(0, 1)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{targetMember.name}</h3>
                      <p className="text-xs font-bold text-slate-400">
                        {targetMember.department} ・ {targetMember.roleTitle} ({targetMember.grade})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInspectingMemberId(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                <RadarChart
                  axes={memberRadarAxes}
                  size={260}
                  showCompare={Boolean(comparePeriod)}
                  primaryLabel={currentPeriod?.name || '今期'}
                  compareLabel={comparePeriod?.name || '前期'}
                />

                {/* 本人コメント */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-extrabold text-slate-500 mb-1">本人の振り返り・目標コメント</div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {ev.selfComment || '（まだコメントは入力されていません）'}
                  </p>
                </div>

                {/* グループ長フィードバック入力 */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <label className="block text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
                    グループ長からの1on1フィードバックコメント（本人の画面にも表示されます）
                  </label>
                  <textarea
                    rows={3}
                    value={managerFeedbackDraft}
                    onChange={(e) => setManagerFeedbackDraft(e.target.value)}
                    placeholder="強みの称賛や、次期に期待する役割・習得してほしいスキルを記入..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      saveEvaluationDoc(selectedPeriodId, targetMember.id, {
                        managerComment: managerFeedbackDraft
                      });
                      showToast(`${targetMember.name} さんへのフィードバックを保存しました`);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    フィードバックを保存して反映
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* メンバー追加・編集モーダル */}
      {showMemberModal && editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingMember.id ? 'メンバー情報の編集' : '新規メンバーの追加'}
              </h3>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">氏名 *</label>
                <input
                  type="text"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  placeholder="例: 山田 太郎"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">所属グループ・部署</label>
                  <input
                    type="text"
                    value={editingMember.department || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, department: e.target.value })}
                    placeholder="第1グループ"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">役職・役割</label>
                  <input
                    type="text"
                    value={editingMember.roleTitle || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, roleTitle: e.target.value })}
                    placeholder="リーダー / メンバー"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">等級・グレード</label>
                  <input
                    type="text"
                    value={editingMember.grade || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, grade: e.target.value })}
                    placeholder="G2"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">在籍ステータス</label>
                  <select
                    value={editingMember.status || 'active'}
                    onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    {MEMBER_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">個人PIN(任意)</label>
                  <input
                    type="text"
                    value={editingMember.pin || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, pin: e.target.value })}
                    placeholder="未設定可"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setShowMemberModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!editingMember.name.trim()) {
                    showToast('氏名を入力してください', 'error');
                    return;
                  }
                  handleSaveMember(editingMember);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スキル評価項目追加・編集モーダル */}
      {showSkillModal && editingSkill && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {editingSkill.id ? '評価項目の編集' : '新規評価項目の追加'}
              </h3>
              <button onClick={() => setShowSkillModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">カテゴリ</label>
                <select
                  value={editingSkill.category}
                  onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">評価項目名（スキル名） *</label>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  placeholder="例: 顧客折衝・要件定義"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">評価基準・説明文</label>
                <textarea
                  rows={2}
                  value={editingSkill.description || ''}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                  placeholder="どのような状態であればLv.3（独力遂行）と言えるかの目安"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">推奨基準レベル</label>
                  <select
                    value={editingSkill.requiredLevel || 3}
                    onChange={(e) => setEditingSkill({ ...editingSkill, requiredLevel: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map((lv) => (
                      <option key={lv} value={lv}>
                        Lv.{lv}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingSkill.active !== false}
                      onChange={(e) => setEditingSkill({ ...editingSkill, active: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    有効な評価項目として表示
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setShowSkillModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!editingSkill.name.trim()) {
                    showToast('評価項目名を入力してください', 'error');
                    return;
                  }
                  handleSaveSkill(editingSkill);
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規半期期間作成モーダル */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">新しい半期評価期間の追加</h3>
              <button onClick={() => setShowPeriodModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">期間名称 *</label>
                <input
                  type="text"
                  value={newPeriodForm.name}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, name: e.target.value })}
                  placeholder="例: 2027年度 上期"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">開始日</label>
                  <input
                    type="date"
                    value={newPeriodForm.startDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">終了日</label>
                  <input
                    type="date"
                    value={newPeriodForm.endDate}
                    onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  前期の評価スコアを初期値として引き継ぐ（推奨）
                </label>
                <select
                  value={newPeriodForm.copyFromPeriodId}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, copyFromPeriodId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  <option value="">引き継がない（すべて未入力から開始）</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} の評価結果をベースにコピー
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                onClick={() => setShowPeriodModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreatePeriod}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold"
              >
                期間を作成して開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}