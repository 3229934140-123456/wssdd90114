import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Plus,
  Save,
  Eye,
  Send,
  Flame,
  AlertTriangle,
  FileText,
  Inbox,
  CheckCircle2,
  ShieldAlert,
  User,
  Calendar,
  Tag,
  Archive,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type TemplateType, TEMPLATE_KEY_LABELS } from '@/store/appStore';
import { clues as allClues } from '@/data/clues';
import TemplateCard from '@/components/TemplateCard';
import SectionEditor from '@/components/SectionEditor';
import type { SensitiveMark } from '@/shared/types';
import { formatTime } from '@/utils/format';

const TEMPLATE_TYPES: TemplateType[] = ['daily', 'urgent', 'topic'];

const sourceConfig: Record<string, { label: string; className: string }> = {
  news: { label: '新闻', className: 'bg-blue-100 text-blue-700' },
  video: { label: '视频', className: 'bg-orange-100 text-orange-700' },
  forum: { label: '论坛', className: 'bg-purple-100 text-purple-700' },
  hotline: { label: '热线', className: 'bg-green-100 text-green-700' },
};

function getHeatClass(heat: number) {
  if (heat < 60) return 'text-green-600 bg-green-50';
  if (heat < 80) return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

function SkeletonSection() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-gray-300" />
          <div className="h-4 w-32 rounded bg-gray-300" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 rounded bg-gray-200" />
          <div className="h-6 w-20 rounded bg-gray-200" />
          <div className="h-6 w-12 rounded bg-gray-200" />
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-11/12 rounded bg-gray-200" />
        <div className="h-4 w-10/12 rounded bg-gray-200" />
        <div className="h-4 w-9/12 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-8/12 rounded bg-gray-200" />
      </div>
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
        <div className="h-3 w-32 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function EditPage() {
  const navigate = useNavigate();
  const {
    selectedClueIds,
    currentReport,
    userInfo,
    reportsList,
    toggleClue,
    createReport,
    updateSection,
    addSensitiveMark,
    submitReport,
    updateReportTitle,
    saveDraft,
    loadDraft,
  } = useAppStore();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('daily');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateType | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showDraftBox, setShowDraftBox] = useState(false);

  const draftReports = useMemo(
    () => reportsList.filter((r) => r.status === 'draft').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [reportsList]
  );

  const selectedClues = useMemo(() => {
    return allClues.filter((c) => selectedClueIds.includes(c.id));
  }, [selectedClueIds]);

  const allSensitiveMarks = useMemo(() => {
    if (!currentReport) return [];
    return currentReport.sections.flatMap((section) => section.sensitiveMarks || []);
  }, [currentReport]);

  useEffect(() => {
    if (currentReport && currentReport.title) {
      setReportTitle(currentReport.title);
    }
    if (currentReport?.templateKey) {
      setSelectedTemplate(currentReport.templateKey as TemplateType);
    }
  }, [currentReport?.id, currentReport?.title, currentReport?.templateKey]);

  const handleLoadDraft = (reportId: string) => {
    loadDraft(reportId);
    setShowDraftBox(false);
  };

  const handleTitleChange = (value: string) => {
    setReportTitle(value);
    updateReportTitle(value);
  };

  const handleGenerate = async () => {
    if (selectedClues.length === 0) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 1200));
    const report = createReport(selectedClues, selectedTemplate);
    setReportTitle(report.title);
    setIsGenerating(false);
  };

  const handleTemplateChange = (tpl: TemplateType) => {
    if (currentReport && currentReport.sections.some((s) => s.content && s.content.trim().length > 0)) {
      setPendingTemplate(tpl);
      setShowOverwriteConfirm(true);
    } else {
      setSelectedTemplate(tpl);
    }
  };

  const confirmOverwrite = async () => {
    if (pendingTemplate) {
      setSelectedTemplate(pendingTemplate);
      if (selectedClues.length > 0) {
        setIsGenerating(true);
        await new Promise((r) => setTimeout(r, 1200));
        const report = createReport(selectedClues, pendingTemplate);
        setReportTitle(report.title);
        setIsGenerating(false);
      }
    }
    setShowOverwriteConfirm(false);
    setPendingTemplate(null);
  };

  const cancelOverwrite = () => {
    setShowOverwriteConfirm(false);
    setPendingTemplate(null);
  };

  const handleContentChange = (sectionId: string, content: string) => {
    updateSection(sectionId, content);
  };

  const handleMarkSensitive = (sectionId: string, text: string, level: number) => {
    addSensitiveMark(sectionId, {
      clueId: currentReport?.clueIds[0] || '',
      markType: 'keyword',
      content: text,
      level: level as SensitiveMark['level'],
    });
  };

  const handleSaveDraft = () => {
    if (!currentReport) return;
    saveDraft();
    setToastMessage('草稿已保存');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const handleSubmit = () => {
    if (!currentReport) return;
    submitReport();
    setToastMessage('提交送审成功！正在跳转审核列表...');
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      navigate('/review');
    }, 2000);
  };

  const renderPreviewWithHighlights = (text: string, marks: SensitiveMark[]): React.ReactNode => {
    if (!marks || marks.length === 0) return text;
    let result: React.ReactNode[] = [text];
    marks.forEach((mark, markIndex) => {
      const bgColor = mark.level >= 3 ? 'bg-orange-200' : 'bg-yellow-200';
      const newResult: React.ReactNode[] = [];
      result.forEach((item, itemIndex) => {
        if (typeof item === 'string') {
          const parts = item.split(mark.content);
          parts.forEach((part, partIndex) => {
            if (part) newResult.push(part);
            if (partIndex < parts.length - 1) {
              newResult.push(
                <span
                  key={`mark-${markIndex}-${itemIndex}-${partIndex}`}
                  className={`${bgColor} px-0.5 rounded text-gray-900 font-medium`}
                >
                  {mark.content}
                </span>
              );
            }
          });
        } else {
          newResult.push(item);
        }
      });
      result = newResult;
    });
    return result;
  };

  const displayTitle = reportTitle || currentReport?.title || '';

  return (
    <div className="h-screen w-full flex flex-col bg-gov-bg overflow-hidden">
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slideRight">
          <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-xl border border-gov-success/30">
            <CheckCircle2 className="h-5 w-5 text-gov-success" />
            <span className="text-sm font-medium text-gray-800">
              {toastMessage}
            </span>
          </div>
        </div>
      )}

      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slideRight">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">切换模板确认</h3>
                <p className="text-sm text-gray-500">将根据新模板重新生成内容</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              当前已有编辑内容，切换模板后将<span className="text-gov-danger font-medium">覆盖现有内容</span>，是否确认继续？
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={cancelOverwrite}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmOverwrite}
                className="px-4 py-2 rounded-lg bg-gov-deepblue text-sm font-medium text-white hover:bg-gov-navy transition-colors"
              >
                确认切换
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[20%] min-w-[260px] border-r border-gray-200 bg-white flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gov-deepblue" />
              已选入报线索
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gov-deepblue text-white">
                {selectedClues.length}条
              </span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {selectedClues.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 mb-4">
                  <Inbox className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 mb-1">暂无已选线索</p>
                <p className="text-xs text-gray-400">请先到线索列表选择线索</p>
              </div>
            ) : (
              selectedClues.map((clue) => {
                const source = sourceConfig[clue.source] || { label: clue.source, className: 'bg-gray-100 text-gray-700' };
                return (
                  <div
                    key={clue.id}
                    className="group rounded-xl border border-gray-100 bg-gray-50/50 p-3 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fadeIn"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-800 text-ellipsis-2 leading-snug flex-1">
                        {clue.title}
                      </h4>
                      <button
                        onClick={() => toggleClue(clue.id)}
                        className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-60 group-hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium', source.className)}>
                        {source.label}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium', getHeatClass(clue.heat))}>
                        <Flame className="h-3 w-3" />
                        {clue.heat}
                      </span>
                      {clue.sensitiveLevel >= 3 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-600">
                          <ShieldAlert className="h-3 w-3" />
                          敏感
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-gray-100 space-y-2">
            <button
              onClick={() => navigate('/clues')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gov-deepblue hover:text-gov-deepblue hover:bg-blue-50/50 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              继续添加线索
            </button>
            <button
              onClick={() => setShowDraftBox(!showDraftBox)}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200',
                showDraftBox
                  ? 'border-gov-deepblue text-gov-deepblue bg-blue-50/50'
                  : 'border-dashed border-gray-300 text-gray-600 hover:border-gov-deepblue hover:text-gov-deepblue hover:bg-blue-50/50'
              )}
            >
              <Archive className="h-4 w-4" />
              草稿箱
              {draftReports.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gov-deepblue text-white">
                  {draftReports.length}
                </span>
              )}
            </button>
          </div>

          {showDraftBox && (
            <div className="border-t border-gray-200 bg-gray-50/50 max-h-60 overflow-y-auto">
              <div className="p-3 space-y-2">
                {draftReports.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    暂无保存的草稿
                  </div>
                ) : (
                  draftReports.map((draft) => {
                    const sensitiveCount = draft.sections.reduce(
                      (sum, s) => sum + (s.sensitiveMarks?.length || 0), 0
                    );
                    return (
                      <button
                        key={draft.id}
                        onClick={() => handleLoadDraft(draft.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm',
                          currentReport?.id === draft.id
                            ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <p className="text-sm font-medium text-gray-800 truncate mb-1">
                          {draft.title || '未命名草稿'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">
                            {TEMPLATE_KEY_LABELS[draft.templateKey || 'daily']}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {formatTime(draft.updatedAt, 'MM-DD HH:mm')}
                          </span>
                          {sensitiveCount > 0 && (
                            <span className="text-amber-600">
                              {sensitiveCount}处敏感
                            </span>
                          )}
                          <span>{draft.clueIds.length}条线索</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-[55%] flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gov-deepblue" />
                  专报标题
                </label>
                <input
                  type="text"
                  value={displayTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="请输入专报标题..."
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white font-song text-2xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-gov-deepblue focus:ring-4 focus:ring-gov-deepblue/10 outline-none transition-all duration-200"
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-600">选择模板</h3>
                <div className="grid grid-cols-3 gap-4">
                  {TEMPLATE_TYPES.map((tpl) => (
                    <TemplateCard
                      key={tpl}
                      type={tpl}
                      selected={selectedTemplate === tpl}
                      onClick={() => handleTemplateChange(tpl)}
                    />
                  ))}
                </div>
              </div>

              <div className="py-2">
                <button
                  onClick={handleGenerate}
                  disabled={selectedClues.length === 0 || isGenerating}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-base font-semibold transition-all duration-300',
                    selectedClues.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'gov-gradient text-white shadow-lg shadow-gov-deepblue/20 hover:shadow-xl hover:shadow-gov-deepblue/30 hover:-translate-y-0.5 active:translate-y-0'
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-5 w-5 animate-spin" />
                      AI 正在智能生成内容，请稍候...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 group-hover:animate-pulse" />
                      一键智能生成
                      <span className="text-sm font-normal opacity-80 ml-1">
                        （基于{selectedClues.length}条线索 · {selectedTemplate === 'daily' ? '日报' : selectedTemplate === 'urgent' ? '突发' : '专题'}模板）
                      </span>
                    </>
                  )}
                </button>
                {selectedClues.length === 0 && (
                  <p className="text-center text-xs text-amber-600 mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    请先在左侧添加至少一条线索后生成
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-2">
                {isGenerating ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonSection key={i} />)
                ) : currentReport && currentReport.sections.length > 0 ? (
                  currentReport.sections
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <SectionEditor
                        key={section.id}
                        sectionId={section.id}
                        title={section.title}
                        content={section.content || ''}
                        sensitiveMarks={section.sensitiveMarks || []}
                        onContentChange={handleContentChange}
                        onMarkSensitive={(text, level) => handleMarkSensitive(section.id, text, level)}
                      />
                    ))
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 mb-4">
                        <Sparkles className="h-8 w-8 text-gov-deepblue opacity-60" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">尚未生成内容</h4>
                      <p className="text-sm text-gray-500 max-w-sm">
                        选择模板后，点击上方「一键智能生成」按钮，AI 将基于已选线索自动生成专报内容
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-5 pb-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      创建者：<span className="text-gray-700 font-medium">{userInfo.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      创建时间：<span className="text-gray-700 font-medium">{formatTime(currentReport?.createdAt || new Date(), 'YYYY-MM-DD HH:mm')}</span>
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100">
                    版本号：<span className="text-gray-700 font-semibold">V{currentReport?.version || 1}.0</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-[25%] min-w-[320px] border-l border-gray-200 bg-gray-50/80 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-white">
            <h2 className="text-base font-semibold text-gray-900">操作工具栏</h2>
          </div>

          <div className="p-4 border-b border-gray-200 bg-white space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSaveDraft}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <Save className="h-4 w-4 text-gray-500" />
                保存草稿
              </button>
              <button
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                <Eye className="h-4 w-4 text-gray-500" />
                预览PDF
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!currentReport}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200',
                !currentReport
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'gov-gradient text-white shadow-lg shadow-gov-deepblue/20 hover:shadow-xl hover:-translate-y-0.5'
              )}
            >
              <Send className="h-4 w-4" />
              提交送审
            </button>
            {!currentReport && (
              <p className="text-center text-xs text-gray-400">请先生成专报内容</p>
            )}
          </div>

          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                敏感词统计
              </h3>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-semibold',
                allSensitiveMarks.length > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
              )}>
                {allSensitiveMarks.length} 处
              </span>
            </div>
            {allSensitiveMarks.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-400">
                暂无敏感标记
                <p className="mt-1 text-gray-300">在编辑器中选中文本可标记</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {allSensitiveMarks.map((mark) => (
                  <div
                    key={mark.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100"
                  >
                    <AlertTriangle className={cn(
                      'h-3.5 w-3.5 mt-0.5 shrink-0',
                      mark.level >= 3 ? 'text-red-500' : 'text-amber-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {mark.content}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        L{mark.level} · {mark.markerName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-gov-deepblue" />
              实时预览
            </h3>

            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mx-auto" style={{ aspectRatio: '210 / 297', maxHeight: 'calc(100vh - 480px)' }}>
              <div className="h-full overflow-hidden flex flex-col">
                <div className="text-center border-b-2 border-gov-deepblue pb-3 mb-4">
                  <h1 className="font-song text-lg font-bold text-gov-deepblue mb-1 leading-tight">
                    {displayTitle || '舆情专报'}
                  </h1>
                  <p className="text-[10px] text-gray-500">
                    {currentReport?.templateName || '舆情监测报告'}
                  </p>
                </div>

                {currentReport ? (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {currentReport.sections
                      .sort((a, b) => a.order - b.order)
                      .map((section) => {
                        const sectionContent = section.content || '';
                        const displayContent = sectionContent.slice(0, 200);
                        const hasMore = sectionContent.length > 200;
                        return (
                          <div key={section.id}>
                            <h4 className="font-song text-xs font-bold text-gray-800 mb-1.5">
                              {section.title}
                            </h4>
                            <p className="font-song text-[10px] leading-[1.8] text-gray-700 text-justify indent-6 whitespace-pre-wrap">
                              {sectionContent
                                ? renderPreviewWithHighlights(displayContent, section.sensitiveMarks || [])
                                : '暂无内容'}
                              {hasMore && '...'}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-[10px] text-gray-300 text-center">
                      生成内容后
                      <br />
                      将在此处预览
                    </p>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400">
                  <span>{currentReport?.creatorName || userInfo.name}</span>
                  <span>{currentReport?.createdAt?.slice(5, 16) || '--'}</span>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-gray-400 mt-3">
              A4 纸预览效果 · 宋体排版
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
