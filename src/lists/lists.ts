import { fetchListsList, List, postList } from '../common/api'
import {
	onDOMReady,
	firstBySelector,
	Elm,
	byId,
	HSHElement,
} from '../common/hsh/hsh'
import { validateElement } from '../common/validateElement'
import { apiRequest } from '../common/apiRequest'

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
	const existingStatus = submitButton.parent.query('.status')
	if (existingStatus && existingStatus.classes.contains('status')) {
		existingStatus.removeSelf()
	}

	// Write new update status
	const status = submitButton.parent.insertBefore(
		new Elm(
			{
				type: 'p',
				attrs: { 'class': 'status info m-t-0' },
			},
			'Updating list...'
		),
		submitButton
	)

	submitButton.disable()
	try {
		const responseText = await postList({
			id: editorForm.query('[name="list-id"]').value,
			name: editorForm.query('[name="list-name"]').value,
			sourceEmail: editorForm.query('[name="list-source-email"]').value || null,
		})
		status.classes.remove('info')
		status.classes.add('success')
		status.text = responseText
	}
	catch (err) {
		status.classes.remove('info')
		status.classes.add('error')
		status.text = err.message
	}
	submitButton.enable()
}

const createListEditorContents = (list: List): Elm[] => {
	return [
		new Elm(
			{
				type: 'div',
				attrs: { 'class': 'grid grid-row-gap-0p3 editor-form m-t-1' }
			},
			[
				new Elm(
					{
						type: 'label',
						attrs: {
							'for': 'list-id',
							'class': 'm-r-1 m-t-auto m-b-auto inline-block'
						},
					},
					[
						'List Id ',
						new Elm(
							{ type: 'small' },
							[
								'Used as a tag to identify relevant emails and autoresponder '
								+ 'steps. Only accepts the characters: ',
								new Elm('code', 'a-z'), ', ',
								new Elm('code', 'A-Z'), ', ',
								new Elm('code', '_'), ', and ',
								new Elm('code', '-'), '. Maximum of 64 characters.',
							]
						)
					]
				),
				new Elm({
					type: 'input',
					attrs: {
						'name': 'list-id',
						'class': 'input m-b-1p5',
						'readonly': '',
						'placeholder': 'List Id',
						'title': 'The list id for existing lists is read-only.',
						'data-linked-button-selector':
							`.list-editor-${list.id} .button.main`,
					},
					value: list.id,
					events: {
						'change': function () { validateListId(<HTMLInputElement>this) },
						'keyup': function () { validateListId(<HTMLInputElement>this) },
					}
				}),
				new Elm(
					{
						type: 'label',
						attrs: {
							'for': 'list-name',
							'class': 'm-r-1 m-t-auto m-b-auto inline-block',
						},
					},
					[
						'List Name ',
						new Elm('small', 'How you would like to refer to the list in Grow '
						+ 'Your List admin.')
					]
				),
				new Elm({
					type: 'input',
					attrs: {
						'name': 'list-name',
						'class': 'input m-b-1p5',
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
						new Elm('small', [
							'Emails for this mailing list will your account-level default '
							+ 'source email address if one is not set here. ',
							new Elm('strong', [
								'This email must be ',
								new Elm({
									type: 'a',
									attrs: {
										'href': 'https://docs.aws.amazon.com/ses/latest/'
										+ 'DeveloperGuide/verify-email-addresses.html',
										'rel': 'noreferrer noopener',
									},
									text: 'validated in AWS',
								}),
							]),
							'. You can use emojis in your email address as ',
							new Elm({
								type: 'a',
								attrs: {
									'href': 'https://forums.aws.amazon.com/message.jspa?'
									+ 'messageID=925374#925374',
									'rel': 'noreferrer noopener',
								},
								text: 'described in the AWS forums'
							}),
							'; test thorougly!'
						])
					]
				),
				new Elm({
					type: 'input',
					attrs: {
						'name': 'list-source-email',
						'class': 'input m-b-1p5',
						'type': 'text',
						'placeholder': 'e.g. \'test@example.com\' or '
							+ '\'Name <name@example.com>\'',
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

const generateListItem = (list: List) => {
	return new Elm(
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
								listItem.classes.remove('edit-mode', 'expanded')
								editButton.text = '🔧 Edit'
								return
							}

							// Turn the list item into edit mode
							listItem.classes.add('edit-mode', 'expanded')
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
	)
}

const refreshListsList = async () => {
	const container = firstBySelector('.lists-container')
	container.text = 'Loading...'
	const lists: List[] = await fetchListsList()
	container.clear()
	container.append(
		new Elm(
			{
				type: 'ul',
				id: 'lists-list',
				class: 'menu list no-style vertical bordered font-size-1p25 expandable-items'
			},
			lists.map(list => generateListItem(list))
		)
	)
}

const validateNewId = async (id: string) => {
	if (!id) {
		throw new Error('No list id provided');
	}
	if (typeof id !== 'string') {
		throw new Error('Invalid list id: not a string');
	}
	if (!/^[a-zA-Z0-9_-]*$/.test(id)) {
		throw new Error('Invalid list id: contains invalid characters');
	}
	if (id.length > 64) {
		throw new Error('Invalid list id: over 64 characters');
	}
	if (byId(id)) {
		throw new Error('A list with this id already exists');
	}
};

const validateNewName = async (name: string) => {
	if (!name) {
		throw new Error('No name provided');
	}
	if (typeof name !== 'string') {
		throw new Error('Invalid list name: not a string');
	}
	if (name.length > 64) {
		throw new Error('Invalid list name: over 64 characters');
	}
};

const validateNewSourceEmail = async (email: string) => {
	if (email === null) {
		return; // null is a valid value
	}
	if (typeof email !== 'string') {
		throw new Error('Invalid source email: not a string');
	}
	const emailPatternWithLabel = /^.*<[^\s@]+@[^\s@]+\.[^\s@]+>$/;
	const matchesLabelPattern = emailPatternWithLabel.test(email);
	if (matchesLabelPattern) {
		if (email.length > 256) {
			throw new Error('Invalid source email: labelled email too long');
		}

		// Email with label and valid length, can return at this point
		return;
	}
	const emailPatternBasic = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const matchesBasicPattern = emailPatternBasic.test(email);
	if (matchesBasicPattern) {
		if (email.length > 254) {
			throw new Error('Invalid source email: email address too long');
		}
	} else {
		throw new Error('Invalid source email: does not appear to be email');
	}
};


/** When the dom is ready, fetch and display the lists. */
onDOMReady(async () => {
	refreshListsList()
	const newListButton = byId('new-list-button')
	const refreshListsButton = firstBySelector('.refresh-lists-button')
	const newListContainer = byId('new-list-container');
	const createListButton = byId('create-list');
	newListButton.on('click', () => {
		newListContainer.show();
		newListButton.hide();
	})

	createListButton.on('click', async () => {
		const createOutputElm = byId('create-list-output');
		try {
			createOutputElm.clear()
			const list: List = {
				id: byId('new-list-id').value,
				name: byId('new-list-name').value,
				sourceEmail: byId('new-list-source-email').value || null,
			}
			await validateNewId(list.id)
			await validateNewName(list.name)
			await validateNewSourceEmail(list.sourceEmail)
			createOutputElm.append(new Elm({
				type: 'div',
				class: 'status m-b-1',
				text: 'Loading...'
			}));
			await apiRequest('/list', {
				method: 'POST',
				body: JSON.stringify(list)
			})
			createOutputElm.clear()
			const listsElm = byId('lists-list')
			listsElm.append(generateListItem(list))
			newListContainer.hide()
			newListButton.show()
		}
		catch (err) {
			createOutputElm.clear()
			console.error(err);
			createOutputElm.append(new Elm({
				type: 'div',
				class: 'status error m-b-1',
				text: `Error creating list: ${err.message}`
			}))
		}
	})

	refreshListsButton.on('click', () => refreshListsList())
})
