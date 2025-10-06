/*
LEEWAY HEADER — DO NOT REMOVE
REGION: UI.UNKNOWN
COLOR_ONION_HEX: NEON=#39FF14 FLUO=#0DFF94 PASTEL=#C7FFD8
ICON_ASCII: family=lucide glyph=layout-dashboard ICON_SIG=CD534113
5WH: WHAT=Module: rateLimiter.ts; WHY=standardize; WHO=RapidWebDevelop; WHERE=F:\4leeway-multitool\utils\rateLimiter.ts; WHEN=2025-10-05; HOW=React/Tailwind
SIG: 00000000
AGENTS: AZR, PHI3, GEMINI, QWEN, LLAMA, ECHO
SPDX-License-Identifier: MIT
*/



type AsyncTask<T> = () => Promise<T>;

class RateLimiter {
    private queue: { task: AsyncTask<any>; resolve: (value: any) => void; reject: (reason?: any) => void; }[] = [];
    private isProcessing = false;
    private intervalMs: number;

    constructor(intervalMs: number) {
        this.intervalMs = intervalMs;
    }

    /**
     * Schedules a task to be executed. The task is added to a queue and will be
     * executed after the specified interval has passed since the last task finished.
     * @param task The async function to execute.
     * @returns A promise that resolves or rejects with the result of the task.
     */
    public schedule<T>(task: AsyncTask<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            // If the queue is not currently being processed, start processing.
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    private async processQueue() {
        // If the queue is empty, stop processing.
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const { task, resolve, reject } = this.queue.shift()!;

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            // Wait for the interval before allowing the next item to be processed.
            setTimeout(() => {
                // Recursively call processQueue to handle the next item.
                this.isProcessing = false;
                this.processQueue();
            }, this.intervalMs);
        }
    }
}

// Initialize a single limiter for the Gemini API.
// A 20-second delay (3 requests per minute) is a very safe value to avoid hitting
// free-tier limits for the image generation API, which is more restrictive than the text API.
export const geminiApiLimiter = new RateLimiter(20000);