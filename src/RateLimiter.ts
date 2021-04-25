export class RateLimiter {

    private ratesLeft: number;
    private ratesResetTime: number;
    private storedDelay = false;

    constructor() {
        this.ratesLeft = 5;
        this.ratesResetTime = 0;
    }

    /**
     * Insert new rate information
     * @param ratesResetTime Time in seconds when the rates reset
     * @param ratesLeft How many rates are left
     */
    public insertRates(ratesResetTime: number, ratesLeft: number) {
        if (this.ratesResetTime != ratesResetTime) {
            this.ratesLeft = ratesLeft;
            this.ratesResetTime = ratesResetTime * 1000;
        } else {
            this.ratesLeft = Math.min(this.ratesLeft, ratesLeft);
        }
    }

    public spendRate() {
        this.ratesLeft--;
    }

    /**
     * Run this when reached the end of limit
     */
    public runNowOrDelayed( func: () => void ) {
        const resetDelay = this.ratesResetTime - Date.now();
        if (resetDelay < 0) {
            this.ratesLeft = 99;
        }

        if (this.ratesLeft > 0) {
            this.spendRate();
            func();
            return;
        }

        if (this.storedDelay) {
            return;
        }
        this.storedDelay = true;
        setTimeout( () => {
            func();
            this.storedDelay = false;
        }, resetDelay);
    }
}