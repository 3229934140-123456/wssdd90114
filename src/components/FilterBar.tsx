import { useState } from 'react';
import { Search, RotateCcw, ChevronDown, X, Flame } from 'lucide-react';
import type { FilterParams } from '@/shared/types';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  params: FilterParams;
  onChange: (params: Partial<FilterParams>) => void;
  heatRange: [number, number];
  onHeatRangeChange: (range: [number, number]) => void;
}

const sourceOptions = [
  { value: 'news', label: '新闻' },
  { value: 'video', label: '视频' },
  { value: 'forum', label: '论坛' },
  { value: 'hotline', label: '热线' },
];

const sensitiveOptions = [
  { value: 1, label: '一级' },
  { value: 2, label: '二级' },
  { value: 3, label: '三级' },
  { value: 4, label: '四级' },
];

const departmentOptions = [
  { value: '教育局', label: '市教育局' },
  { value: '卫健委', label: '市卫健委' },
  { value: '交通局', label: '市交通局' },
  { value: '市场监管局', label: '市市场监管局' },
  { value: '应急管理局', label: '市应急管理局' },
  { value: '生态环境局', label: '市生态环境局' },
  { value: '住建委', label: '市住建委' },
  { value: '城管执法局', label: '市城管执法局' },
];

const districtOptions = [
  { value: 'chaoyang', label: '朝阳区' },
  { value: 'haidian', label: '海淀区' },
  { value: 'xicheng', label: '西城区' },
  { value: 'dongcheng', label: '东城区' },
  { value: 'fengtai', label: '丰台区' },
  { value: 'shijingshan', label: '石景山区' },
  { value: 'tongzhou', label: '通州区' },
  { value: 'changping', label: '昌平区' },
  { value: 'daxing', label: '大兴区' },
  { value: 'fangshan', label: '房山区' },
  { value: 'mentougou', label: '门头沟区' },
  { value: 'shunyi', label: '顺义区' },
  { value: 'pinggu', label: '平谷区' },
  { value: 'huairou', label: '怀柔区' },
  { value: 'miyun', label: '密云区' },
  { value: 'yanqing', label: '延庆区' },
];

const quickDateOptions = [
  { value: 'today', label: '今日', days: 0 },
  { value: 'yesterday', label: '昨日', days: 1 },
  { value: '3days', label: '近3天', days: 2 },
  { value: '7days', label: '近7天', days: 6 },
];

interface MultiSelectProps {
  placeholder: string;
  options: { value: string | number; label: string }[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
}

function MultiSelect({ placeholder, options, value, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (val: string | number) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const selectedLabels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg',
          'bg-white/5 border border-white/10 text-white/90 text-sm',
          'hover:bg-white/10 transition-colors min-w-[130px]',
          open && 'ring-2 ring-blue-400/50'
        )}
      >
        <span className={cn('truncate', value.length === 0 && 'text-white/50')}>
          {value.length > 0 ? selectedLabels.join('、') : placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 ml-2 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] max-h-60 overflow-auto z-20 bg-white rounded-lg shadow-xl border border-gray-200 py-1">
            {options.map((opt) => (
              <div
                key={String(opt.value)}
                onClick={() => toggle(opt.value)}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer flex items-center gap-2',
                  'hover:bg-blue-50 transition-colors',
                  value.includes(opt.value) && 'bg-blue-50 text-blue-700'
                )}
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0',
                    value.includes(opt.value)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  )}
                >
                  {value.includes(opt.value) && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateRange(daysAgo: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysAgo);
  return {
    start: formatDate(start) + ' 00:00:00',
    end: formatDate(end) + ' 23:59:59',
  };
}

export default function FilterBar({ params, onChange, heatRange, onHeatRangeChange }: FilterBarProps) {
  const [activeQuickDate, setActiveQuickDate] = useState<string | null>(null);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ keyword: e.target.value });
  };

  const handleSourceChange = (value: (string | number)[]) => {
    onChange({ source: value.length > 0 ? (value as string[]) : undefined });
  };

  const handleSensitiveChange = (value: (string | number)[]) => {
    onChange({
      sensitiveLevel: value.length > 0 ? (value as 1 | 2 | 3 | 4[]) : undefined,
    });
  };

  const handleDeptChange = (value: (string | number)[]) => {
    onChange({ departmentTags: value.length > 0 ? (value as string[]) : undefined });
  };

  const handleDistrictChange = (value: (string | number)[]) => {
    onChange({ category: value.length > 0 ? (value as string[])[0] : undefined });
  };

  const handleQuickDate = (key: string, days: number) => {
    if (activeQuickDate === key) {
      setActiveQuickDate(null);
      onChange({ dateRange: undefined });
    } else {
      setActiveQuickDate(key);
      onChange({ dateRange: getDateRange(days) });
    }
  };

  const handleHeatChange = (e: React.ChangeEvent<HTMLInputElement>, index: 0 | 1) => {
    const val = Number(e.target.value);
    const newRange: [number, number] = [...heatRange] as [number, number];
    newRange[index] = val;
    if (index === 0 && val > heatRange[1]) newRange[0] = heatRange[1];
    if (index === 1 && val < heatRange[0]) newRange[1] = heatRange[0];
    onHeatRangeChange(newRange);
  };

  const handleReset = () => {
    setActiveQuickDate(null);
    onHeatRangeChange([0, 100]);
    onChange({
      keyword: '',
      source: undefined,
      sensitiveLevel: undefined,
      handlerId: undefined,
      departmentTags: undefined,
      category: undefined,
      dateRange: undefined,
      page: 1,
    });
  };

  const sourceValues = (params.source || []) as string[];
  const sensitiveValues = (params.sensitiveLevel || []) as number[];
  const deptValues = params.departmentTags || [];
  const districtValues = params.category
    ? Array.isArray(params.category)
      ? params.category
      : [params.category]
    : [];

  return (
    <div className="bg-gov-navy rounded-xl p-4 shadow-lg">
      <div className="flex flex-wrap gap-3 items-start">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="搜索关键词、标题、内容..."
              value={params.keyword || ''}
              onChange={handleKeywordChange}
              className={cn(
                'w-full pl-10 pr-10 py-2 rounded-lg text-sm',
                'bg-white/5 border border-white/10 text-white placeholder-white/40',
                'focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-transparent'
              )}
            />
            {params.keyword && (
              <button
                onClick={() => onChange({ keyword: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <MultiSelect
          placeholder="来源"
          options={sourceOptions}
          value={sourceValues}
          onChange={handleSourceChange}
        />

        <MultiSelect
          placeholder="敏感度"
          options={sensitiveOptions}
          value={sensitiveValues}
          onChange={handleSensitiveChange}
        />

        <MultiSelect
          placeholder="部门"
          options={departmentOptions}
          value={deptValues}
          onChange={handleDeptChange}
        />

        <MultiSelect
          placeholder="属地"
          options={districtOptions}
          value={districtValues}
          onChange={handleDistrictChange}
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/60 mr-1">时间：</span>
          {quickDateOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleQuickDate(opt.value, opt.days)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeQuickDate === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs text-white/60 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            热度
          </span>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={heatRange[0]}
              onChange={(e) => handleHeatChange(e, 0)}
              className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
            />
            <span className="text-xs text-white/60 w-12 text-center tabular-nums">
              {heatRange[0]}-{heatRange[1]}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={heatRange[1]}
              onChange={(e) => handleHeatChange(e, 1)}
              className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置
        </button>
      </div>
    </div>
  );
}
