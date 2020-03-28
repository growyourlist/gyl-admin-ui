import { apiRequest } from "./apiRequest";

export const loadTemplates = async (callback: (templates: any[]) => any) => {
	let nextToken = '';
	let templates: any[] = [];
	try {
		do {
			const response = await apiRequest(
				`/admin/templates${nextToken &&
					`?nextToken=${encodeURIComponent(nextToken)}`}`
			);
			const data = await response.json();
			templates = templates.concat(data.templates);
			nextToken = data.nextToken;
			// Avoid hitting AWS SES template request limit
			await new Promise((resolve) => setTimeout(resolve, 1000));
		} while (nextToken)
		callback(templates);
	}
	catch (err) {
		console.error(err)
	}
}
