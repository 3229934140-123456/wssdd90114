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
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DiffViewer from '@/components/DiffViewer';
import { useAppStore } from '@/store/appStore';
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
  comment: '批注',
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
  const { reportsList, reviewRecordsList } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string>(reportsList[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'detail' | 'diff' | 'preview'>('detail');
  const [diffOldVersion, setDiffOldVersion] = useState<number>(1);
  const [diffNewVersion, setDiffNewVersion] = useState<number>(2);

  const nonDraftReports = useMemo(
    () => reportsList.filter((r) => r.status !== 'draft'),
    [reportsList]
  );

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

    if (dateRange) {
      list = list.filter((r) => {
        const created = new Date(r.createdAt).getTime();
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

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  }, [nonDraftReports, statusFilter, dateRange, keyword]);

  const selectedReport = useMemo(
    () => reportsList.find((r) => r.id === selectedReportId),
    [reportsList, selectedReportId]
  );

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
    const ratio = version / report.version;
    return report.sections
      .map((s) => {
        const content = s.content || '';
        const truncLen = Math.floor(content.length * (0.5 + ratio * 0.5));
        return `## ${s.title}\n\n${content.slice(0, truncLen)}${truncLen < content.length ? '...' : ''}`;
      })
      .join('\n\n');
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

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex items-center gap-1 flex-wrap">
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

            <div className="relative">
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
                  <ApprovalDetail report={selectedReport} reviews={relatedReviews} />
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
                  />
                )}
                {activeTab === 'preview' && (
                  <OriginalPreview report={selectedReport} highlightSensitive={highlightSensitive} />
                )}
              </div>
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
                  {templateTypeLabels[report.type]}
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
                  <Calendar className="w-3.5 h-3.5" />
                  {formatTime(report.createdAt, 'MM-DD HH:mm')}
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

function ApprovalDetail({ report, reviews }: { report: Report; reviews: ReviewRecord[] }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gov-deepblue to-gov-navy text-white">
          <h2 className="text-lg font-bold mb-1">{report.title}</h2>
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {report.templateName || '自定义模板'}
            </span>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <InfoItem label="模板类型" value={templateTypeLabels[report.type]} />
          <InfoItem
            label="密级"
            value={confidentialLabels[report.confidentialLevel || 'internal']}
            valueClass={
              report.confidentialLevel && report.confidentialLevel !== 'internal'
                ? 'text-red-600 font-semibold'
                : ''
            }
          />
          <InfoItem label="创建时间" value={formatTime(report.createdAt, 'YYYY-MM-DD HH:mm')} />
          <InfoItem label="当前版本" value={`V${report.version}`} valueClass="font-bold text-gov-deepblue" />
        </div>
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
}: {
  report: Report;
  versions: number[];
  oldVersion: number;
  newVersion: number;
  onOldChange: (v: number) => void;
  onNewChange: (v: number) => void;
  generateContent: (v: number) => string;
}) {
  const oldIdx = versions.indexOf(oldVersion);
  const newIdx = versions.indexOf(newVersion);

  const defaultOld = versions.length >= 2 ? versions[versions.length - 2] : versions[0];
  const defaultNew = versions.length >= 2 ? versions[versions.length - 1] : versions[0];

  const effectiveOld = oldIdx >= 0 ? oldVersion : defaultOld;
  const effectiveNew = newIdx >= 0 ? newVersion : defaultNew;

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
          </div>
        </div>
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
}: {
  report: Report;
  highlightSensitive: (text: string, sensitiveMarks?: SensitiveMark[]) => (string | JSX.Element)[];
}) {
  return (
    <div className="max-w-[820px] mx-auto">
      <div className="bg-[#faf8f5] rounded-xl border border-gray-200 p-3 shadow-lg mb-6">
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
                {highlightSensitive(report.summary)}
              </p>
            </div>
          )}

          <div className="space-y-8">
            {report.sections.map((section) => (
              <section key={section.id}>
                <h2 className="font-song text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {section.title}
                </h2>
                <div className="font-song text-[15px] leading-[2] text-gray-800">
                  {section.content
                    ? section.content.split('\n\n').map((para, idx) => (
                        <p key={idx} className="indent-8 mb-4 last:mb-0">
                          {highlightSensitive(para, section.sensitiveMarks)}
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
