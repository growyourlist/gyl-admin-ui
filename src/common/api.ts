import { apiRequestOrThrow } from "./apiRequest"

export interface List {
	name: string
	id: string
	sourceEmail: string | null
}

export const fetchListsList = async (): Promise<List[]> => {
	const response = await apiRequestOrThrow('/admin/lists')
	const lists = await response.json()
	return <List[]>lists
}

export const postList = async (list: List): Promise<string> => {
	const response = await apiRequestOrThrow('/admin/list', {
		method: 'POST',
		body: JSON.stringify(list)
	})
	if (!response.ok) {
		throw new Error(await response.text())
	}
	return await response.text()
}
