import { Elm, byId } from "./hsh";

export function showSiteError(messageElement: Elm): void {
	const siteErrorContainer = byId('site-error-container')
	const siteError = byId('site-error')
	siteError.clear()
	siteError.append(messageElement)
	siteErrorContainer.show()
}
