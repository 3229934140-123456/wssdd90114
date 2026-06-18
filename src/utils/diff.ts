export interface DiffItem {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

export function diff(oldText: string, newText: string): DiffItem[] {
  if (oldText === newText) {
    return oldText ? [{ type: 'unchanged', text: oldText }] : [];
  }

  const oldChars = oldText ? oldText.split('') : [];
  const newChars = newText ? newText.split('') : [];
  const dp = computeLCS(oldChars, newChars);

  const result: DiffItem[] = [];
  let i = oldChars.length;
  let j = newChars.length;

  const temp: DiffItem[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldChars[i - 1] === newChars[j - 1]) {
      temp.unshift({ type: 'unchanged', text: oldChars[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.unshift({ type: 'added', text: newChars[j - 1] });
      j--;
    } else if (i > 0) {
      temp.unshift({ type: 'removed', text: oldChars[i - 1] });
      i--;
    }
  }

  for (const item of temp) {
    const last = result[result.length - 1];
    if (last && last.type === item.type) {
      last.text += item.text;
    } else {
      result.push({ ...item });
    }
  }

  return result;
}
