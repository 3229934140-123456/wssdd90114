import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Clock,
  User,
  FileText,
  Calendar,
  Shield,
  FileDown,
  Printer,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  GitCompare,
  ClipboardCheck,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DiffViewer from '@/components/DiffViewer';
import { useAppStore, TEMPLATE_KEY_LABELS } from '@/store/appStore';
import type { Report, ReviewRecord, SensitiveMark } from '@/shared/types';
import { cn } from '@/lib/utils';
import { formatTime } from '@/utils/format';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const SENSITIVE_WORDS = [
  '食品安全',
  '过山车故障',
  '黑臭水体',
  '资金链断裂',
  '集体上访',
  '群体性事件',
  '烂尾楼',
  '体罚学生',
  '偷排',
  '地质灾害',
];

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已退回' },
];

const templateTypeLabels: Record<Report['type'], string> = {
  daily: '日报',
  weekly: '周报',
  monthly: '月报',
  special: '专题',
};

const REVIEWER_OPTIONS = [
  { id: 'leader-1', name: '李建国', role: '市委宣传部副部长' },
  { id: 'leader-2', name: '王志强', role: '宣传部分管领导' },
  { id: 'leader-3', name: '赵德明', role: '市委常委、宣传部部长' },
];

const confidentialLabels: Record<NonNullable<Report['confidentialLevel']>, string> = {
  internal: '内部资料',
  secret: '秘密',
  confidential: '机密',
  'top-secret': '绝密',
};

const actionLabels: Record<ReviewRecord['action'], string> = {
  submit: '提交',
  approve: '通过',
  reject: '退回',
  assign: '指派',
  transfer: '转办',
  close: '关闭',
  comment: '加签意见',
};

const actionColors: Record<ReviewRecord['action'], { dot: string; tag: string }> = {
  submit: { dot: 'bg-blue-500', tag: 'bg-blue-50 text-blue-700 border-blue-200' },
  approve: { dot: 'bg-green-500', tag: 'bg-green-50 text-green-700 border-green-200' },
  reject: { dot: 'bg-red-500', tag: 'bg-red-50 text-red-700 border-red-200' },
  assign: { dot: 'bg-purple-500', tag: 'bg-purple-50 text-purple-700 border-purple-200' },
  transfer: { dot: 'bg-orange-500', tag: 'bg-orange-50 text-orange-700 border-orange-200' },
  close: { dot: 'bg-gray-500', tag: 'bg-gray-50 text-gray-700 border-gray-200' },
  comment: { dot: 'bg-amber-500', tag: 'bg-amber-50 text-amber-700 border-amber-200' },
};

interface ReviewPageProps {
  className?: string;
}

export default function ReviewPage({ className }: ReviewPageProps) {
  const { reportsList, reviewRecordsList, approveReport, rejectReport, addLeaderComment } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string>(reportsList[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'detail' | 'diff' | 'preview'>('detail');
  const [diffOldVersion, setDiffOldVersion] = useState<number>(1);
  const [diffNewVersion, setDiffNewVersion] = useState<number>(2);
  const [showSensitiveMarks, setShowSensitiveMarks] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState(REVIEWER_OPTIONS[0]);

  const nonDraftReports = useMemo(
    () => reportsList.filter((r) => r.status !== 'draft'),
    [reportsList]
  );

  const creatorOptions = useMemo(() => {
    const creators = new Set(nonDraftReports.map((r) => r.creatorName));
    return ['all', ...Array.from(creators)];
  }, [nonDraftReports]);

  const templateOptions = useMemo(() => {
    const keys = new Set(
      nonDraftReports
        .map((r) => r.templateKey || (r.type === 'daily' ? 'daily' : r.type === 'special' ? 'topic' : r.type))
        .filter(Boolean)
    );
    return ['all', ...Array.from(keys)];
  }, [nonDraftReports]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pendingCount = nonDraftReports.filter(
      (r) => r.status === 'submitted' || r.status === 'reviewing'
    ).length;
    const approvedCount = nonDraftReports.filter((r) => r.status === 'approved').length;
    const monthCount = nonDraftReports.filter((r) => {
      const d = new Date(r.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return { pendingCount, approvedCount, monthCount, totalCount: nonDraftReports.length };
  }, [nonDraftReports]);

  const filteredReports = useMemo(() => {
    let list = [...nonDraftReports];

    if (statusFilter === 'pending') {
      list = list.filter((r) => r.status === 'submitted' || r.status === 'reviewing');
    } else if (statusFilter === 'approved') {
      list = list.filter((r) => r.status === 'approved');
    } else if (statusFilter === 'rejected') {
      list = list.filter((r) => r.status === 'rejected');
    }

    if (templateFilter !== 'all') {
      list = list.filter((r) => {
        const key = r.templateKey || (r.type === 'daily' ? 'daily' : r.type === 'special' ? 'topic' : r.type);
        return key === templateFilter;
      });
    }

    if (creatorFilter !== 'all') {
      list = list.filter((r) => r.creatorName === creatorFilter);
    }

    if (dateRange) {
      list = list.filter((r) => {
        const created = new Date(r.submittedAt || r.createdAt).getTime();
        const start = new Date(dateRange.start).getTime();
        const end = new Date(dateRange.end).getTime();
        return created >= start && created <= end;
      });
    }

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(kw) ||
          r.creatorName.toLowerCase().includes(kw) ||
          (r.summary?.toLowerCase().includes(kw) ?? false)
      );
    }

    list.sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime());

    return list;
  }, [nonDraftReports, statusFilter, templateFilter, creatorFilter, dateRange, keyword]);

  const selectedReport = useMemo(
    () => reportsList.find((r) => r.id === selectedReportId),
    [reportsList, selectedReportId]
  );

  const allSensitiveMarksForReport = useMemo(() => {
    if (!selectedReport) return [];
    return selectedReport.sections.flatMap((section) =>
      (section.sensitiveMarks || []).map((mark) => ({
        ...mark,
        sectionId: section.id,
        sectionTitle: section.title,
      }))
    );
  }, [selectedReport]);

  const relatedReviews = useMemo(() => {
    if (!selectedReport) return [];
    return reviewRecordsList
      .filter((rv) => rv.targetId === selectedReport.id && rv.targetType === 'report')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [selectedReport, reviewRecordsList]);

  const availableVersions = useMemo(() => {
    if (!selectedReport) return [];
    const versions: number[] = [];
    for (let i = 1; i <= selectedReport.version; i++) {
      versions.push(i);
    }
    return versions;
  }, [selectedReport]);

  const generateVersionContent = (report: Report, version: number): string => {
    if (version === report.version) {
      return report.sections.map((s) => `## ${s.title}\n\n${s.content || ''}`).join('\n\n');
    }
    const vReviews = relatedReviews.filter((rv) => rv.version === version);
    const header = `版本 V${version}`;
    const statusInfo = vReviews.length > 0
      ? vReviews.map((rv) => `[${actionLabels[rv.action]}] ${rv.reviewerName} ${rv.createdAt}`).join('\n')
      : '';
    const content = report.sections
      .map((s) => `## ${s.title}\n\n${s.content || ''}`)
      .join('\n\n');
    return statusInfo ? `${header}\n${statusInfo}\n\n---\n\n${content}` : `${header}\n\n${content}`;
  };

  const highlightSensitive = (text: string, sensitiveMarks?: SensitiveMark[]) => {
    let result: (string | JSX.Element)[] = [text];
    SENSITIVE_WORDS.forEach((word) => {
      const next: (string | JSX.Element)[] = [];
      result.forEach((part, idx) => {
        if (typeof part !== 'string') {
          next.push(part);
          return;
        }
        const parts = part.split(word);
        parts.forEach((p, i) => {
          if (i > 0) {
            next.push(
              <mark
                key={`sw-${word}-${idx}-${i}`}
                className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium"
              >
                {word}
              </mark>
            );
          }
          if (p) next.push(p);
        });
      });
      result = next;
    });
    if (sensitiveMarks && sensitiveMarks.length > 0) {
      sensitiveMarks.forEach((mark, markIdx) => {
        const next: (string | JSX.Element)[] = [];
        result.forEach((part, idx) => {
          if (typeof part !== 'string') {
            next.push(part);
            return;
          }
          const parts = part.split(mark.content);
          parts.forEach((p, i) => {
            if (i > 0) {
              const bgColor = mark.level >= 3 ? 'bg-orange-200 text-orange-900' : 'bg-yellow-200 text-yellow-900';
              next.push(
                <mark
                  key={`sm-${mark.id}-${markIdx}-${idx}-${i}`}
                  className={`${bgColor} px-0.5 rounded font-medium`}
                >
                  {mark.content}
                </mark>
              );
            }
            if (p) next.push(p);
          });
        });
        result = next;
      });
    }
    return result;
  };

  const handleQuickDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateRange({
      start: formatTime(start, 'YYYY-MM-DD') + ' 00:00:00',
      end: formatTime(end, 'YYYY-MM-DD') + ' 23:59:59',
    });
  };

  const handleClearDate = () => setDateRange(null);

  const handleExportPDF = () => {
    window.print();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleApprove = () => {
    if (!selectedReport) return;
    approveReport(selectedReport.id, reviewComment, selectedReviewer.id, selectedReviewer.name, selectedReviewer.role);
    setShowApproveModal(false);
    setReviewComment('');
  };

  const handleReject = () => {
    if (!selectedReport || !reviewComment.trim()) return;
    rejectReport(selectedReport.id, reviewComment, selectedReviewer.id, selectedReviewer.name, selectedReviewer.role);
    setShowRejectModal(false);
    setReviewComment('');
  };

  const handleAddComment = () => {
    if (!selectedReport || !reviewComment.trim()) return;
    addLeaderComment(selectedReport.id, reviewComment, selectedReviewer.id, selectedReviewer.name, selectedReviewer.role);
    setShowCommentModal(false);
    setReviewComment('');
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setTemplateFilter('all');
    setCreatorFilter('all');
    setDateRange(null);
    setKeyword('');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={cn('h-full flex flex-col bg-gov-bg', className)}>
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-gov-deepblue" />
              <h1 className="text-xl font-bold text-gray-900">送审记录</h1>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-3">
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="待审"
                value={stats.pendingCount}
                color="orange"
              />
              <StatCard
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="已通过"
                value={stats.approvedCount}
                color="green"
              />
              <StatCard
                icon={<Sparkles className="w-4 h-4" />}
                label="本月专报"
                value={stats.monthCount}
                color="blue"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              导出PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gov-deepblue rounded-lg hover:bg-gov-navy transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              打印
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[40%] min-w-[380px] flex flex-col border-r border-gray-200 bg-white">
          <div className="flex-shrink-0 p-4 border-b border-gray-200 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {statusFilterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    statusFilter === opt.value
                      ? 'bg-gov-deepblue text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">模板类型</label>
                <select
                  value={templateFilter}
                  onChange={(e) => setTemplateFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-deepblue/20 focus:border-gov-deepblue/40"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'all' ? '全部模板' : TEMPLATE_KEY_LABELS[opt] || templateTypeLabels[opt as Report['type']] || opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">提交人</label>
                <select
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-deepblue/20 focus:border-gov-deepblue/40"
                >
                  {creatorOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 'all' ? '全部提交人' : opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 flex items-center gap-1 flex-wrap">
                {[
                  { label: '今日', days: 0 },
                  { label: '近3天', days: 2 },
                  { label: '近7天', days: 6 },
                  { label: '近30天', days: 29 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleQuickDate(opt.days)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs transition-all',
                      dateRange &&
                        (() => {
                          const diff = Math.ceil(
                            (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          return diff === opt.days;
                        })()
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                {dateRange && (
                  <button
                    onClick={handleClearDate}
                    className="px-2 py-1 rounded text-xs bg-gray-50 text-gray-400 hover:text-gray-600 border border-gray-100"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索标题、提交人、摘要..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-deepblue/20 focus:border-gov-deepblue/40 transition-all placeholder:text-gray-400"
                />
                {keyword && (
                  <button
                    onClick={() => setKeyword('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 hover:text-gray-700 transition-all"
              >
                重置
              </button>
            </div>
          </div>

          <div className="flex-shrink-0 px-4 py-2 text-xs text-gray-500 bg-gray-50/50 border-b border-gray-100">
            共 {filteredReports.length} 条记录
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">暂无匹配的送审记录</p>
              </div>
            ) : (
              <TimelineList items={filteredReports} selectedId={selectedReportId} onSelect={setSelectedReportId} />
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {selectedReport ? (
            <>
              <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
                <div className="flex items-center gap-1">
                  {[
                    { key: 'detail', label: '审批详情', icon: ClipboardCheck },
                    { key: 'diff', label: '版本对比', icon: GitCompare },
                    { key: 'preview', label: '原文预览', icon: Eye },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as typeof activeTab)}
                      className={cn(
                        'flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all border-b-2 -mb-px',
                        activeTab === tab.key
                          ? 'text-gov-deepblue border-gov-deepblue'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'detail' && (
                  <ApprovalDetail
                    report={selectedReport}
                    reviews={relatedReviews}
                    showActions={true}
                    onShowApprove={() => setShowApproveModal(true)}
                    onShowReject={() => {
                      setReviewComment('');
                      setShowRejectModal(true);
                    }}
                    onShowComment={() => {
                      setReviewComment('');
                      setShowCommentModal(true);
                    }}
                  />
                )}
                {activeTab === 'diff' && (
                  <VersionCompare
                    report={selectedReport}
                    versions={availableVersions}
                    oldVersion={diffOldVersion}
                    newVersion={diffNewVersion}
                    onOldChange={setDiffOldVersion}
                    onNewChange={setDiffNewVersion}
                    generateContent={(v) => generateVersionContent(selectedReport, v)}
                    reviews={relatedReviews}
                  />
                )}
                {activeTab === 'preview' && (
                  <OriginalPreview
                    report={selectedReport}
                    highlightSensitive={highlightSensitive}
                    showMarks={showSensitiveMarks}
                    onToggleMarks={() => setShowSensitiveMarks(!showSensitiveMarks)}
                    allMarks={allSensitiveMarksForReport}
                    onScrollToSection={scrollToSection}
                  />
                )}
              </div>

              {showApproveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slideRight">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">通过审批</h3>
                        <p className="text-sm text-gray-500">确认通过该专报</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        审批领导 <span className="text-red-500 text-xs">*必选</span>
                      </label>
                      <div className="space-y-2">
                        {REVIEWER_OPTIONS.map((leader) => (
                          <button
                            key={leader.id}
                            onClick={() => setSelectedReviewer(leader)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                              selectedReviewer.id === leader.id
                                ? 'border-green-300 bg-green-50 ring-1 ring-green-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs',
                              selectedReviewer.id === leader.id ? 'bg-green-500' : 'bg-gray-400'
                            )}>
                              {leader.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{leader.name}</div>
                              <div className="text-xs text-gray-500">{leader.role}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        审批意见 <span className="text-gray-400 text-xs">（可选）</span>
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="请输入审批意见..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowApproveModal(false);
                          setReviewComment('');
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleApprove}
                        className="px-4 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                      >
                        确认通过
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slideRight">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                        <XCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">退回专报</h3>
                        <p className="text-sm text-gray-500">请填写退回原因</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        审批领导 <span className="text-red-500 text-xs">*必选</span>
                      </label>
                      <div className="space-y-2">
                        {REVIEWER_OPTIONS.map((leader) => (
                          <button
                            key={leader.id}
                            onClick={() => setSelectedReviewer(leader)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                              selectedReviewer.id === leader.id
                                ? 'border-red-300 bg-red-50 ring-1 ring-red-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs',
                              selectedReviewer.id === leader.id ? 'bg-red-500' : 'bg-gray-400'
                            )}>
                              {leader.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{leader.name}</div>
                              <div className="text-xs text-gray-500">{leader.role}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        退回原因 <span className="text-red-500 text-xs">*必填</span>
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="请详细说明退回原因，以便修改完善..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowRejectModal(false);
                          setReviewComment('');
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={!reviewComment.trim()}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
                          reviewComment.trim()
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-300 cursor-not-allowed'
                        )}
                      >
                        确认退回
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showCommentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slideRight">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                        <ClipboardCheck className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">加签意见</h3>
                        <p className="text-sm text-gray-500">以领导身份添加审批意见</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        签署领导 <span className="text-red-500 text-xs">*必选</span>
                      </label>
                      <div className="space-y-2">
                        {REVIEWER_OPTIONS.map((leader) => (
                          <button
                            key={leader.id}
                            onClick={() => setSelectedReviewer(leader)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all',
                              selectedReviewer.id === leader.id
                                ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs',
                              selectedReviewer.id === leader.id ? 'bg-amber-500' : 'bg-gray-400'
                            )}>
                              {leader.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">{leader.name}</div>
                              <div className="text-xs text-gray-500">{leader.role}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        意见内容 <span className="text-red-500 text-xs">*必填</span>
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="请输入加签意见..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all resize-none"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowCommentModal(false);
                          setReviewComment('');
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleAddComment}
                        disabled={!reviewComment.trim()}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
                          reviewComment.trim()
                            ? 'bg-amber-500 hover:bg-amber-600'
                            : 'bg-gray-300 cursor-not-allowed'
                        )}
                      >
                        提交意见
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">请选择一条送审记录</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'orange' | 'green' | 'blue';
}) {
  const colorMap = {
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', value: 'text-orange-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', value: 'text-green-600' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', value: 'text-blue-600' },
  };
  const c = colorMap[color];

  return (
    <div className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg', c.bg)}>
      <span className={c.icon}>{icon}</span>
      <span className="text-xs text-gray-600">{label}</span>
      <span className={cn('text-base font-bold tabular-nums', c.value)}>{value}</span>
    </div>
  );
}

function TimelineList({
  items,
  selectedId,
  onSelect,
}: {
  items: Report[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-200 via-gray-200 to-gray-200" />
      <div className="space-y-1">
        {items.map((report) => (
          <div key={report.id} className="relative pl-8">
            <div
              className={cn(
                'absolute left-0 top-6 w-[22px] h-[22px] rounded-full flex items-center justify-center z-10 transition-all',
                report.id === selectedId
                  ? 'bg-gov-deepblue ring-4 ring-gov-deepblue/10 scale-110'
                  : 'bg-white border-2 border-gray-300'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  report.id === selectedId ? 'bg-white' : 'bg-gray-400'
                )}
              />
            </div>
            <button
              onClick={() => onSelect(report.id)}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all duration-200',
                report.id === selectedId
                  ? 'bg-blue-50/70 border-blue-200 shadow-sm ring-2 ring-blue-100'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3
                  className={cn(
                    'text-sm font-semibold leading-snug line-clamp-2',
                    report.id === selectedId ? 'text-gov-deepblue' : 'text-gray-800'
                  )}
                >
                  {report.title}
                </h3>
                <VersionBadge version={report.version} />
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {TEMPLATE_KEY_LABELS[report.templateKey || 'daily'] || templateTypeLabels[report.type]}
                </span>
                <StatusBadge status={report.status} size="sm" />
                {report.isSensitive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    敏感
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(report.submittedAt || report.createdAt, 'MM-DD HH:mm')}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {report.creatorName}
                </span>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VersionBadge({ version }: { version: number }) {
  const colors = ['bg-gray-100 text-gray-600', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700'];
  const color = colors[Math.min(version - 1, colors.length - 1)];
  return (
    <span className={cn('flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold', color)}>
      V{version}
    </span>
  );
}

function ApprovalDetail({
  report,
  reviews,
  showActions,
  onShowApprove,
  onShowReject,
  onShowComment,
}: {
  report: Report;
  reviews: ReviewRecord[];
  showActions: boolean;
  onShowApprove: () => void;
  onShowReject: () => void;
  onShowComment: () => void;
}) {
  const canReview = report.status === 'submitted' || report.status === 'reviewing';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gov-deepblue to-gov-navy text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold mb-1">{report.title}</h2>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {report.templateName || '自定义模板'}
                </span>
              </div>
            </div>
            <StatusBadge status={report.status} size="md" />
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <InfoItem label="模板类型" value={TEMPLATE_KEY_LABELS[report.templateKey || 'daily'] || templateTypeLabels[report.type]} />
          <InfoItem
            label="密级"
            value={confidentialLabels[report.confidentialLevel || 'internal']}
            valueClass={
              report.confidentialLevel && report.confidentialLevel !== 'internal'
                ? 'text-red-600 font-semibold'
                : ''
            }
          />
          <InfoItem label="提交人" value={report.creatorName} />
          <InfoItem
            label="提交时间"
            value={formatTime(report.submittedAt || report.createdAt, 'YYYY-MM-DD HH:mm')}
          />
          <InfoItem label="创建时间" value={formatTime(report.createdAt, 'YYYY-MM-DD HH:mm')} />
          <InfoItem label="当前版本" value={`V${report.version}`} valueClass="font-bold text-gov-deepblue" />
          {report.approverName && (
            <InfoItem label="审批人" value={report.approverName} />
          )}
          {report.approvedAt && (
            <InfoItem label="审批时间" value={formatTime(report.approvedAt, 'YYYY-MM-DD HH:mm')} />
          )}
        </div>
        {showActions && canReview && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">领导审批：</span>
            <button
              onClick={onShowApprove}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              通过
            </button>
            <button
              onClick={onShowReject}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              <XCircle className="w-4 h-4" />
              退回
            </button>
            <button
              onClick={onShowComment}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
            >
              <ClipboardCheck className="w-4 h-4" />
              加签意见
            </button>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-gov-deepblue" />
          <h2 className="text-base font-bold text-gray-800">审批流程</h2>
        </div>
        <div className="p-6">
          <ReviewTimeline reviews={reviews} report={report} />
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={cn('text-sm text-gray-800', valueClass)}>{value}</div>
    </div>
  );
}

interface FlowNode {
  id: string;
  label: string;
  time: string;
  user: string;
  role?: string;
  desc?: string;
  dot: string;
  action: ReviewRecord['action'] | null;
  attachments?: string[];
  isReject: boolean;
  rejectReason?: string;
}

function ReviewTimeline({ reviews, report }: { reviews: ReviewRecord[]; report: Report }) {
  const flowNodes: FlowNode[] = [
    {
      id: 'create',
      label: '创建',
      time: report.createdAt,
      user: report.creatorName,
      desc: '专报创建完成',
      dot: 'bg-gray-400',
      action: null,
      isReject: false,
    },
    ...reviews.map((rv) => ({
      id: rv.id,
      label: actionLabels[rv.action],
      time: rv.createdAt,
      user: rv.reviewerName,
      role: rv.reviewerRole,
      desc: rv.comment,
      dot: actionColors[rv.action].dot,
      action: rv.action,
      attachments: rv.attachments,
      isReject: rv.action === 'reject',
      rejectReason: report.rejectReason,
    })),
  ];

  return (
    <div className="relative">
      {flowNodes.map((node, idx) => (
        <div
          key={node.id}
          className={cn('relative pl-10 pb-8 last:pb-0', 'animate-[fadeSlideIn_0.4s_ease-out]')}
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          {idx < flowNodes.length - 1 && (
            <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-gray-100" />
          )}
          <div
            className={cn(
              'absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center z-10 ring-4 ring-white',
              node.dot,
              'shadow-sm'
            )}
          >
            {node.action === 'approve' && <CheckCircle2 className="w-4 h-4 text-white" />}
            {node.action === 'reject' && <XCircle className="w-4 h-4 text-white" />}
            {node.action === 'submit' && <ArrowRight className="w-4 h-4 text-white" />}
            {node.action === 'comment' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
            {!node.action && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
          </div>

          <div
            className={cn(
              'rounded-xl border transition-all hover:shadow-sm',
              node.isReject
                ? 'border-red-200 bg-red-50/40'
                : 'border-gray-200 bg-white'
            )}
          >
            <div className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm',
                    node.action === 'approve'
                      ? 'bg-green-500'
                      : node.action === 'reject'
                      ? 'bg-red-500'
                      : node.action === 'submit'
                      ? 'bg-blue-500'
                      : node.action === 'comment'
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                  )}
                >
                  {node.user.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{node.user}</span>
                    {node.role && <span className="text-xs text-gray-500">· {node.role}</span>}
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                        node.action
                          ? actionColors[node.action].tag
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      )}
                    >
                      {node.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatTime(node.time, 'YYYY-MM-DD HH:mm:ss')}
                  </div>
                </div>
              </div>
            </div>

            {node.desc && (
              <div
                className={cn(
                  'mx-4 mb-4 p-3 rounded-lg text-sm leading-relaxed',
                  node.isReject
                    ? 'bg-white border border-red-100 text-gray-800'
                    : 'bg-gray-50 text-gray-700'
                )}
              >
                {node.isReject && (
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-red-100">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="font-semibold text-red-600 text-xs">退回原因</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{node.desc}</p>
              </div>
            )}

            {node.attachments && node.attachments.length > 0 && (
              <div className="mx-4 mb-4 pb-4 border-t border-gray-100 pt-3">
                <div className="text-xs text-gray-500 mb-2">附件</div>
                <div className="flex flex-wrap gap-2">
                  {node.attachments.map((att, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                    >
                      <FileText className="w-3 h-3" />
                      {att}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VersionCompare({
  report,
  versions,
  oldVersion,
  newVersion,
  onOldChange,
  onNewChange,
  generateContent,
  reviews,
}: {
  report: Report;
  versions: number[];
  oldVersion: number;
  newVersion: number;
  onOldChange: (v: number) => void;
  onNewChange: (v: number) => void;
  generateContent: (v: number) => string;
  reviews: ReviewRecord[];
}) {
  const oldIdx = versions.indexOf(oldVersion);
  const newIdx = versions.indexOf(newVersion);

  const defaultOld = versions.length >= 2 ? versions[versions.length - 2] : versions[0];
  const defaultNew = versions.length >= 2 ? versions[versions.length - 1] : versions[0];

  const effectiveOld = oldIdx >= 0 ? oldVersion : defaultOld;
  const effectiveNew = newIdx >= 0 ? newVersion : defaultNew;

  const changeSummary = useMemo(() => {
    if (!reviews || reviews.length === 0) return [];
    const minV = Math.min(effectiveOld, effectiveNew);
    const maxV = Math.max(effectiveOld, effectiveNew);
    return reviews
      .filter((rv) => {
        if (rv.version) return rv.version >= minV && rv.version <= maxV;
        return true;
      })
      .map((rv) => {
        const actionLabel = actionLabels[rv.action];
        const actionColor = actionColors[rv.action];
        const changeDesc = rv.changes?.map((c) => `${c.field}: ${c.oldValue || '(空)'} → ${c.newValue}`).join('；') || '';
        return {
          id: rv.id,
          action: rv.action,
          actionLabel,
          actionColor,
          user: rv.reviewerName,
          role: rv.reviewerRole,
          time: rv.createdAt,
          comment: rv.comment,
          changeDesc,
          version: rv.version,
        };
      });
  }, [reviews, effectiveOld, effectiveNew]);

  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已退回',
  };

  const inferVersionStatus = (v: number): string => {
    if (v === report.version) return statusMap[report.status] || report.status;
    const submitReview = reviews.find((rv) => rv.action === 'submit' && rv.version === v);
    if (submitReview) return '已提交';
    const approveReview = reviews.find((rv) => rv.action === 'approve' && rv.version === v);
    if (approveReview) return '已通过';
    const rejectReview = reviews.find((rv) => rv.action === 'reject' && rv.version === v);
    if (rejectReview) return '已退回';
    if (v < report.version) return '已提交';
    return '草稿';
  };

  const getVersionReviews = (v: number): ReviewRecord[] => {
    return reviews.filter((rv) => rv.version === v);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-gov-deepblue" />
            <h2 className="text-base font-bold text-gray-800">版本对比</h2>
          </div>
          <div className="text-sm text-gray-500">
            {report.title}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1.5">旧版本</label>
            <VersionSelect
              versions={versions}
              value={effectiveOld}
              onChange={onOldChange}
              disabledVersions={[effectiveNew]}
              color="red"
            />
            <div className="mt-1.5 text-xs text-gray-500">
              状态：<span className="font-medium text-gray-700">{inferVersionStatus(effectiveOld)}</span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 mt-5 flex-shrink-0" />
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1.5">新版本</label>
            <VersionSelect
              versions={versions}
              value={effectiveNew}
              onChange={onNewChange}
              disabledVersions={[effectiveOld]}
              color="green"
            />
            <div className="mt-1.5 text-xs text-gray-500">
              状态：<span className="font-medium text-gray-700">{inferVersionStatus(effectiveNew)}</span>
            </div>
          </div>
        </div>
      </div>

      {changeSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-gov-deepblue" />
              <h2 className="text-base font-bold text-gray-800">变更摘要</h2>
            </div>
            <span className="text-xs text-gray-400">
              V{effectiveOld} → V{effectiveNew} 之间
            </span>
          </div>
          <div className="space-y-3">
            {changeSummary.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-3',
                  item.action === 'reject'
                    ? 'border-red-200 bg-red-50/40'
                    : item.action === 'approve'
                    ? 'border-green-200 bg-green-50/40'
                    : item.action === 'comment'
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-gray-200 bg-gray-50/40'
                )}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                      item.actionColor.tag
                    )}
                  >
                    {item.actionLabel}
                  </span>
                  {item.version && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      V{item.version}
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-800">{item.user}</span>
                  {item.role && <span className="text-xs text-gray-500">{item.role}</span>}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(item.time, 'MM-DD HH:mm')}
                  </span>
                </div>
                {item.comment && (
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap pl-1">
                    {item.action === 'reject' && '退回原因：'}
                    {item.action === 'approve' && '审批意见：'}
                    {item.action === 'submit' && '提交说明：'}
                    {item.action === 'comment' && '加签意见：'}
                    {item.comment}
                  </p>
                )}
                {item.changeDesc && (
                  <p className="text-xs text-gray-500 mt-1 pl-1">
                    变更：{item.changeDesc}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {[effectiveOld, effectiveNew].map((v, idx) => {
          const vReviews = getVersionReviews(v);
          const label = idx === 0 ? '旧版本' : '新版本';
          const color = idx === 0 ? 'border-red-200' : 'border-green-200';
          return (
            <div key={`${label}-${v}`} className={cn('bg-white rounded-xl border p-4 shadow-sm', color)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-800">{label} V{v}</span>
                <span className="text-xs text-gray-500">{inferVersionStatus(v)}</span>
              </div>
              {vReviews.length > 0 ? (
                <div className="space-y-2">
                  {vReviews.map((rv) => (
                    <div key={rv.id} className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('px-1.5 py-0.5 rounded font-medium border', actionColors[rv.action].tag)}>
                          {actionLabels[rv.action]}
                        </span>
                        <span className="text-gray-700 font-medium">{rv.reviewerName}</span>
                        <span className="text-gray-400">{formatTime(rv.createdAt, 'MM-DD HH:mm')}</span>
                      </div>
                      {rv.comment && (
                        <p className="text-gray-600 pl-1 truncate">{rv.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">暂无该版本处理记录</p>
              )}
            </div>
          );
        })}
      </div>

      <DiffViewer
        oldText={generateContent(effectiveOld)}
        newText={generateContent(effectiveNew)}
      />
    </div>
  );
}

function VersionSelect({
  versions,
  value,
  onChange,
  disabledVersions,
  color,
}: {
  versions: number[];
  value: number;
  onChange: (v: number) => void;
  disabledVersions?: number[];
  color: 'red' | 'green';
}) {
  const [open, setOpen] = useState(false);

  const colorClasses = {
    red: 'border-red-200 bg-red-50/30 focus:ring-red-200',
    green: 'border-green-200 bg-green-50/30 focus:ring-green-200',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-all',
          colorClasses[color],
          'hover:shadow-sm focus:outline-none focus:ring-2'
        )}
      >
        <span>V{value}</span>
        <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-60 overflow-auto">
            {versions.map((v) => (
              <button
                key={v}
                disabled={disabledVersions?.includes(v)}
                onClick={() => {
                  onChange(v);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  v === value
                    ? 'bg-gov-deepblue/10 text-gov-deepblue font-semibold'
                    : disabledVersions?.includes(v)
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                版本 V{v}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OriginalPreview({
  report,
  highlightSensitive,
  showMarks,
  onToggleMarks,
  allMarks,
  onScrollToSection,
}: {
  report: Report;
  highlightSensitive: (text: string, sensitiveMarks?: SensitiveMark[]) => (string | JSX.Element)[];
  showMarks: boolean;
  onToggleMarks: () => void;
  allMarks: Array<SensitiveMark & { sectionId: string; sectionTitle: string }>;
  onScrollToSection: (sectionId: string) => void;
}) {
  const marksBySection = useMemo(() => {
    const grouped: Record<string, Array<SensitiveMark & { sectionId: string; sectionTitle: string }>> = {};
    allMarks.forEach((mark) => {
      if (!grouped[mark.sectionId]) {
        grouped[mark.sectionId] = [];
      }
      grouped[mark.sectionId].push(mark);
    });
    return grouped;
  }, [allMarks]);

  const safeHighlight = (text: string, sensitiveMarks?: SensitiveMark[]) => {
    if (!showMarks) return [text];
    return highlightSensitive(text, sensitiveMarks);
  };

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-800">敏感表述标记</h3>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-semibold',
              allMarks.length > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
            )}>
              共 {allMarks.length} 处
            </span>
          </div>
          <button
            onClick={onToggleMarks}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              showMarks
                ? 'bg-gov-deepblue text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            {showMarks ? '隐藏标记' : '显示标记'}
          </button>
        </div>
        {allMarks.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(marksBySection).map(([sectionId, marks]) => {
              const section = report.sections.find((s) => s.id === sectionId);
              return (
                <div key={sectionId} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                  <button
                    onClick={() => onScrollToSection(sectionId)}
                    className="text-xs text-gov-deepblue hover:text-gov-navy font-medium shrink-0 mt-0.5 hover:underline"
                  >
                    {section?.title || '未知章节'}
                  </button>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {marks.map((mark) => (
                      <span
                        key={mark.id}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          mark.level >= 3
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        )}
                      >
                        {mark.content}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {allMarks.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">暂无敏感表述标记</p>
        )}
      </div>

      <div className="bg-[#faf8f5] rounded-xl border border-gray-200 p-3 shadow-lg">
        <div
          className="bg-white mx-auto shadow-inner border border-gray-200/60"
          style={{
            minHeight: '1040px',
            padding: '80px 72px 80px 72px',
          }}
        >
          <div className="text-center mb-10 pb-6 border-b-2 border-red-700">
            <div className="text-xs tracking-[0.3em] text-gray-500 mb-2">BEIJING PUBLIC OPINION MONITOR</div>
            <h1 className="text-3xl font-bold font-song text-gray-900 tracking-wide mb-3">
              {report.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <span>密级：<span className="text-red-600 font-medium">{confidentialLabels[report.confidentialLevel || 'internal']}</span></span>
              <span className="text-gray-300">|</span>
              <span>版本：V{report.version}</span>
              <span className="text-gray-300">|</span>
              <span>编制：{report.creatorName}</span>
              <span className="text-gray-300">|</span>
              <span>{formatTime(report.createdAt, 'YYYY年MM月DD日')}</span>
            </div>
          </div>

          {report.summary && (
            <div className="mb-8 p-4 bg-gray-50 border-l-4 border-gov-deepblue rounded-r-lg">
              <div className="text-xs font-semibold text-gov-deepblue mb-2 tracking-wider">摘 要</div>
              <p className="font-song text-[15px] leading-[2] text-gray-800 indent-8">
                {safeHighlight(report.summary)}
              </p>
            </div>
          )}

          <div className="space-y-8">
            {report.sections.map((section) => (
              <section key={section.id} id={`section-${section.id}`}>
                <h2 className="font-song text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {section.title}
                </h2>
                <div className="font-song text-[15px] leading-[2] text-gray-800">
                  {section.content
                    ? section.content.split('\n\n').map((para, idx) => (
                        <p key={idx} className="indent-8 mb-4 last:mb-0">
                          {safeHighlight(para, section.sensitiveMarks)}
                        </p>
                      ))
                    : null}

                  {section.dataConfig?.items && Array.isArray(section.dataConfig.items) && (
                    <ul className="mt-4 space-y-3 pl-8">
                      {(section.dataConfig.items as { title?: string; desc?: string }[]).map(
                        (item, idx) => (
                          <li key={idx} className="relative">
                            <span className="absolute -left-5 top-1 w-2 h-2 bg-gov-accent rounded-full" />
                            {item.title && (
                              <span className="font-semibold text-gray-900">
                                {highlightSensitive(item.title, section.sensitiveMarks)}
                              </span>
                            )}
                            {item.desc && (
                              <span className="text-gray-700 ml-1">
                                — {highlightSensitive(item.desc, section.sensitiveMarks)}
                              </span>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 pt-6 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400 font-song">
            <span>本专报共 {report.sections.length} 页 · 北京市委宣传部</span>
            <span>文件编号：BJ-YQ-{formatTime(report.createdAt, 'YYYYMMDD')}-001</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-700">
          <Shield className="w-4 h-4" />
          敏感词已高亮标记
        </div>
        <div className="text-xs text-gray-500">
          A4 纸张比例 · 宋体排版 · 打印预览模式
        </div>
      </div>
    </div>
  );
}
