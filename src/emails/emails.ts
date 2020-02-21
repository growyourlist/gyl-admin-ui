import 'quill/dist/quill.core.css';
import 'quill/dist/quill.snow.css';

import Quill from 'quill/core';
import Toolbar from 'quill/modules/toolbar';
import Snow from 'quill/themes/snow';
import Bold from 'quill/formats/bold';
import Underline from 'quill/formats/underline';
import Italic from 'quill/formats/italic';
import Header from 'quill/formats/header';
import CodeBlock from 'quill/formats/code';

const ace = require('ace-builds');
// console.log(ace)
// ace.config.set('basePath', '../');
require('ace-builds/webpack-resolver');

Quill.register({
	'modules/toolbar': Toolbar,
	'themes/snow': Snow,
	'formats/bold': Bold,
	'formats/underline': Underline,
	'formats/italic': Italic,
	'formats/header': Header,
	'formats/code-block': CodeBlock,
});

import { onDOMReady, byId, Elm, HSHElement } from '../common/hsh/hsh';
import { apiRequest } from '../common/apiRequest';
import { confirmDelete } from '../common/confirmDelete';

const newLinePattern = /(<\/div>|<\/p>|<br ?\/?>)(?!\n)/g;

const deleteTemplate = async (templateName: string) => {
	await apiRequest('/template', {
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
	await apiRequest('/template', {
		method: 'POST',
		body: JSON.stringify({ templateData }),
	});
};

const getTemplateList = async (nextToken?: string) => {
	const response = await apiRequest(
		`/templates${nextToken ? `?nextToken=${nextToken}` : ''}`
	);
	return await response.json();
};

/** When the dom is ready... */
onDOMReady(async () => {
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

	const templateNameElm = byId('template-name');
	const templateSubjectElm = byId('template-subject');
	const templateTextElm = byId('template-text');
	templateNameElm.value = '';
	templateSubjectElm.value = '';
	templateTextElm.value = '';

	const loadTemplateIntoEditor = async (templateName: string) => {
		const templateResponse = await apiRequest(
			`/template?templateName=${encodeURIComponent(templateName)}`
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
	const loadTemplateList = async () => {
		try {
			let nextToken: string = null;
			do {
				const templateListResponse = await getTemplateList(nextToken);
				emailList.append(
					templateListResponse.templates.map(
						(t: { Name: string; CreatedTimestamp: string }) =>
							new Elm({ type: 'li', attrs: { 'class': 'm-b-0p3' } }, [
								new Elm('span', t.Name),
								' ',
								new Elm({
									type: 'span',
									attrs: { style: 'color:grey' },
									text: new Date(t.CreatedTimestamp).toLocaleString(),
								}),
								' ',
								new Elm({
									type: 'button',
									attrs: { 'class': 'button minor inline' },
									text: 'Delete',
									events: {
										click: async event => {
											const name = t.Name;
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
											const name = t.Name;
											const buttonElm = new HSHElement(event.target);
											const liElm = buttonElm.parentUntil(elm => elm.isTag('li'));
											try {
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
											}
										},
									},
								}),
							])
					)
				);
				nextToken = templateListResponse.nextToken;
				if (nextToken) {
					// Getting templates is limited to 1 request per second (by AWS)
					await new Promise(resolve => setTimeout(resolve, 1000));
				}
			} while (nextToken);
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
			createUpdateStatus.append(new Elm({
				type: 'p',
				attrs: { 'class': 'status success' },
				text: 'Template updated or created',
			}))
		}
		catch (err) {
			console.error(err)
			createUpdateStatus.append(new Elm({
				type: 'p',
				attrs: { 'class': 'status error' },
				text: `Error creating or updating template: ${err.message}`,
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
