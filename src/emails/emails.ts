import 'quill/dist/quill.core.css';
import 'quill/dist/quill.snow.css';

import Quill from 'quill/core';
import Toolbar from 'quill/modules/toolbar';
import Snow from 'quill/themes/snow';
import Bold from 'quill/formats/bold';
import Underline from 'quill/formats/underline';
import Italic from 'quill/formats/italic';
import List, {ListItem} from 'quill/formats/list';
import Link from 'quill/formats/link';
import Header from 'quill/formats/header';
import CodeBlock from 'quill/formats/code';
import Image from 'quill/formats/image';

const ace = require('ace-builds');
require('ace-builds/webpack-resolver');

Quill.register({
	'modules/toolbar': Toolbar,
	'themes/snow': Snow,
	'formats/bold': Bold,
	'formats/underline': Underline,
	'formats/italic': Italic,
	'formats/header': Header,
	'formats/list': List,
	'formats/list-item': ListItem,
	'formats/code-block': CodeBlock,
	'formats/link': Link,
	'formats/image': Image,
});

import { onDOMReady, byId, Elm, HSHElement } from '../common/hsh/hsh';
import { apiRequest } from '../common/apiRequest';
import { confirmDelete } from '../common/confirmDelete';

const newLinePattern = /(<\/div>|<\/p>|<br ?\/?>)(?!\n)/g;

const deleteTemplate = async (templateName: string) => {
	await apiRequest('/admin/template', {
		method: 'DELETE',
		body: JSON.stringify({ TemplateName: templateName }),
	});
};

const createOrUpdateTemplate = async (templateData: {
	TemplateName: string;
	SubjectPart: string;
	HtmlPart: string;
	TextPart: string;
}) => {
	await apiRequest('/admin/template', {
		method: 'POST',
		body: JSON.stringify(templateData),
	});
};

const getTemplateList = async (nextToken?: string) => {
	const response = await apiRequest(
		`/admin/templates${nextToken ? `?nextToken=${nextToken}` : ''}`
	);
	return await response.json();
};

const getPostalAddress = async () => {
	const response = await apiRequest('/admin/postal-address');
	return await response.json();
}

/** When the dom is ready... */
onDOMReady(async () => {

	let postalAddress = '';
	getPostalAddress()
		.then(address => postalAddress = address || '')
		.catch(err => console.error(err));

	// Set up editors
	const quillEditor = new Quill('#template-editor', {
		theme: 'snow',
		modules: {
			toolbar: [
				[{ header: ['1', '2', '3', false] }],
				['bold', 'italic', 'underline', 'link'],
				[{ list: 'ordered' }, { list: 'bullet' }],
				['image', 'code-block'],
				['clean'],
			],
		},
	});
	const aceEditor = ace.edit('template-editor-html');
	aceEditor.setTheme('ace/theme/monokai');
	aceEditor.session.setMode('ace/mode/html');

	const contentAlertElm = byId('content-alert');
	const checkForPostalAddress = (range: any) => {
		// This is the way to check for blur in quilljs
		// https://quilljs.com/docs/api/#selection-change
		if (!range) {
			const text = quillEditor.getText();
			const addressParts = postalAddress
				.split(/[\n,]/)
				.filter(part => !!part.trim());
			if (!addressParts.length) {
				return
			}
			let hasAddress = false;
			if (addressParts.length === 1) {
				hasAddress = text.indexOf(addressParts[0]) >= 0;
			}
			else {
				hasAddress = (text.indexOf(addressParts[0]) >= 0) && (text.indexOf(addressParts[1]) >= 0);
			}
			if (!hasAddress) {
				contentAlertElm.clear();
				contentAlertElm.classes.add('m-t-1');
				contentAlertElm.append(new Elm(
					{
						type: 'div',
						class: 'status warning',
					},
					[
						'Warning: postal address was not detected. Please ensure you ' +
							'complying with regulations which may require a postal address.'
					]
				))
			}
		}
	}

	// Sync rendered email and HTML
	let changeIsFromAce = false;
	let changeIsFromQuill = false;
	quillEditor.on('text-change', () => {
		if (changeIsFromAce) {
			return;
		}
		changeIsFromQuill = true;
		const html = quillEditor.root.innerHTML.replace(newLinePattern, '$1\n');
		aceEditor.session.setValue(html);
		setTimeout(() => (changeIsFromQuill = false), 100);
	});
	quillEditor.on('selection-change', checkForPostalAddress);
	aceEditor.on('change', () => {
		if (changeIsFromQuill) {
			return;
		}
		changeIsFromAce = true;
		const html = aceEditor.session.getValue().replace(/\n/g, '');
		quillEditor.root.innerHTML = html;
		setTimeout(() => (changeIsFromAce = false), 100);
	});

	// Toggle HTML editor
	const showHtmlEditorCheckbox = byId('show-html-editor');
	showHtmlEditorCheckbox.checked = true;
	const editorWrapper = byId('template-editor-wrapper');
	showHtmlEditorCheckbox.on('click', () => {
		if (showHtmlEditorCheckbox.checked) {
			byId('template-editor-html').show();
			editorWrapper.classes.add('grid');
			editorWrapper.classes.add('left-1fr-right-1fr-m900');
		} else {
			byId('template-editor-html').hide();
			editorWrapper.classes.remove('grid');
			editorWrapper.classes.remove('left-1fr-right-1fr-m900');
		}
	});

	// Handle generate text button click
	const generateTextButton = byId('generate-text-email-button');
	generateTextButton.on('click', () => {
		const text = quillEditor.getText();
		byId('template-text').value = text;
	});

	// Handle insert postal address button click
	const insertPostalAddressButton = byId('insert-postal-address');
	insertPostalAddressButton.on('click', () => {
		contentAlertElm.clear();
		contentAlertElm.classes.remove('m-t-1');
		const range = quillEditor.getSelection() as any;
		if (range) {
			quillEditor.insertText(range.index + range.length, postalAddress);
		} else {
			quillEditor.insertText(quillEditor.getLength() - 1, postalAddress);
		}
	});

	const templateNameElm = byId('template-name');
	const templateSubjectElm = byId('template-subject');
	const templateTextElm = byId('template-text');
	templateNameElm.value = '';
	templateSubjectElm.value = '';
	templateTextElm.value = '';

	const loadTemplateIntoEditor = async (templateName: string) => {
		const templateResponse = await apiRequest(
			`/admin/template?templateName=${encodeURIComponent(templateName)}`
		);
		const templateData = await templateResponse.json();
		templateNameElm.value = templateData.TemplateName;
		templateSubjectElm.value = templateData.SubjectPart;
		quillEditor.root.innerHTML = templateData.HtmlPart.replace(
			/>\n</g,
			''
		).replace(/\n/, ' ');
		templateTextElm.value = templateData.TextPart;
	};

	// Load the email list on a separate thread
	const emailList = byId('email-list');

	const generateTemplateListItem = (templateData: { Name: string; CreatedTimestamp: string }) => {
		return new Elm({ type: 'li', attrs: { 'class': 'm-b-0p3' } }, [
			new Elm('span', templateData.Name),
			' ',
			new Elm({
				type: 'span',
				attrs: { style: 'color:grey' },
				text: new Date(templateData.CreatedTimestamp).toLocaleString(),
			}),
			' ',
			new Elm({
				type: 'button',
				attrs: { 'class': 'button minor inline' },
				text: 'Delete',
				events: {
					click: async event => {
						const name = templateData.Name;
						const buttonElm = new HSHElement(event.target);
						const liElm = buttonElm.parentUntil(elm => elm.isTag('li'));
						try {
							if (
								await confirmDelete(
									`Are you sure you want to delete ${name}?`
								)
							) {
								if (!liElm) {
									throw new Error('Parent list item not found');
								}
								liElm.queryAll('button').forEach(btn => btn.disable());
								liElm.setAttribute('style', 'color:grey');
								await deleteTemplate(name);
								liElm.removeSelf();
							}
						} catch (err) {
							console.error(err);
							liElm.append([
								new Elm('span', ' '),
								new Elm({
									type: 'span',
									attrs: { class: 'status error' },
									text: err.message,
								}),
							]);
						}
					},
				},
			}),
			' ',
			new Elm({
				type: 'button',
				attrs: { 'class': 'button minor inline' },
				text: 'Edit',
				events: {
					click: async event => {
						contentAlertElm.classes.remove('m-t-1')
						contentAlertElm.clear()
						const name = templateData.Name;
						const buttonElm = new HSHElement(event.target);
						const liElm = buttonElm.parentUntil(elm => elm.isTag('li'));
						try {
							liElm.queryAll('button').forEach(button => {
								button.disable()
							})
							await loadTemplateIntoEditor(name);
						} catch (err) {
							console.error(err);
							liElm.append([
								new Elm('span', ' '),
								new Elm({
									type: 'span',
									attrs: { class: 'status error' },
									text: err.message,
								}),
							]);
						} finally {
							liElm.queryAll('button').forEach(button => {
								button.enable()
							})
						}
					},
				},
			}),
		])
	}

	const loadTemplateList = async () => {
		try {
			let nextToken: string = null;
			let templateCount = 0;
			do {
				const templateListResponse = await getTemplateList(nextToken);
				templateCount += templateListResponse.templates.length;
				if (templateListResponse.templates.length) {
					emailList.append(
						templateListResponse.templates.map(
							(t: { Name: string; CreatedTimestamp: string }) => {
								return generateTemplateListItem(t)
							}
						)
					)
				}
				nextToken = templateListResponse.nextToken;
				if (nextToken) {
					// Getting templates is limited to 1 request per second (by AWS)
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} while (nextToken);
			if (!templateCount) {
				emailList.append(
					new Elm('li', new Elm('em', 'No emails found'))
				)
			}
			byId('email-list-loading-status').clear()
		} catch (err) {
			console.error(err);
			emailList.clear();
			emailList.append(
				new Elm({
					type: 'p',
					attrs: { class: 'status error' },
					text: `Error getting emails: ${err.message}`,
				})
			);
		}
	}
	loadTemplateList()

	const sendTestEmailButton = byId('send-test-email-button');
	const testEmailStatus = byId('test-email-status');
	sendTestEmailButton.on('click', async () => {
		try {
			testEmailStatus.clear()
			testEmailStatus.classes.add('m-t-1')
			testEmailStatus.append(new Elm(
				{
					type: 'div',
					class: 'status info',
					text: 'Sending test email'
				}
			))
			sendTestEmailButton.disable()
			await apiRequest('/admin/single-email-send', {
				method: 'POST',
				body: JSON.stringify({
					toEmailAddress: byId('test-email-recipient').value,
					subject: templateSubjectElm.value,
					body: {
						text: templateTextElm.value,
						html: quillEditor.root.innerHTML,
					}
				})
			})
			testEmailStatus.clear()
			testEmailStatus.append(new Elm(
				{
					type: 'div',
					class: 'status success',
					text: `Test email sent`,
				}
			))
		} catch (err) {
			testEmailStatus.clear()
			testEmailStatus.append(new Elm(
				{
					type: 'div',
					class: 'status error',
					text: `Error sending test email: ${err.message}`,
				}
			))
		} finally {
			sendTestEmailButton.enable();
		}
	});

	// Add a listener to the create/update template button
	const createUpdateButton = byId('create-update-template-button')
	const createUpdateStatus = byId('create-template-output')
	createUpdateButton.on('click', async () => {
		createUpdateButton.disable()
		createUpdateStatus.clear()
		try {
			await createOrUpdateTemplate({
				TemplateName: templateNameElm.value,
				SubjectPart: templateSubjectElm.value,
				HtmlPart: quillEditor.root.innerHTML,
				TextPart: templateTextElm.value,
			})
			if (emailList.text.indexOf('No emails') >= 0) {
				emailList.clear();
			}
			emailList.append(generateTemplateListItem({
				CreatedTimestamp: new Date().toISOString(),
				Name: templateNameElm.value,
			}));
			createUpdateStatus.append(new Elm({
				type: 'p',
				attrs: { 'class': 'status success' },
				text: 'Email updated or created',
			}))
		}
		catch (err) {
			console.error(err)
			createUpdateStatus.append(new Elm({
				type: 'p',
				attrs: { 'class': 'status error' },
				text: `Error creating or updating email: ${err.message}`,
			}))
		}
		finally {
			createUpdateButton.enable()
		}
	})

	const urlTemplatePattern = /[?&]template=([a-zA-Z0-9-]+)/;
	const templateNameMatch = window.location.search && window.location.search.match(urlTemplatePattern);
	if (templateNameMatch) {
		loadTemplateIntoEditor(templateNameMatch[1])
	}
});
