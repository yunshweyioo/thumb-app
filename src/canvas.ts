export const canvas = document.getElementById('c') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;
export const W = 820;
export const H = 420;
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

canvas.width = W * DPR;
canvas.height = H * DPR;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(DPR, DPR);
