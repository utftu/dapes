export const randomRgbTextStart = () => {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `\x1b[38;2;${r};${g};${b}m`;
};
