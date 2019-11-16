import '../style.scss'

import { fetchListsList, List } from '../common/api'
import {
	onDOMReady,
	firstBySelector,
	Elm,
	byId,
	HSHElement
} from '../common/hsh/hsh'
import { validateElement } from '../common/validateElement'

/** Validates the list id input element */
const validateListId = (inputElm: HTMLInputElement): void => {
	validateElement(inputElm, {
		required: { rule: true, message: 'List Id is required.' },
		maxLength: {
			rule: 64,
			message: 'List Id is at max length of 64 characters.',
			autoCut: true
		},
		pattern: {
			rule: /^[a-zA-Z0-9_\-]*$/,
			message: 'List Id must only contain ASCII letters (a-z, A-Z), '
				+ 'numbers (0-9), underscores (_), or dashes (-).'
		},
	})
}

/** Validates the list name input element */
const validateListName = (inputElm: HTMLInputElement): void => {
	validateElement(inputElm, {
		required: { rule: true, message: 'List Name is required.' },
		maxLength: {
			rule: 64, message:
				'List Name is at max length of 64 characters.',
			autoCut: true
		},
	})
}

/** Validates the source email input element */
const validateSourceEmail = (inputElm: HTMLInputElement): void => {
	validateElement(inputElm, {
		email: {
			message: 'Source Email must be a valid email address. E.g. '
				+ '\'test@example.com\' or \'"Example Name" <name@example.com>\''
		}
	})
}

const updateList = async (button: HTMLButtonElement) => {
	const editor = new HSHElement(
		document.querySelector(button.dataset['linkedEditorSelector'])
	)
	const submitButton = editor.query('.button.main')
	const editorForm = editor.query('.editor-form')

	// Remove existing status if it exists
	const existingStatus = editorForm.element.previousElementSibling
	if (existingStatus && existingStatus.classList.contains('status')) {
		existingStatus.parentElement.removeChild(existingStatus)
	}

	// Write new update status
	const status = editor.insertBefore(
		new Elm(
			{
				type: 'p',
				attrs: { 'class': 'status info' },
			},
			'Updating list...'
		),
		editorForm.element
	)

	// TODO make this actually post to the real system.
	console.log('Sending to POST list')
	console.log({
		id: editorForm.query('[name="list-id"]').value,
		name: editorForm.query('[name="list-name"]').value,
		sourceEmail: editorForm.query('[name="list-source-email"]').value || null,
	})
	setTimeout(() => {
		status.classes.remove('info')
		status.classes.add('success')
		status.text = 'List updated'
		submitButton.enable()
	}, 800)
	submitButton.disable()
}

const createListEditorContents = (list: List): Elm[] => {
	return [
		new Elm(
			{
				type: 'div',
				attrs: { 'class': 'grid grid-row-gap-1 editor-form m-t-1' }
			},
			[
				new Elm({
					type: 'label',
					attrs: {
						'for': 'list-id',
						'class': 'm-r-1 m-t-auto m-b-auto inline-block'
					},
					text: 'List Id',
				}),
				new Elm({
					type: 'input',
					attrs: {
						'name': 'list-id',
						'class': 'input',
						'placeholder': 'List Id',
						'data-linked-button-selector':
							`.list-editor-${list.id} .button.main`,
					},
					value: list.id,
					events: {
						'change': function () { validateListId(<HTMLInputElement>this) },
						'keyup': function () { validateListId(<HTMLInputElement>this) },
					}
				}),
				new Elm({
					type: 'label',
					attrs: {
						'for': 'list-name',
						'class': 'm-r-1 m-t-auto m-b-auto inline-block',
					},
					text: 'List Name',
				}),
				new Elm({
					type: 'input',
					attrs: {
						'name': 'list-name',
						'class': 'input',
						'placeholder': 'List Name',
						'data-linked-button-selector':
							`.list-editor-${list.id} .button.main`,
					},
					value: list.name,
					events: {
						'change': function () { validateListName(<HTMLInputElement>this) },
						'keyup': function () { validateListName(<HTMLInputElement>this) },
					}
				}),
				new Elm(
					{
						type: 'label',
						attrs: {
							'for': 'list-source-email',
							'class': 'm-r-1 m-t-auto m-b-auto inline-block',
						},
					},
					[
						'Source Email (optional)', ' ',
						new Elm('small', 'Emails for this mailing list will your account-'
							+ 'level default source email address if one is not set here.')
					]
				),
				new Elm({
					type: 'input',
					attrs: {
						'name': 'list-source-email',
						'class': 'input',
						'type': 'email',
						'placeholder': 'e.g. \'test@example.com\' or '
							+ '\'"Name" <name@example.com>\'',
						'data-linked-button-selector':
							`.list-editor-${list.id} .button.main`,
					},
					value: list.sourceEmail || '',
					events: {
						'change': function () {
							validateSourceEmail(<HTMLInputElement>this)
						},
						'keyup': function () {
							validateSourceEmail(<HTMLInputElement>this)
						},
					}
				}),
				new Elm({
					type: 'button',
					attrs: {
						'class': 'button main',
						'data-linked-editor-selector':
							`.list-editor-${list.id}`
					},
					text: 'Update List',
					events: {
						'click': function () { updateList(<HTMLButtonElement>this) }
					}
				})
			]
		)
	]
}

/** When the dom is ready, fetch and display the lists. */
onDOMReady(async () => {
	const lists: List[] = await fetchListsList()
	const container = firstBySelector('.lists-container')
	container.append(
		new Elm(
			{
				type: 'ul',
				attrs: {
					'class': 'menu vertical large font-size-1p25'
				}
			},
			lists.map(list => new Elm(
				{
					type: 'li',
					attrs: {
						'class': 'p-1',
						'id': list.id
					}
				},
				[
					new Elm('strong', list.name),
					' ',
					new Elm(
						{
							type: 'button',
							attrs: {
								'class': 'button minor m-l-1 edit',
							},
							events: {
								'click': () => {
									const listItem = byId(list.id)
									const editButton = listItem.query('.button.edit')
									if (listItem.classes.contains('edit-mode')) {
										const editor = listItem.query(`.list-editor-${list.id}`)
										editor.delete()
										listItem.classes.remove('edit-mode')
										editButton.text = '🔧 Edit'
										return
									}

									// Turn the list item into edit mode
									listItem.classes.add('edit-mode')
									editButton.text = '❌ Close Editor'
									listItem.append(new Elm(
										{
											type: 'div',
											attrs: {
												'class': `list-editor-${list.id}`,
											}
										},
										createListEditorContents(list)
									))
								}
							}
						},
						'🔧 Edit'
					),
				]
			))
		)
	)
})
