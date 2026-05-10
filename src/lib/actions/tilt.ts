import type { Action } from 'svelte/action';

interface TiltOptions {
	max?: number;
	perspective?: number;
}

export const tilt: Action<HTMLElement, TiltOptions | undefined> = (node, params) => {
	let max = params?.max ?? 2.5;
	let perspective = params?.perspective ?? 900;

	function setTransform(rx: number, ry: number) {
		node.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
	}

	function handleMove(e: MouseEvent) {
		const rect = node.getBoundingClientRect();
		const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
		setTransform(-ny * max, nx * max);
	}

	function handleLeave() {
		setTransform(0, 0);
	}

	node.style.transition = 'transform 0.18s ease-out';
	node.style.willChange = 'transform';
	setTransform(0, 0);

	node.addEventListener('mousemove', handleMove);
	node.addEventListener('mouseleave', handleLeave);

	return {
		update(newParams) {
			max = newParams?.max ?? 2.5;
			perspective = newParams?.perspective ?? 900;
		},
		destroy() {
			node.removeEventListener('mousemove', handleMove);
			node.removeEventListener('mouseleave', handleLeave);
		}
	};
};
