export interface Clue {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  category: string;
  heat: number;
  status: 'pending' | 'processing' | 'verified' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  sensitiveLevel: 1 | 2 | 3 | 4;
  tags: string[];
  location?: string;
  reporter?: string;
  reporterContact?: string;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
  handlerId?: string;
  handlerName?: string;
  attachments?: string[];
  remark?: string;
}

export interface Comment {
  id: string;
  clueId: string;
  userId: string;
  userName: string;
  userRole?: string;
  content: string;
  createdAt: string;
  parentId?: string;
  replyTo?: string;
  isPrivate?: boolean;
  attachments?: string[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  description?: string;
  sections: ReportSection[];
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  enabled: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  order: number;
  type: 'summary' | 'statistics' | 'list' | 'analysis' | 'chart' | 'custom';
  content?: string;
  dataConfig?: Record<string, unknown>;
  required?: boolean;
}

export interface SensitiveMark {
  id: string;
  clueId: string;
  markType: 'person' | 'place' | 'organization' | 'event' | 'keyword';
  content: string;
  position?: {
    start: number;
    end: number;
  };
  level: 1 | 2 | 3 | 4;
  description?: string;
  markerId: string;
  markerName: string;
  markedAt: string;
  reviewed?: boolean;
  reviewerId?: string;
  reviewerName?: string;
}

export interface Report {
  id: string;
  templateId?: string;
  templateName?: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  period?: {
    startDate: string;
    endDate: string;
  };
  summary?: string;
  sections: ReportSection[];
  clueIds: string[];
  statistics?: {
    totalClues: number;
    pendingCount: number;
    processingCount: number;
    verifiedCount: number;
    closedCount: number;
  };
  status: 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected';
  creatorId: string;
  creatorName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  rejectReason?: string;
  version: number;
  isSensitive?: boolean;
  confidentialLevel?: 'internal' | 'secret' | 'confidential' | 'top-secret';
}

export interface ReviewRecord {
  id: string;
  targetId: string;
  targetType: 'clue' | 'report' | 'comment';
  action: 'submit' | 'approve' | 'reject' | 'assign' | 'transfer' | 'close' | 'comment';
  result?: 'pass' | 'fail' | 'pending';
  comment?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole?: string;
  createdAt: string;
  attachments?: string[];
  changes?: Array<{
    field: string;
    oldValue?: string;
    newValue?: string;
  }>;
}

export interface FilterParams {
  keyword?: string;
  status?: Clue['status'] | Clue['status'][];
  priority?: Clue['priority'] | Clue['priority'][];
  category?: string | string[];
  source?: string | string[];
  sensitiveLevel?: SensitiveMark['level'] | SensitiveMark['level'][];
  dateRange?: {
    start: string;
    end: string;
  };
  handlerId?: string;
  creatorId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
