type AnyRecord = Record<string, any>;

const questionTypeToApi: Record<string, string> = {
  CODING: 'coding',
  SYSTEM_DESIGN: 'system-design',
  BEHAVIORAL: 'behavioral',
  THEORETICAL: 'theoretical',
  QUIZ: 'quiz',
};

const interviewTypeToApi: Record<string, string> = {
  TECHNICAL: 'technical',
  BEHAVIORAL: 'behavioral',
  MIXED: 'mixed',
  SYSTEM_DESIGN: 'system-design',
};

const interviewStatusToApi: Record<string, string> = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ABANDONED: 'abandoned',
};

const pathStatusToApi: Record<string, string> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

const pathItemTypeToApi: Record<string, string> = {
  QUESTION: 'question',
  LESSON: 'lesson',
  REVIEW: 'review',
  MILESTONE: 'milestone',
};

const pathItemStatusToApi: Record<string, string> = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
};

const spacedRepetitionStatusToApi: Record<string, string> = {
  ACTIVE: 'active',
  MASTERED: 'mastered',
  PAUSED: 'paused',
};

export function questionTypeForApi(value: string): string {
  return questionTypeToApi[value] ?? value;
}

export function interviewTypeForApi(value: string): string {
  return interviewTypeToApi[value] ?? value;
}

export function interviewStatusForApi(value: string): string {
  return interviewStatusToApi[value] ?? value;
}

export function pathStatusForApi(value: string): string {
  return pathStatusToApi[value] ?? value;
}

export function pathItemTypeForApi(value: string): string {
  return pathItemTypeToApi[value] ?? value;
}

export function pathItemStatusForApi(value: string): string {
  return pathItemStatusToApi[value] ?? value;
}

export function spacedRepetitionStatusForApi(value: string): string {
  return spacedRepetitionStatusToApi[value] ?? value;
}

export function serializeQuestion<T extends AnyRecord>(question: T): T {
  return {
    ...question,
    type: question.type ? questionTypeForApi(String(question.type)) : question.type,
  };
}

export function serializeInterview<T extends AnyRecord>(interview: T): T {
  return {
    ...interview,
    interviewType: interview.interviewType
      ? interviewTypeForApi(String(interview.interviewType))
      : interview.interviewType,
    status: interview.status ? interviewStatusForApi(String(interview.status)) : interview.status,
  };
}

export function serializeLearningPath<T extends AnyRecord>(path: T): T {
  const pathItems = Array.isArray(path.pathItems)
    ? path.pathItems.map((item: AnyRecord) => ({
        ...item,
        itemType: item.itemType ? pathItemTypeForApi(String(item.itemType)) : item.itemType,
        status: item.status ? pathItemStatusForApi(String(item.status)) : item.status,
      }))
    : path.pathItems;

  return {
    ...path,
    status: path.status ? pathStatusForApi(String(path.status)) : path.status,
    pathItems,
  };
}

export function serializeSpacedRepetition<T extends AnyRecord>(entry: T): T {
  return {
    ...entry,
    status: entry.status ? spacedRepetitionStatusForApi(String(entry.status)) : entry.status,
  };
}
