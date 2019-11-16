import { apiRequest } from "./apiRequest"

export class List {
	name: string
	id: string
	sourceEmail?: string
}

export const fetchListsList = async (): Promise<List[]> => {
	const response = await apiRequest('/lists')
	const lists = await response.json()
	return <List[]>lists
}
