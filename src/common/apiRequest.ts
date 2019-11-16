import { log } from "./log"
import { showSiteError } from "./showSiteError"
import { Elm } from "./hsh/hsh"

export async function apiRequest(input: RequestInfo, init?: RequestInit): Promise<Response> {
	const apiUrl = sessionStorage.getItem('gyl-api-url')
	const apiKey = sessionStorage.getItem('gyl-api-key')
	if (!apiKey || !apiUrl) {
		showSiteError(
			new Elm('p', [
				new Elm('span', 'API URL or API key is missing at the moment. '),
				new Elm(
					{
						type: 'a',
						attrs: {
							'href': '/'
						},
					},
					'Set API connection details',
				),
				new Elm('span', '.')
			]
		))
		throw new Error('API Key not set')
	}

	let request: Request = null
	if (input instanceof Request) {
		request = Object.assign({}, input, {
			url: `${apiUrl}${input.url}`,
			headers: Object.assign({}, (input.headers || {}), {
				'x-api-key': apiKey
			}),
			mode: 'cors'
		})
	}
	else {
		const requestInit = Object.assign({}, (init || {}), {
			headers: Object.assign({}, ((init && init.headers) || {}), {
				'x-api-key': apiKey
			}),
			mode: 'cors'
		})
		request = new Request(`${apiUrl}${input}`, requestInit)
	}
	log(`Making request to: ${request.url}`)
	try {
		const response = await fetch(request)
		if (!response.ok) {
			throw new Error(`API request failed. Response: ${response.status} ${response.statusText}`)
		}
		return response
	} catch (err) {
		if (err.message.indexOf('NetworkError') >= 0) {
			showSiteError(new Elm('p', [
					new Elm('span', 'Check your API connection details. '),
					new Elm(
						{
							type: 'a',
							attrs: {
								'href': '/'
							},
						},
						'Set API connection'
					),
					new Elm('span', '.')
				]
			))
		}
		throw err
	}
}
