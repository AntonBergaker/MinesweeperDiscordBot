import { Config } from "./Config";

export function clamp(num : number, min : number, max : number) : number {
    return num <= min ? min : num >= max ? max : num;
}

export function getIdentifier(config: Config) {
    return typeof config.identifier == "string" ? config.identifier : config.identifier[0];
}

export function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function printedList(array: any[]): string {
    if (array.length == 1) {
        return array[0];
    }
    return array.slice(0, array.length-1).map(x => String(x)).join(', ') + " and " + array[array.length-1];
}