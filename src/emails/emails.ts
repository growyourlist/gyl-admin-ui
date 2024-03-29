import 'quill/dist/quill.core.css';
import 'quill/dist/quill.snow.css';

import Quill from 'quill';

import * as ace from 'ace-builds';

require('ace-builds/webpack-resolver');


import { onDOMReady, byId, Elm, HSHElement } from '../common/hsh/hsh';
import { apiRequest } from '../common/apiRequest';
import { confirmDelete } from '../common/confirmDelete';
import './email.scss';

const newLinePattern = /(<\/div>|<\/p>|<\/h[1-6]>|<\/[ou]l>|<[ou]l>|<\/li>|<br ?\/?>)(?!\n)/g;

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
		`/admin/templates${
			nextToken ? `?nextToken=${encodeURIComponent(nextToken)}` : ''
		}`
	);
	return await response.json();
};

const getPostalAddress = async () => {
	const response = await apiRequest('/admin/postal-address');
	return await response.json();
};

const getUnsubscribeLink = async () => {
	const response = await apiRequest('/admin/unsubscribe-link');
	return await response.json();
};

/** When the dom is ready... */
onDOMReady(async () => {
	let postalAddress = '';
	getPostalAddress()
		.then((address) => (postalAddress = address || ''))
		.catch((err) => console.error(err));

	let unsubscribeLink = '';
	getUnsubscribeLink()
		.then((link) => (unsubscribeLink = link || ''))
		.catch((err) => console.error(err));

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
				.filter((part) => !!part.trim());
			if (!addressParts.length) {
				return;
			}
			let hasAddress = false;
			if (addressParts.length === 1) {
				hasAddress = text.indexOf(addressParts[0]) >= 0;
			} else {
				hasAddress =
					text.indexOf(addressParts[0]) >= 0 &&
					text.indexOf(addressParts[1]) >= 0;
			}
			if (!hasAddress) {
				contentAlertElm.clear();
				contentAlertElm.classes.add('m-t-1');
				contentAlertElm.append(
					new Elm(
						{
							type: 'div',
							class: 'status warning',
						},
						[
							'Warning: postal address was not detected. Please ensure you ' +
								'complying with regulations which may require a postal address.',
						]
					)
				);
			}
		}
	};

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
		let text = '';
		const contentsDelta = (quillEditor.getContents() || { ops: [] }) as {
			ops: any[];
		};
		const contents = contentsDelta.ops;
		for (let i = 0; i < contents.length; i++) {
			const item = contents[i];
			if (typeof item === 'object') {
				if (typeof item.insert === 'string') {
					text += item.insert;
				}
				if (typeof item.attributes === 'object') {
					if (
						typeof item.attributes.link === 'string' &&
						item.attributes.link
					) {
						text += ` ${item.attributes.link}`;
					}
					if (item.attributes.list) {
						const lastNewLineIndex =
							text.lastIndexOf('\n', text.lastIndexOf('\n') - 1) + 1;
						text =
							text.slice(0, lastNewLineIndex) +
							'- ' +
							text.slice(lastNewLineIndex);
					}
				}
			}
		}
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

	const insertUnsubscribeLinkButton = byId('insert-unsubscribe-link');
	insertUnsubscribeLinkButton.on('click', () => {
		contentAlertElm.clear();
		contentAlertElm.classes.remove('m-t-1');
		const range = quillEditor.getSelection() as any;
		if (range) {
			quillEditor.insertText(range.index + range.length, 'Unsubscribe', {
				link: unsubscribeLink,
			});
		} else {
			quillEditor.insertText(quillEditor.getLength() - 1, 'Unsubscribe', {
				link: unsubscribeLink,
			});
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

	const generateTemplateListItem = (templateData: {
		Name: string;
		CreatedTimestamp: string;
	}) => {
		return new Elm({ type: 'li', attrs: { class: 'm-b-0p3' } }, [
			new Elm({type: 'span', attrs: { class: 'template-name' }}, templateData.Name),
			' ',
			new Elm({
				type: 'span',
				attrs: { style: 'color:grey' },
				text: new Date(templateData.CreatedTimestamp).toLocaleString(),
			}),
			' ',
			new Elm({
				type: 'button',
				attrs: { class: 'button minor inline' },
				text: 'Delete',
				events: {
					click: async (event) => {
						const name = templateData.Name;
						const buttonElm = new HSHElement(event.target);
						const liElm = buttonElm.parentUntil((elm) => elm.isTag('li'));
						try {
							if (
								await confirmDelete(`Are you sure you want to delete ${name}?`)
							) {
								if (!liElm) {
									throw new Error('Parent list item not found');
								}
								liElm.queryAll('button').forEach((btn) => btn.disable());
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
				attrs: { class: 'button minor inline' },
				text: 'Edit',
				events: {
					click: async (event) => {
						contentAlertElm.classes.remove('m-t-1');
						contentAlertElm.clear();
						const name = templateData.Name;
						const buttonElm = new HSHElement(event.target);
						const liElm = buttonElm.parentUntil((elm) => elm.isTag('li'));
						try {
							liElm.queryAll('button').forEach((button) => {
								button.disable();
							});
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
							liElm.queryAll('button').forEach((button) => {
								button.enable();
							});
						}
					},
				},
			}),
		]);
	};

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
								return generateTemplateListItem(t);
							}
						)
					);
				}
				nextToken = templateListResponse.nextToken;
				if (nextToken) {
					// Getting templates is limited to 1 request per second (by AWS)
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			} while (nextToken);
			if (!templateCount) {
				emailList.append(new Elm('li', new Elm('em', 'No emails found')));
			}
			byId('email-list-loading-status').clear();
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
	};
	loadTemplateList();

	const sendTestEmailButton = byId('send-test-email-button');
	const testEmailStatus = byId('test-email-status');
	sendTestEmailButton.on('click', async () => {
		try {
			testEmailStatus.clear();
			testEmailStatus.classes.add('m-t-1');
			testEmailStatus.append(
				new Elm({
					type: 'div',
					class: 'status info',
					text: 'Sending test email',
				})
			);
			sendTestEmailButton.disable();
			const postData: {
				toEmailAddress: string
				subject?: string
				body?: {
					text: string
					html: string
				}
				templateId?: string
			} = {
				toEmailAddress: byId('test-email-recipient').value,
			}
			if (byId('send-test-as-content').checked) {
				postData.subject = templateSubjectElm.value;
				postData.body = {
						text: templateTextElm.value,
						html: quillEditor.root.innerHTML,
				}
			} else {
				postData.templateId = templateNameElm.value
			}
			await apiRequest('/admin/single-email-send', {
				method: 'POST',
				body: JSON.stringify(postData),
			})
			testEmailStatus.clear();
			testEmailStatus.append(
				new Elm({
					type: 'div',
					class: 'status success',
					text: `Test email sent`,
				})
			);
		} catch (err) {
			testEmailStatus.clear();
			testEmailStatus.append(
				new Elm({
					type: 'div',
					class: 'status error',
					text: `Error sending test email: ${err.message}`,
				})
			);
		} finally {
			sendTestEmailButton.enable();
		}
	});

	// Add a listener to the create/update template button
	const createUpdateButton = byId('create-update-template-button');
	const createUpdateStatus = byId('create-template-output');
	createUpdateButton.on('click', async () => {
		createUpdateButton.disable();
		createUpdateStatus.clear();
		try {
			await createOrUpdateTemplate({
				TemplateName: templateNameElm.value,
				SubjectPart: templateSubjectElm.value,
				HtmlPart: quillEditor.root.innerHTML,
				TextPart: templateTextElm.value,
			});
			let existing: HSHElement | null = null;
			if (emailList.text.indexOf('No emails') >= 0) {
				emailList.clear();
			} else {
				existing = emailList.queryAll('.template-name').find(i => i.text === templateNameElm.value)
			}
			if (!existing) {
				emailList.append(
					generateTemplateListItem({
						CreatedTimestamp: new Date().toISOString(),
						Name: templateNameElm.value,
					})
				);
			}
			createUpdateStatus.append(
				new Elm({
					type: 'p',
					attrs: { class: 'status success' },
					text: 'Email updated or created',
				})
			);
		} catch (err) {
			console.error(err);
			createUpdateStatus.append(
				new Elm({
					type: 'p',
					attrs: { class: 'status error' },
					text: `Error creating or updating email: ${err.message}`,
				})
			);
		} finally {
			createUpdateButton.enable();
		}
	});

	const loadTemplateButton = byId('load-template-button');
	loadTemplateButton.on('click', async () => {
		const loadTemplateButtonContainer = byId('load-template-button-container');
		loadTemplateButtonContainer.clear();
		try {
			await loadTemplateIntoEditor(templateNameElm.value);
		} catch (err) {
			loadTemplateButtonContainer.append(
				new Elm({
					type: 'p',
					attrs: { class: 'status error' },
					text: `Error creating or updating email: ${err.message}`,
				})
			);
		}
	});

	const urlTemplatePattern = /[?&]template=([a-zA-Z0-9-]+)/;
	const templateNameMatch =
		window.location.search && window.location.search.match(urlTemplatePattern);
	if (templateNameMatch) {
		loadTemplateIntoEditor(templateNameMatch[1]);
	}
});
