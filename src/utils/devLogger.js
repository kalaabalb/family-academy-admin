export const devLog = () => {};

export const devWarn = () => {};

export const devError = () => {};

const devLogger = {
  log: devLog,
  warn: devWarn,
  error: devError,
};

export default devLogger;
