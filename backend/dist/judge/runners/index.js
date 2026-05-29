"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLanguage = normalizeLanguage;
exports.getLanguageRunner = getLanguageRunner;
const env_1 = require("../../config/env");
const errorHandler_1 = require("../../middleware/errorHandler");
const aliases = {
    javascript: 'javascript',
    js: 'javascript',
    python: 'python',
    py: 'python',
    cpp: 'cpp',
    'c++': 'cpp',
    java: 'java',
};
function normalizeLanguage(language) {
    const normalized = aliases[language.trim().toLowerCase()];
    if (!normalized) {
        throw errorHandler_1.ApiError.badRequest(`Unsupported judge language: ${language}`);
    }
    return normalized;
}
function getLanguageRunner(language) {
    const normalized = normalizeLanguage(language);
    const runners = {
        javascript: {
            language: 'javascript',
            displayName: 'JavaScript',
            sourceFile: 'main.js',
            image: env_1.env.JUDGE_IMAGE_JAVASCRIPT,
            runCommand: ['node', 'main.js'],
        },
        python: {
            language: 'python',
            displayName: 'Python',
            sourceFile: 'main.py',
            image: env_1.env.JUDGE_IMAGE_PYTHON,
            runCommand: ['python3', 'main.py'],
        },
        cpp: {
            language: 'cpp',
            displayName: 'C++',
            sourceFile: 'main.cpp',
            image: env_1.env.JUDGE_IMAGE_CPP,
            compileCommand: ['g++', 'main.cpp', '-std=c++17', '-O2', '-o', 'main'],
            runCommand: ['./main'],
        },
        java: {
            language: 'java',
            displayName: 'Java',
            sourceFile: 'Main.java',
            image: env_1.env.JUDGE_IMAGE_JAVA,
            compileCommand: ['javac', 'Main.java'],
            runCommand: ['java', 'Main'],
        },
    };
    return runners[normalized];
}
//# sourceMappingURL=index.js.map