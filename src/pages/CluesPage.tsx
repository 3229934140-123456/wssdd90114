import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  FileText,
  Flame,
  AlertTriangle,
  X,
  Clock,
  MapPin,
  User,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ArrowRight,
  Shield,
  Share2,
  Eye,
  ThumbsUp,
  MessageCircle,
  SearchX,
} from 'lucide-react';
import ClueCard from '@/components/ClueCard';
import FilterBar from '@/components/FilterBar';
import StatusBadge from '@/components/StatusBadge';
import { useAppStore } from '@/store/appStore';
import { clues, comments } from '@/data/clues';
import { cn } from '@/lib/utils';
import type { Clue, Comment } from '@/shared/types';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  textColor: string;
  delay?: number;
}

function StatCard({ title, value, icon, gradient, textColor, delay = 0 }: StatCardProps) {
  return (
    <div
      className="relative rounded-xl overflow-hidden animate-fadeIn"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={cn('absolute inset-0 rounded-xl p-[2px] bg-gradient-to-br', gradient)}>
        <div className="w-full h-full bg-white rounded-[10px] p-5 flex items-center gap-4">
          <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br', gradient, 'text-white shadow-lg')}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">{title}</div>
            <div className={cn('text-4xl font-bold tabular-nums', textColor)}>
              {value.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function filterClues(clueList: Clue[], params: ReturnType<typeof useAppStore.getState>['filterParams'], heatRange: [number, number]): Clue[] {
  return clueList.filter((clue) => {
    if (params.keyword && params.keyword.trim()) {
      const kw = params.keyword.trim().toLowerCase();
      const inTitle = clue.title.toLowerCase().includes(kw);
      const inDesc = clue.description.toLowerCase().includes(kw);
      const inTags = clue.tags.some((t) => t.toLowerCase().includes(kw));
      if (!inTitle && !inDesc && !inTags) return false;
    }

    if (params.source) {
      const sources = Array.isArray(params.source) ? params.source : [params.source];
      if (sources.length > 0 && !sources.includes(clue.source)) return false;
    }

    if (params.sensitiveLevel !== undefined) {
      const levels = Array.isArray(params.sensitiveLevel) ? params.sensitiveLevel : [params.sensitiveLevel];
      if (levels.length > 0 && !levels.includes(clue.sensitiveLevel)) return false;
    }

    if (params.departmentTags && params.departmentTags.length > 0) {
      const hasMatchingTag = params.departmentTags.some((deptTag) =>
        clue.tags.some((tag) => tag.includes(deptTag) || deptTag.includes(tag))
      );
      if (!hasMatchingTag) return false;
    }

    if (params.category) {
      const districts = Array.isArray(params.category) ? params.category : [params.category];
      const districtMap: Record<string, string> = {
        chaoyang: '朝阳区', haidian: '海淀区', xicheng: '西城区', dongcheng: '东城区',
        fengtai: '丰台区', shijingshan: '石景山区', tongzhou: '通州区', changping: '昌平区',
        daxing: '大兴区', fangshan: '房山区', mentougou: '门头沟区', shunyi: '顺义区',
        pinggu: '平谷区', huairou: '怀柔区', miyun: '密云区', yanqing: '延庆区',
      };
      const locationNames = districts.map((d) => districtMap[d] || d);
      if (clue.location && !locationNames.includes(clue.location)) return false;
    }

    if (params.dateRange && params.dateRange.start && params.dateRange.end) {
      const clueTime = new Date(clue.reportedAt).getTime();
      const startTime = new Date(params.dateRange.start).getTime();
      const endTime = new Date(params.dateRange.end).getTime();
      if (clueTime < startTime || clueTime > endTime) return false;
    }

    if (clue.heat < heatRange[0] || clue.heat > heatRange[1]) return false;

    return true;
  });
}

function getRelatedDepartments(clue: Clue): string[] {
  const deptMap: Record<string, string> = {
    '教育局': '市教育局',
    '卫健委': '市卫生健康委员会',
    '交通局': '市交通委员会',
    '市场监管局': '市市场监督管理局',
    '应急管理局': '市应急管理局',
    '生态环境局': '市生态环境局',
    '住建委': '市住房和城乡建设委员会',
    '城管执法局': '市城市管理综合行政执法局',
    '文旅局': '市文化和旅游局',
    '房管局': '市住房保障和房屋管理局',
    '规划和自然资源委员会': '市规划和自然资源委员会',
    '农业农村局': '市农业农村局',
    '信访办': '市信访办公室',
    '发改委': '市发展和改革委员会',
    '水务局': '市水务局',
  };
  const result = new Set<string>();
  clue.tags.forEach((tag) => {
    Object.keys(deptMap).forEach((key) => {
      if (tag.includes(key) || key.includes(tag)) {
        result.add(deptMap[key]);
      }
    });
  });
  if (result.size === 0 && clue.location) {
    result.add(`${clue.location}人民政府`);
  }
  return Array.from(result);
}

function getHeatLevel(heat: number) {
  if (heat < 60) return { color: 'from-green-400 to-green-500', text: 'text-green-700', bg: 'bg-green-100' };
  if (heat < 80) return { color: 'from-orange-400 to-orange-500', text: 'text-orange-700', bg: 'bg-orange-100' };
  return { color: 'from-red-500 to-red-600', text: 'text-red-700', bg: 'bg-red-100' };
}

const sensitiveLabels: Record<number, string> = {
  1: '一级（低）',
  2: '二级（中）',
  3: '三级（高）',
  4: '四级（极高）',
};

const sensitiveColors: Record<number, string> = {
  1: 'bg-green-100 text-green-700 border-green-200',
  2: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  3: 'bg-orange-100 text-orange-700 border-orange-200',
  4: 'bg-red-100 text-red-700 border-red-200',
};

interface DetailDrawerProps {
  clue: Clue | null;
  open: boolean;
  onClose: () => void;
  clueComments: Comment[];
}

function DetailDrawer({ clue, open, onClose, clueComments }: DetailDrawerProps) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const depts = clue ? getRelatedDepartments(clue) : [];
  const heatLevel = clue ? getHeatLevel(clue.heat) : null;

  useEffect(() => {
    if (open) {
      setCommentsExpanded(false);
    }
  }, [open, clue?.id]);

  if (!clue || !heatLevel) return null;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-[560px] z-50 bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gov-deepblue/5 to-transparent">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={clue.status} size="sm" priority={clue.priority} />
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', sensitiveColors[clue.sensitiveLevel])}>
                <Shield className="w-3 h-3 mr-1" />
                {sensitiveLabels[clue.sensitiveLevel]}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
              {clue.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" />
                发布时间：{clue.reportedAt}
              </span>
              {clue.reporter && (
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  作者：{clue.reporter}
                </span>
              )}
              {clue.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  属地：{clue.location}
                </span>
              )}
            </div>

            {clue.sourceUrl && (
              <a
                href={clue.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                查看原文链接
              </a>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                完整内容
              </h3>
              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                {clue.description}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                传播数据统计
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/60 text-center">
                  <Flame className={cn('w-6 h-6 mx-auto mb-1', heatLevel.text)} />
                  <div className={cn('text-xl font-bold tabular-nums', heatLevel.text)}>{clue.heat}</div>
                  <div className="text-xs text-gray-500">热度值</div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 text-center">
                  <Eye className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                  <div className="text-xl font-bold tabular-nums text-blue-600">
                    {(clue.heat * 127).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">阅读量</div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/60 text-center">
                  <Share2 className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                  <div className="text-xl font-bold tabular-nums text-purple-600">
                    {Math.floor(clue.heat * 3.2).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">转发量</div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100/60 text-center">
                  <ThumbsUp className="w-6 h-6 mx-auto mb-1 text-pink-500" />
                  <div className="text-xl font-bold tabular-nums text-pink-600">
                    {Math.floor(clue.heat * 8.6).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">点赞量</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="text-gray-500">热度指数</span>
                  <span className={cn('font-semibold', heatLevel.text)}>{clue.heat}/100</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', heatLevel.color)}
                    style={{ width: `${Math.min(clue.heat, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                关联评论
                <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-normal">
                  {clueComments.length} 条
                </span>
              </h3>
              <div className="space-y-3">
                {(commentsExpanded ? clueComments : clueComments.slice(0, 3)).map((comment, idx) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded-xl bg-gray-50 border border-gray-100 animate-fadeIn"
                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                          {comment.userName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{comment.userName}</span>
                        {comment.userRole && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 text-[10px]">
                            {comment.userRole}
                          </span>
                        )}
                        {comment.isPrivate && (
                          <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[10px]">
                            内部
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{comment.createdAt.slice(5, 16)}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed pl-9">{comment.content}</p>
                  </div>
                ))}
              </div>
              {clueComments.length > 3 && (
                <button
                  onClick={() => setCommentsExpanded(!commentsExpanded)}
                  className="mt-3 w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1 transition-colors"
                >
                  {commentsExpanded ? (
                    <>
                      收起评论
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      展开全部 {clueComments.length} 条评论
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
              {clueComments.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  暂无关联评论
                </div>
              )}
            </div>

            {depts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" />
                  相关责任部门
                </h3>
                <div className="flex flex-wrap gap-2">
                  {depts.map((dept) => (
                    <span
                      key={dept}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 text-xs font-medium"
                    >
                      <Shield className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {clue.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">话题标签</h3>
                <div className="flex flex-wrap gap-1.5">
                  {clue.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors cursor-default"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {clue.remark && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">处置备注</h3>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm leading-relaxed">
                  {clue.remark}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CluesPage() {
  const navigate = useNavigate();
  const {
    selectedClueIds,
    filterParams,
    toggleClue,
    clearSelected,
    setFilterParams,
  } = useAppStore();

  const [activeClue, setActiveClue] = useState<Clue | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [heatRange, setHeatRange] = useState<[number, number]>([0, 100]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const filteredClues = useMemo(() => {
    const result = filterClues(clues, filterParams, heatRange);
    return result.sort((a, b) => b.heat - a.heat);
  }, [filterParams, heatRange]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const todayClues = clues.filter((c) => c.reportedAt.slice(0, 10) === todayStr);
    return {
      total: clues.length,
      today: todayClues.length,
      selected: selectedClueIds.length,
      highHeat: clues.filter((c) => c.heat > 80).length,
      highSensitive: clues.filter((c) => c.sensitiveLevel >= 3).length,
    };
  }, [selectedClueIds, todayStr]);

  const activeClueComments = useMemo(() => {
    if (!activeClue) return [];
    return comments.filter((c) => c.clueId === activeClue.id);
  }, [activeClue]);

  const allVisibleSelected =
    filteredClues.length > 0 && filteredClues.every((c) => selectedClueIds.includes(c.id));

  const handleCardClick = (clue: Clue) => {
    setActiveClue(clue);
    setDrawerOpen(true);
  };

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredClues.map((c) => c.id));
      const remaining = selectedClueIds.filter((id) => !visibleIds.has(id));
      if (remaining.length === 0) {
        clearSelected();
      } else {
        useAppStore.setState({ selectedClueIds: remaining });
      }
    } else {
      const merged = Array.from(new Set([...selectedClueIds, ...filteredClues.map((c) => c.id)]));
      useAppStore.setState({ selectedClueIds: merged });
    }
  };

  const handleGoEdit = () => {
    if (selectedClueIds.length > 0) {
      navigate('/edit');
    }
  };

  const handleFilterChange = (params: Partial<typeof filterParams>) => {
    setFilterParams(params);
  };

  return (
    <div className="min-h-screen bg-gov-bg pb-28">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="mb-6">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-7 h-7 text-gov-deepblue" />
                舆情线索池
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                共 {filteredClues.length} 条线索符合筛选条件，按热度从高到低排列
              </p>
            </div>
            <div className="text-xs text-gray-400">
              数据更新时间：{new Date().toLocaleString('zh-CN')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="今日线索总数"
              value={stats.total}
              icon={<Activity className="w-7 h-7" />}
              gradient="from-blue-500 to-blue-700"
              textColor="text-blue-600"
              delay={0}
            />
            <StatCard
              title="已选入报数量"
              value={stats.selected}
              icon={<FileText className="w-7 h-7" />}
              gradient="from-indigo-500 to-purple-600"
              textColor="text-indigo-600"
              delay={60}
            />
            <StatCard
              title="高热度线索（>80）"
              value={stats.highHeat}
              icon={<Flame className="w-7 h-7" />}
              gradient="from-orange-500 to-red-500"
              textColor="text-orange-600"
              delay={120}
            />
            <StatCard
              title="高敏感线索（≥3级）"
              value={stats.highSensitive}
              icon={<AlertTriangle className="w-7 h-7" />}
              gradient="from-rose-500 to-pink-600"
              textColor="text-rose-600"
              delay={180}
            />
          </div>

          <FilterBar
            params={filterParams}
            onChange={handleFilterChange}
            heatRange={heatRange}
            onHeatRangeChange={setHeatRange}
          />
        </div>

        <div className="relative">
          {filteredClues.length === 0 ? (
            <div className="py-20">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                  <SearchX className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              <div className="text-center mt-4">
                <p className="text-gray-500 text-sm">没有找到符合筛选条件的线索</p>
                <button
                  onClick={() => {
                    setHeatRange([0, 100]);
                    setFilterParams({
                      keyword: '',
                      status: undefined,
                      priority: undefined,
                      category: undefined,
                      source: undefined,
                      sensitiveLevel: undefined,
                      dateRange: undefined,
                      handlerId: undefined,
                      departmentTags: undefined,
                      creatorId: undefined,
                      page: 1,
                    });
                  }}
                  className="mt-3 px-4 py-1.5 rounded-lg text-sm bg-gov-deepblue text-white hover:bg-gov-navy transition-colors"
                >
                  清除所有筛选条件
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredClues.map((clue, idx) => (
                <div
                  key={clue.id}
                  className={cn(
                    'transition-all duration-500',
                    isLoaded
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  )}
                  style={{ transitionDelay: `${Math.min(idx * 40, 400)}ms` }}
                >
                  <ClueCard
                    clue={clue}
                    selected={selectedClueIds.includes(clue.id)}
                    onToggle={() => toggleClue(clue.id)}
                    onClick={() => handleCardClick(clue)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DetailDrawer
          clue={activeClue}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          clueComments={activeClueComments}
        />
      </div>

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30 transition-all duration-300',
          selectedClueIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        )}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <div className="bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]">
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleAll}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {allVisibleSelected && filteredClues.length > 0 ? (
                  <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                ) : (
                  <Square className="w-4.5 h-4.5 text-gray-400" />
                )}
                {allVisibleSelected && filteredClues.length > 0 ? '取消全选' : '全选当前结果'}
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">已选线索</div>
                  <div className="text-xl font-bold tabular-nums text-gray-900 leading-none">
                    {selectedClueIds.length}
                    <span className="text-sm font-normal text-gray-400 ml-1">
                      / {filteredClues.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedClueIds.length > 0 && (
                <button
                  onClick={clearSelected}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  清空选择
                </button>
              )}
              <button
                onClick={handleGoEdit}
                disabled={selectedClueIds.length === 0}
                className={cn(
                  'px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-200',
                  selectedClueIds.length > 0
                    ? 'bg-gradient-to-r from-gov-deepblue to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                转入编辑（{selectedClueIds.length}）
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedClueIds.length === 0 && (
        <div className="fixed bottom-4 right-4 z-20 animate-fadeIn">
          <div className="px-4 py-2 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-md text-xs text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            勾选线索后可批量转入编辑生成舆情专报
          </div>
        </div>
      )}
    </div>
  );
}
