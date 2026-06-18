import { create } from 'zustand';
import type {
  Clue,
  Report,
  ReportSection,
  FilterParams,
  SensitiveMark,
  ReviewRecord,
} from '../shared/types';
import { reports as initialReports } from '../data/reports';
import { reviews as initialReviews } from '../data/reviews';

const REPORTS_STORAGE_KEY = 'opinion-reports';
const REVIEWS_STORAGE_KEY = 'opinion-reviews';

const TEMPLATE_KEY_LABELS: Record<string, string> = {
  daily: '日报',
  urgent: '突发快报',
  topic: '专题跟踪',
};

const TEMPLATE_TYPE_MAP: Record<string, Report['type']> = {
  daily: 'daily',
  urgent: 'special',
  topic: 'special',
};

const TEMPLATE_TITLE_MAP: Record<Report['type'], string> = {
  daily: '舆情专报（日报）',
  weekly: '舆情专报（周报）',
  monthly: '舆情专报（月报）',
  special: '专题报告',
};

const SECTION_TEMPLATES: Array<{
  order: number;
  type: ReportSection['type'];
  title: string;
}> = [
  { order: 1, type: 'summary', title: '一、事件概述' },
  { order: 2, type: 'statistics', title: '二、传播情况' },
  { order: 3, type: 'list', title: '三、网民诉求' },
  { order: 4, type: 'analysis', title: '四、风险研判' },
  { order: 5, type: 'custom', title: '五、处置建议' },
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function generateOverview(clues: Clue[]): string {
  const locationCount = new Set(clues.map((c) => c.location).filter(Boolean)).size;
  const heatMax = clues.reduce((m, c) => Math.max(m, c.heat), 0);
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const hotTags = Array.from(new Set(clues.flatMap((c) => c.tags).slice(0, 5))).join('、');
  return `${dateStr}，全市共监测到重点舆情线索${clues.length}条，覆盖${locationCount}个区县。热度最高值${heatMax}，热点舆情主要集中在${hotTags}等领域。整体舆情呈${heatMax >= 85 ? '上升' : '平稳'}态势，需重点关注${clues[0]?.title.substring(0, 20)}等事件处置进展。`;
}

function generateSpread(clues: Clue[]): string {
  const totalHeat = clues.reduce((s, c) => s + c.heat, 0);
  const avgHeat = Math.round(totalHeat / Math.max(clues.length, 1));
  const sources = new Map<string, number>();
  clues.forEach((c) => {
    sources.set(c.source, (sources.get(c.source) || 0) + 1);
  });
  const sourceNames: Record<string, string> = {
    news: '新闻媒体',
    video: '短视频平台',
    forum: '论坛社区',
    hotline: '政务热线',
  };
  const sourceList = Array.from(sources.entries())
    .map(([k, v]) => `${sourceNames[k] || k}${v}条`)
    .join('、');
  const hotClues = clues.filter((c) => c.heat >= 85);
  let hotDesc = '';
  if (hotClues.length > 0) {
    hotDesc = `其中，「${hotClues[0].title.substring(0, 20)}」热度最高，热度值${hotClues[0].heat}，登上平台热搜榜单。`;
  }
  return `本次监测的${clues.length}条线索中，${sourceList}。平均热度值${avgHeat}。${hotDesc}从传播渠道看，短视频平台仍是舆情发酵的主要阵地，占比约45%；其次是新闻客户端（28%）和社交平台（20%）。高热度事件多呈现"短视频首发引爆→社交媒体二次扩散→新闻媒体深度报道→政务热线集中反映"的典型传播路径。`;
}

function generateDemands(clues: Clue[]): string {
  const uniqueTags = new Map<string, number>();
  clues.forEach((c) => {
    c.tags.forEach((t) => {
      uniqueTags.set(t, (uniqueTags.get(t) || 0) + 1);
    });
  });
  const sortedTags = Array.from(uniqueTags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t);
  const demandsDesc = sortedTags.map((t) => `关于${t}问题，网民呼吁加强监管、完善制度、公开透明处置`).join('；');
  return `综合分析${clues.length}条舆情线索，网民诉求主要集中在${sortedTags.join('、')}等方面。${demandsDesc}。此外，网民普遍希望相关部门加快调查进度，及时、透明发布权威信息，避免信息真空引发谣言和次生舆情。对于涉及民生的共性问题，呼吁建立长效机制，从制度层面防范同类事件反复发生。`;
}

function generateRisk(clues: Clue[]): string {
  const sensitiveCount = clues.filter((c) => c.sensitiveLevel >= 3).length;
  const highHeat = clues.filter((c) => c.heat >= 80).length;
  const locations = new Set(clues.map((c) => c.location).filter(Boolean));
  let overallLevel = '较低';
  if (sensitiveCount >= 2 || highHeat >= 3) {
    overallLevel = '较高';
  } else if (sensitiveCount >= 1 || highHeat >= 1) {
    overallLevel = '中高';
  }
  const risks: string[] = [];
  if (sensitiveCount > 0) {
    risks.push(`敏感等级3级以上事件${sensitiveCount}起，存在引发群体性事件或极端行为的潜在风险`);
  }
  if (highHeat > 0) {
    risks.push(`${highHeat}起高热度事件持续发酵，可能引发央媒关注和上级领导批示`);
  }
  if (locations.size >= 3) {
    risks.push(`事件涉及${locations.size}个区县，存在跨区域联动扩散风险`);
  }
  const uniqueRisks = Array.from(new Set(risks));
  return `经综合研判，本次舆情整体风险等级为「${overallLevel}」。主要风险点包括：${uniqueRisks.join('；')}。建议相关部门高度重视，按照「三同步」原则依法依规妥善处置，严防小事件演变为大舆情。同时，密切关注舆情走势，做好应对次生舆情的准备工作，对可能出现的谣言、恶意炒作等保持高压态势。`;
}

function generateSuggestion(clues: Clue[]): string {
  const deptTags = new Map<string, string[]>();
  const knownDepts = [
    '教育局', '卫健委', '交通局', '市场监管局', '应急管理局',
    '生态环境局', '住建委', '城管执法局', '文旅局', '房管局',
    '规划和自然资源委员会', '农业农村局', '信访办', '发改委', '水务局',
  ];
  clues.forEach((clue) => {
    clue.tags.forEach((tag) => {
      knownDepts.forEach((dept) => {
        if (tag.includes(dept) || dept.includes(tag)) {
          if (!deptTags.has(dept)) {
            deptTags.set(dept, []);
          }
          const locs = deptTags.get(dept)!;
          if (clue.location && !locs.includes(clue.location)) {
            locs.push(clue.location);
          }
        }
      });
    });
  });
  const suggestions: string[] = [];
  deptTags.forEach((locs, dept) => {
    const locStr = locs.length > 0 ? locs.join('、') : '相关';
    suggestions.push(`请${locStr}${dept}积极履职，加强行业监管，妥善处理涉事舆情反映问题，及时回应社会关切`);
  });
  if (suggestions.length === 0) {
    clues.forEach((clue) => {
      if (clue.location) {
        suggestions.push(`请${clue.location}相关部门核实处置「${clue.title.substring(0, 15)}」反映问题`);
      }
    });
  }
  suggestions.push('请各相关单位安排专人持续跟踪舆情动态，重要情况第一时间报送市委宣传部');
  suggestions.push('请网信部门加强网络舆情监测研判，及时处置恶意炒作和不实信息');
  return suggestions.join('；') + '。各部门应于3个工作日内反馈处置进展，重大事项随时报告。';
}

function generateSections(clues: Clue[]): ReportSection[] {
  const generators: Record<ReportSection['type'], (clues: Clue[]) => string> = {
    summary: generateOverview,
    statistics: generateSpread,
    list: generateDemands,
    analysis: generateRisk,
    chart: (c) => generateOverview(c),
    custom: generateSuggestion,
  };
  return SECTION_TEMPLATES.map((tpl) => ({
    id: generateId('sec'),
    title: tpl.title,
    order: tpl.order,
    type: tpl.type,
    required: true,
    content: generators[tpl.type](clues),
  }));
}

function generateReportTitle(type: Report['type']): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const base = TEMPLATE_TITLE_MAP[type];
  if (type === 'daily' || type === 'weekly' || type === 'monthly') {
    return `${base} ${dateStr}`;
  }
  return base;
}

function saveReportsToStorage(reports: Report[]): void {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save reports to localStorage:', e);
  }
}

function saveReviewsToStorage(reviews: ReviewRecord[]): void {
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  } catch (e) {
    console.error('Failed to save reviews to localStorage:', e);
  }
}

function loadReportsFromStorage(): Report[] {
  try {
    const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load reports from localStorage:', e);
  }
  return initialReports;
}

function loadReviewsFromStorage(): ReviewRecord[] {
  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load reviews from localStorage:', e);
  }
  return initialReviews;
}

export type TemplateType = 'daily' | 'urgent' | 'topic';

interface AppState {
  selectedClueIds: string[];
  currentReport: Report | null;
  reportsList: Report[];
  reviewRecordsList: ReviewRecord[];
  filterParams: FilterParams;
  userInfo: { id: string; name: string; role: string };
  toggleClue: (id: string) => void;
  selectAllClues: (clues: Clue[]) => void;
  clearSelected: () => void;
  setFilterParams: (params: Partial<FilterParams>) => void;
  createReport: (clues: Clue[], template: TemplateType) => Report;
  updateSection: (sectionId: string, content: string) => void;
  addSensitiveMark: (sectionId: string, mark: Omit<SensitiveMark, 'id' | 'markerId' | 'markerName' | 'markedAt'>) => void;
  updateReportStatus: (status: Report['status']) => void;
  updateReportTitle: (title: string) => void;
  submitReport: () => void;
  saveDraft: () => void;
  loadDraft: (reportId: string) => void;
  approveReport: (reportId: string, comment: string, reviewerId?: string, reviewerName?: string, reviewerRole?: string) => void;
  rejectReport: (reportId: string, reason: string, reviewerId?: string, reviewerName?: string, reviewerRole?: string) => void;
  loadPersistedData: () => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  selectedClueIds: [],
  currentReport: null,
  reportsList: [],
  reviewRecordsList: [],
  filterParams: {
    keyword: '',
    status: undefined,
    priority: undefined,
    category: undefined,
    source: undefined,
    sensitiveLevel: undefined,
    dateRange: undefined,
    handlerId: undefined,
    creatorId: undefined,
    departmentTags: undefined,
    page: 1,
    pageSize: 20,
    sortBy: 'heat',
    sortOrder: 'desc',
  },
  userInfo: {
    id: 'h001',
    name: '张明华',
    role: '宣传部舆情处值班员',
  },

  loadPersistedData: () => {
    const reports = loadReportsFromStorage();
    const reviews = loadReviewsFromStorage();
    set({
      reportsList: reports,
      reviewRecordsList: reviews,
    });
  },

  toggleClue: (id: string) => {
    set((state) => {
      const exists = state.selectedClueIds.includes(id);
      return {
        selectedClueIds: exists
          ? state.selectedClueIds.filter((x) => x !== id)
          : [...state.selectedClueIds, id],
      };
    });
  },

  selectAllClues: (clues: Clue[]) => {
    set({ selectedClueIds: clues.map((c) => c.id) });
  },

  clearSelected: () => {
    set({ selectedClueIds: [] });
  },

  setFilterParams: (params: Partial<FilterParams>) => {
    set((state) => ({
      filterParams: { ...state.filterParams, ...params },
    }));
  },

  createReport: (clues: Clue[], template: TemplateType) => {
    const now = formatDate(new Date());
    const { userInfo } = get();
    const reportType = TEMPLATE_TYPE_MAP[template] || 'daily';
    const sections = generateSections(clues);
    const pendingCount = clues.filter((c) => c.status === 'pending').length;
    const processingCount = clues.filter((c) => c.status === 'processing').length;
    const verifiedCount = clues.filter((c) => c.status === 'verified').length;
    const closedCount = clues.filter((c) => c.status === 'closed').length;
    const maxSensitive = clues.reduce((m, c) => Math.max(m, c.sensitiveLevel), 0);
    const report: Report = {
      id: generateId('report'),
      templateId: `tpl-${template}`,
      templateKey: template,
      templateName: TEMPLATE_TITLE_MAP[reportType],
      title: generateReportTitle(reportType),
      type: reportType,
      summary: generateOverview(clues),
      clueIds: clues.map((c) => c.id),
      sections,
      statistics: {
        totalClues: clues.length,
        pendingCount,
        processingCount,
        verifiedCount,
        closedCount,
      },
      status: 'draft',
      creatorId: userInfo.id,
      creatorName: userInfo.name,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isSensitive: maxSensitive >= 3,
      confidentialLevel: maxSensitive >= 4 ? 'secret' : 'internal',
    };
    set({ currentReport: report });
    return report;
  },

  updateSection: (sectionId: string, content: string) => {
    set((state) => {
      if (!state.currentReport) return state;
      return {
        currentReport: {
          ...state.currentReport,
          updatedAt: formatDate(new Date()),
          sections: state.currentReport.sections.map((s) =>
            s.id === sectionId ? { ...s, content } : s
          ),
        },
      };
    });
  },

  addSensitiveMark: (sectionId: string, mark: Omit<SensitiveMark, 'id' | 'markerId' | 'markerName' | 'markedAt'>) => {
    const { userInfo, currentReport } = get();
    if (!currentReport) return;
    const newMark: SensitiveMark = {
      ...mark,
      id: generateId('mark'),
      markerId: userInfo.id,
      markerName: userInfo.name,
      markedAt: formatDate(new Date()),
    };
    set((state) => {
      if (!state.currentReport) return state;
      const updatedSections = state.currentReport.sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            sensitiveMarks: [...(s.sensitiveMarks || []), newMark],
          };
        }
        return s;
      });
      const updatedReport = {
        ...state.currentReport,
        updatedAt: formatDate(new Date()),
        sections: updatedSections,
      };
      return {
        currentReport: updatedReport,
      };
    });
    return newMark;
  },

  updateReportStatus: (status: Report['status']) => {
    set((state) => {
      if (!state.currentReport) return state;
      const now = formatDate(new Date());
      const needsVersionBump =
        state.currentReport.status === 'rejected' &&
        (status === 'submitted' || status === 'reviewing');
      return {
        currentReport: {
          ...state.currentReport,
          status,
          updatedAt: now,
          submittedAt: status === 'submitted' || status === 'reviewing' ? now : state.currentReport.submittedAt,
          version: needsVersionBump ? state.currentReport.version + 1 : state.currentReport.version,
        },
      };
    });
  },

  updateReportTitle: (title: string) => {
    set((state) => {
      if (!state.currentReport) return state;
      return {
        currentReport: {
          ...state.currentReport,
          title,
          updatedAt: formatDate(new Date()),
        },
      };
    });
  },

  saveDraft: () => {
    const { currentReport, reportsList } = get();
    if (!currentReport) return;
    const now = formatDate(new Date());
    const updatedReport: Report = {
      ...currentReport,
      status: 'draft',
      updatedAt: now,
    };
    const existingIndex = reportsList.findIndex((r) => r.id === updatedReport.id);
    let newReportsList: Report[];
    if (existingIndex >= 0) {
      newReportsList = [...reportsList];
      newReportsList[existingIndex] = updatedReport;
    } else {
      newReportsList = [updatedReport, ...reportsList];
    }
    saveReportsToStorage(newReportsList);
    set({
      currentReport: updatedReport,
      reportsList: newReportsList,
    });
  },

  loadDraft: (reportId: string) => {
    const { reportsList } = get();
    const report = reportsList.find((r) => r.id === reportId);
    if (report) {
      set({
        currentReport: { ...report },
        selectedClueIds: [...(report.clueIds || [])],
      });
    }
  },

  approveReport: (reportId: string, comment: string, reviewerId?: string, reviewerName?: string, reviewerRole?: string) => {
    const { reportsList, reviewRecordsList, userInfo } = get();
    const reportIndex = reportsList.findIndex((r) => r.id === reportId);
    if (reportIndex < 0) return;
    const now = formatDate(new Date());
    const rId = reviewerId || userInfo.id;
    const rName = reviewerName || userInfo.name;
    const rRole = reviewerRole || userInfo.role;
    const updatedReport: Report = {
      ...reportsList[reportIndex],
      status: 'approved',
      updatedAt: now,
      approverId: rId,
      approverName: rName,
      approvedAt: now,
    };
    const newReportsList = [...reportsList];
    newReportsList[reportIndex] = updatedReport;

    const newReviewRecord: ReviewRecord = {
      id: generateId('rv'),
      targetId: reportId,
      targetType: 'report',
      action: 'approve',
      result: 'pass',
      comment,
      reviewerId: rId,
      reviewerName: rName,
      reviewerRole: rRole,
      createdAt: now,
      changes: [
        { field: 'status', oldValue: reportsList[reportIndex].status, newValue: 'approved' },
      ],
    };
    const newReviewRecordsList = [...reviewRecordsList, newReviewRecord];

    saveReportsToStorage(newReportsList);
    saveReviewsToStorage(newReviewRecordsList);

    set({
      reportsList: newReportsList,
      reviewRecordsList: newReviewRecordsList,
    });
  },

  rejectReport: (reportId: string, reason: string, reviewerId?: string, reviewerName?: string, reviewerRole?: string) => {
    const { reportsList, reviewRecordsList, userInfo } = get();
    const reportIndex = reportsList.findIndex((r) => r.id === reportId);
    if (reportIndex < 0) return;
    const now = formatDate(new Date());
    const rId = reviewerId || userInfo.id;
    const rName = reviewerName || userInfo.name;
    const rRole = reviewerRole || userInfo.role;
    const updatedReport: Report = {
      ...reportsList[reportIndex],
      status: 'rejected',
      updatedAt: now,
      rejectReason: reason,
    };
    const newReportsList = [...reportsList];
    newReportsList[reportIndex] = updatedReport;

    const newReviewRecord: ReviewRecord = {
      id: generateId('rv'),
      targetId: reportId,
      targetType: 'report',
      action: 'reject',
      result: 'fail',
      comment: reason,
      reviewerId: rId,
      reviewerName: rName,
      reviewerRole: rRole,
      createdAt: now,
      changes: [
        { field: 'status', oldValue: reportsList[reportIndex].status, newValue: 'rejected' },
        { field: 'rejectReason', oldValue: reportsList[reportIndex].rejectReason || '', newValue: reason },
      ],
    };
    const newReviewRecordsList = [...reviewRecordsList, newReviewRecord];

    saveReportsToStorage(newReportsList);
    saveReviewsToStorage(newReviewRecordsList);

    set({
      reportsList: newReportsList,
      reviewRecordsList: newReviewRecordsList,
    });
  },

  submitReport: () => {
    const { currentReport, userInfo, reportsList, reviewRecordsList } = get();
    if (!currentReport) return;
    const now = formatDate(new Date());
    const updatedReport: Report = {
      ...currentReport,
      status: 'submitted',
      updatedAt: now,
      submittedAt: now,
      creatorId: userInfo.id,
      creatorName: userInfo.name,
    };

    const existingIndex = reportsList.findIndex((r) => r.id === updatedReport.id);
    let newReportsList: Report[];
    if (existingIndex >= 0) {
      newReportsList = [...reportsList];
      newReportsList[existingIndex] = updatedReport;
    } else {
      newReportsList = [updatedReport, ...reportsList];
    }

    const newReviewRecord: ReviewRecord = {
      id: generateId('rv'),
      targetId: updatedReport.id,
      targetType: 'report',
      action: 'submit',
      result: 'pending',
      reviewerId: userInfo.id,
      reviewerName: userInfo.name,
      reviewerRole: userInfo.role,
      createdAt: now,
      changes: [
        { field: 'status', oldValue: currentReport.status, newValue: 'submitted' },
      ],
    };

    const newReviewRecordsList = [...reviewRecordsList, newReviewRecord];

    saveReportsToStorage(newReportsList);
    saveReviewsToStorage(newReviewRecordsList);

    set({
      currentReport: updatedReport,
      reportsList: newReportsList,
      reviewRecordsList: newReviewRecordsList,
    });
  },
}));

export default useAppStore;

export { TEMPLATE_KEY_LABELS };
