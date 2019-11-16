import { Elm, byId, onDOMReady } from '../common/hsh'
import { List, fetchListsList } from '../common/api'

onDOMReady(() => {
	const loadListsButton = byId('list-lists-button')
	const listElm = byId('lists-list')

	const renderLists = (lists: List[]) => {
		listElm.append(
			new Elm(
				{
					type: 'div',
					attrs: {
						'class': 'm-t-0p5'
					},
				},
				lists.map(list => new Elm(
					'div',
					[
						new Elm(
							'label',
							[
								new Elm({
									type: 'input',
									attrs: {
										'type': 'checkbox',
										'value': list.id,
										'class': 'list-id'
									}
								}),
								new Elm(
									{ type: 'span' },
									` ${list.name} (${list.id})`
								)
							]
						)
					]
				))
			)
		)
	}

	const getLists = async (): Promise<void> => {
		try {
			listElm.clear()
			loadListsButton.disable()
			listElm.append(new Elm('p', 'Loading...'))
			const lists = await fetchListsList()
			listElm.clear()
			renderLists(lists)
			loadListsButton.hide()
		}
		catch (err) {
			console.error(err)
			listElm.clear()
			listElm.append(new Elm(
				{
					type: 'p',
					attrs: {
						'class': 'error',
					},
				},
				`Error: ${err.message}`,
			))
		}
		finally {
			loadListsButton.enable()
		}
	}

	loadListsButton.on('click', getLists)
})
