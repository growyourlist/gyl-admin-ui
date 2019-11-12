import { hsh } from "./hsh";

export function showSiteError(messageElement: HTMLElement): void {
    const siteErrorContainer = hsh.byId('site-error-container')
    const siteError = hsh.byId('site-error')
    siteError.clear()
    siteError.append(messageElement)
    siteErrorContainer.show()
}
