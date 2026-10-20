function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });
}


export async function withRetry(fn, { retries = 3, delay = 1000, signal, onAttempt } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        onAttempt?.(attempt);
        try {
            return await fn();
        } catch (err) {
            lastError = err;

     
            if (signal?.aborted) throw err;

            const status = err.response?.status;
            if (status && status < 500) throw err;

            if (attempt < retries) {
                console.warn(`Попытка ${attempt} не удалась, повтор через ${delay * attempt} мс`);
                await sleep(delay * attempt, signal);
            }
        }
    }

    throw lastError;
}
