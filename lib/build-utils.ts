// 构建时环境检查工具

export function isBuildTime(): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    (process.env.NEXT_PHASE === 'phase-production-build' || 
     process.argv.includes('build') ||
     process.env.npm_lifecycle_event === 'build')
  );
}

export function isStaticGeneration(): boolean {
  return (
    typeof window === 'undefined' && 
    (process.env.NEXT_PHASE === 'phase-production-build' ||
     process.env.npm_lifecycle_event === 'build')
  );
}

// 安全地执行可能在构建时失败的代码
export function safeExecute<T>(
  fn: () => T, 
  fallback: T, 
  errorMessage?: string
): T {
  if (isBuildTime() || isStaticGeneration()) {
    console.log(errorMessage || 'Skipping execution during build phase');
    return fallback;
  }
  
  try {
    return fn();
  } catch (error) {
    console.error(errorMessage || 'Safe execution failed:', error);
    return fallback;
  }
}