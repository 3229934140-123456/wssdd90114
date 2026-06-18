export function formatNumber(num: number, decimals: number = 0, separator: string = ','): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  const fixed = Number(num).toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return parts.join('.');
}

export function formatTime(
  value: string | number | Date,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return String(value);
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return format
    .replace(/YYYY/g, String(year))
    .replace(/MM/g, pad(month))
    .replace(/DD/g, pad(day))
    .replace(/HH/g, pad(hours))
    .replace(/mm/g, pad(minutes))
    .replace(/ss/g, pad(seconds));
}

const SOURCE_MAP: Record<string, string> = {
  internet: '网络巡查',
  report: '群众举报',
  media: '媒体报道',
  government: '政务通报',
  inspection: '监督检查',
  transfer: '线索移送',
  bigdata: '大数据发现',
  ai: 'AI智能识别',
  weibo: '微博平台',
  wechat: '微信平台',
  forum: '论坛社区',
  shortvideo: '短视频平台',
  news: '新闻网站',
  hotline: '热线电话',
  letter: '来信来访',
  other: '其他来源',
};

export function getSourceName(source: string): string {
  if (!source) {
    return '未知来源';
  }
  return SOURCE_MAP[source] || source;
}

export function getHeatText(heat: number): string {
  if (heat === null || heat === undefined || isNaN(heat)) {
    return '未知热度';
  }
  if (heat >= 10000) {
    return `${(heat / 10000).toFixed(1)}万热度`;
  }
  if (heat >= 1000) {
    return `${(heat / 1000).toFixed(1)}千热度`;
  }
  return `${heat}热度`;
}
