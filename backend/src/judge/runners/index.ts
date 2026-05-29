import { env } from '../../config/env';
import { ApiError } from '../../middleware/errorHandler';
import { JudgeLanguage, LanguageRunner } from '../types';

const aliases: Record<string, JudgeLanguage> = {
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python',
  cpp: 'cpp',
  'c++': 'cpp',
  java: 'java',
};

export function normalizeLanguage(language: string): JudgeLanguage {
  const normalized = aliases[language.trim().toLowerCase()];

  if (!normalized) {
    throw ApiError.badRequest(`Unsupported judge language: ${language}`);
  }

  return normalized;
}

export function getLanguageRunner(language: string): LanguageRunner {
  const normalized = normalizeLanguage(language);

  const runners: Record<JudgeLanguage, LanguageRunner> = {
    javascript: {
      language: 'javascript',
      displayName: 'JavaScript',
      sourceFile: 'main.js',
      image: env.JUDGE_IMAGE_JAVASCRIPT,
      runCommand: ['node', 'main.js'],
    },
    python: {
      language: 'python',
      displayName: 'Python',
      sourceFile: 'main.py',
      image: env.JUDGE_IMAGE_PYTHON,
      runCommand: ['python3', 'main.py'],
    },
    cpp: {
      language: 'cpp',
      displayName: 'C++',
      sourceFile: 'main.cpp',
      image: env.JUDGE_IMAGE_CPP,
      compileCommand: ['g++', 'main.cpp', '-std=c++17', '-O2', '-o', 'main'],
      runCommand: ['./main'],
    },
    java: {
      language: 'java',
      displayName: 'Java',
      sourceFile: 'Main.java',
      image: env.JUDGE_IMAGE_JAVA,
      compileCommand: ['javac', 'Main.java'],
      runCommand: ['java', 'Main'],
    },
  };

  return runners[normalized];
}
