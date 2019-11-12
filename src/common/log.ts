import { isDebug } from "../config";

export function log(message: any): void {
    if (isDebug) {
        console.log(message)
    }
}
