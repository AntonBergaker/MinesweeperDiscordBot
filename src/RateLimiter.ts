export class RateLimiter {

    private lastTimeStamps:number[] = [0, 0, 0, 0, 0];
    private insertIndex: number = 0;
    private queuedEnd = false;
    /**
     * Returns false if we queued 5 things last 5 seconds
     */
    public isLimited(): boolean {
        const fiveSecondsAgo = Date.now() - 1000*5;
        // current writeindex should be the oldest time
        return this.lastTimeStamps[this.insertIndex] > fiveSecondsAgo;

    }

    public add(): void {
        this.lastTimeStamps[this.insertIndex] = Date.now();
        this.insertIndex = (this.insertIndex + 1) % this.lastTimeStamps.length;
    }

    public limitEnd(): number {
        // current writeindex should be the oldest time, so add 5 seconds to it to get the next time we can write
        return this.lastTimeStamps[this.insertIndex] + 1000*5;
    }

    /**
     * Run this when reached the end of limit
     */
    public async runOnEnd( func: () => void ) {
        if (this.queuedEnd) {
            return;
        }
        this.queuedEnd = true;
        const delay = this.limitEnd() - Date.now();
        setTimeout( () => {
            func();
            this.queuedEnd = false;
        }, delay);
    }
}