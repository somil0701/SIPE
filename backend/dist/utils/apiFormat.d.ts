type AnyRecord = Record<string, any>;
export declare function questionTypeForApi(value: string): string;
export declare function interviewTypeForApi(value: string): string;
export declare function interviewStatusForApi(value: string): string;
export declare function pathStatusForApi(value: string): string;
export declare function pathItemTypeForApi(value: string): string;
export declare function pathItemStatusForApi(value: string): string;
export declare function spacedRepetitionStatusForApi(value: string): string;
export declare function serializeQuestion<T extends AnyRecord>(question: T): T;
export declare function serializeInterview<T extends AnyRecord>(interview: T): T;
export declare function serializeLearningPath<T extends AnyRecord>(path: T): T;
export declare function serializeSpacedRepetition<T extends AnyRecord>(entry: T): T;
export {};
//# sourceMappingURL=apiFormat.d.ts.map