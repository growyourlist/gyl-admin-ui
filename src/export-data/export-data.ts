import { onDOMReady, byId } from '../common/hsh/hsh'

const parseTagQuery = (tagQuery: string) => {
	const _query = tagQuery.trim()
	if (!_query) {
		return ''
	}
}

onDOMReady(() => {
	const tagQueryElement = byId('tag-query')
	tagQueryElement.on('keyup', () => {
		console.log(parseTagQuery(tagQueryElement.value))
	})
})
