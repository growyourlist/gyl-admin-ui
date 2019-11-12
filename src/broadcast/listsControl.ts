import { hsh } from '../common/hsh'
import { apiRequest } from '../common/apiRequest'

const { byId, onDOMReady, newElm } = hsh

export class List {
    name: string
    id: string
}

onDOMReady(() => {
    const loadListsButton = byId('list-lists-button')
    const listElm = byId('lists-list')

    const fetchListsList = async(): Promise<List[]> => {
        const response = await apiRequest('/lists')
        const lists = await response.json()
        return <List[]>lists
    }

    const renderLists = (lists: List[]) => {
        listElm.append(newElm('div', {
            attrs: {
                'class': 'm-t-0p5'
            },
            children: lists.map(list => newElm('div', {
                children: [newElm('label', {
                    children: [
                        newElm('input', {
                            attrs: {
                                type: 'checkbox',
                                value: list.id,
                                class: 'list-id',
                            }
                        }),
                        newElm('span', ` ${list.name} (${list.id})`)
                    ]
                })]
            }))
        }))
    }

    const getLists = async(): Promise<void> => {
        try {
            listElm.clear()
            loadListsButton.disable()
            listElm.append(newElm('p', 'Loading...'))
            const lists = await fetchListsList()
            listElm.clear()
            renderLists(lists)
            loadListsButton.hide()
        }
        catch (err) {
            console.error(err)
            listElm.clear()
            listElm.append(newElm('p', {
                attrs: {
                    'class': 'error',
                },
                text: `Error: ${err.message}`,
            }))
        }
        finally {
            loadListsButton.enable()
        }
    }
    
    loadListsButton.aEL('click', getLists)
})
