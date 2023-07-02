
// https://www.geeksforgeeks.org/difference-between-debouncing-and-throttling/
export function debounce(func, delay) {
    let timerId;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timerId);
        timerId = setTimeout(function () {
            func.apply(context, args);
        }, delay);
    };
}


export function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = performance.now();
        if (now - lastCall < delay) {
            return;
        }
        lastCall = now;
        func(...args);
    };
}