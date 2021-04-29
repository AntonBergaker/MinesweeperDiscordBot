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
        ratesResetTime = ratesResetTime * 1000 + 900; // convert to ms, add 900ms because maybe roundtrip is like 100 and it only reports in seconds and might round down
        if (this.ratesResetTime != ratesResetTime) {
            this.ratesLeft = ratesLeft;
            this.ratesResetTime = ratesResetTime;
        } else {
            this.ratesLeft = Math.min(this.ratesLeft, ratesLeft);
        }
        console.log({left: this.ratesLeft, reset: this.ratesResetTime})
    }

    public spendRate() {
        this.ratesLeft--;
    }

    /**
     * Run this when reached the end of limit
     */
    public runNowOrDelayed( func: (wasDelayed: boolean) => void ) {
        const resetDelay = this.ratesResetTime - Date.now();
        console.log(resetDelay);
        if (resetDelay < 0) {
            this.ratesLeft = 99;
        }

        if (this.ratesLeft > 0) {
            this.spendRate();
            func(false);
            return;
        }

        if (this.storedDelay) {
            return;
        }
        this.storedDelay = true;
        setTimeout( () => {
            func(true);
            this.storedDelay = false;
        }, resetDelay);
    }
}