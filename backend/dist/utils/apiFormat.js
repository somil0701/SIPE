"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionTypeForApi = questionTypeForApi;
exports.interviewTypeForApi = interviewTypeForApi;
exports.interviewStatusForApi = interviewStatusForApi;
exports.pathStatusForApi = pathStatusForApi;
exports.pathItemTypeForApi = pathItemTypeForApi;
exports.pathItemStatusForApi = pathItemStatusForApi;
exports.spacedRepetitionStatusForApi = spacedRepetitionStatusForApi;
exports.serializeQuestion = serializeQuestion;
exports.serializeInterview = serializeInterview;
exports.serializeLearningPath = serializeLearningPath;
exports.serializeSpacedRepetition = serializeSpacedRepetition;
const questionTypeToApi = {
    CODING: 'coding',
    SYSTEM_DESIGN: 'system-design',
    BEHAVIORAL: 'behavioral',
    THEORETICAL: 'theoretical',
    QUIZ: 'quiz',
};
const interviewTypeToApi = {
    TECHNICAL: 'technical',
    BEHAVIORAL: 'behavioral',
    MIXED: 'mixed',
    SYSTEM_DESIGN: 'system-design',
};
const interviewStatusToApi = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ABANDONED: 'abandoned',
};
const pathStatusToApi = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ABANDONED: 'abandoned',
};
const pathItemTypeToApi = {
    QUESTION: 'question',
    LESSON: 'lesson',
    REVIEW: 'review',
    MILESTONE: 'milestone',
};
const pathItemStatusToApi = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    SKIPPED: 'skipped',
};
const spacedRepetitionStatusToApi = {
    ACTIVE: 'active',
    MASTERED: 'mastered',
    PAUSED: 'paused',
};
function questionTypeForApi(value) {
    return questionTypeToApi[value] ?? value;
}
function interviewTypeForApi(value) {
    return interviewTypeToApi[value] ?? value;
}
function interviewStatusForApi(value) {
    return interviewStatusToApi[value] ?? value;
}
function pathStatusForApi(value) {
    return pathStatusToApi[value] ?? value;
}
function pathItemTypeForApi(value) {
    return pathItemTypeToApi[value] ?? value;
}
function pathItemStatusForApi(value) {
    return pathItemStatusToApi[value] ?? value;
}
function spacedRepetitionStatusForApi(value) {
    return spacedRepetitionStatusToApi[value] ?? value;
}
function serializeQuestion(question) {
    return {
        ...question,
        type: question.type ? questionTypeForApi(String(question.type)) : question.type,
    };
}
function serializeInterview(interview) {
    return {
        ...interview,
        interviewType: interview.interviewType
            ? interviewTypeForApi(String(interview.interviewType))
            : interview.interviewType,
        status: interview.status ? interviewStatusForApi(String(interview.status)) : interview.status,
    };
}
function serializeLearningPath(path) {
    const pathItems = Array.isArray(path.pathItems)
        ? path.pathItems.map((item) => ({
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
function serializeSpacedRepetition(entry) {
    return {
        ...entry,
        status: entry.status ? spacedRepetitionStatusForApi(String(entry.status)) : entry.status,
    };
}
//# sourceMappingURL=apiFormat.js.map