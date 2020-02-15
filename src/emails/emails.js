//@ts-nocheck
((Quill, ace) => {
	const elm = id => document.getElementById(id);
	const listButton = elm('list-templates-button');
	const apiKeyInput = elm('api-token');
	const templateList = elm('template-list');
	const useHtmlEditorCheckbox = elm('use-html-editor');
	const newLinePattern = /(<\/div>|<\/p>|<br ?\/?>)(?!\n)/g;
	const templateEditorWrapper = elm('template-editor-wrapper');
	let editor = elm('template-editor');
	let aceEditor = null;
	let quill = null;
	const clearElm = elm => {
		while (elm.lastChild) {
			elm.removeChild(elm.lastChild);
		}
	};
	const confirmDelete = templateName =>
		new Promise((resolve, reject) => {
			const bg = document.createElement('div');
			bg.setAttribute('class', 'overlay');
			const fg = document.createElement('div');
			fg.setAttribute('class', 'foreground');
			const container = document.createElement('div');
			const message = document.createElement('p');
			message.innerText = `Are you sure you want to delete ${templateName}
?`;
			const warning = document.createElement('p');
			warning.style.fontWeight = 'bold';
			warning.style.color = '#ea2707';
			warning.innerText =
				'This will mean that any emails using this template ' +
				'will fail to send!';
			const buttonSet = document.createElement('div');
			buttonSet.setAttribute('class', 'button-set');
			const buttonOk = document.createElement('button');
			buttonOk.innerText = 'Delete';
			const buttonCancel = document.createElement('button');
			buttonCancel.innerText = 'Cancel';
			buttonOk.addEventListener('click', () => {
				document.body.removeChild(bg);
				resolve(true);
			});
			buttonCancel.addEventListener('click', () => {
				document.body.removeChild(bg);
				resolve(false);
			});
			buttonSet.appendChild(buttonOk);
			buttonSet.appendChild(buttonCancel);
			container.appendChild(message);
			container.appendChild(warning);
			container.appendChild(buttonSet);
			fg.appendChild(container);
			bg.appendChild(fg);
			document.body.appendChild(bg);
		});
	const deleteTemplate = templateName =>
		fetch(
			`${api}
template`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': apiKeyInput.value,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					TemplateName: templateName,
				}),
			}
		);
	const createTemplate = () =>
		fetch(
			`${api}
template`,
			{
				method: 'POST',
				headers: {
					'x-api-key': apiKeyInput.value,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					TemplateName: elm('template-name').value,
					SubjectPart: elm('template-subject').value,
					HtmlPart: useHtmlEditorCheckbox.checked
						? aceEditor.session.getValue()
						: quill.root.innerHTML,
					TextPart: elm('template-text').value,
				}),
			}
		);
	const loadTemplate = templateName =>
		fetch(
			`${api}
template?template-name=${templateName}
`,
			{
				headers: {
					'x-api-key': apiKeyInput.value,
				},
				mode: 'cors',
			}
		)
			.then(response => {
				if (response.ok) {
					return response.json();
				} else {
					throw new Error(response.statusText);
				}
			})
			.then(template => {
				elm('template-name').value = template.TemplateName;
				elm('template-subject').value = template.SubjectPart;
				if (quill) {
					quill.root.innerHTML = template.HtmlPart.replace(/\n/g, '');
				} else {
					aceEditor.session.setValue(
						template.HtmlPart.replace(newLinePattern, '$1\n')
					);
				}
				elm('template-text').value = template.TextPart;
			});
	const renderTemplateList = templateData => {
		const list = templateData.templates;
		clearElm(templateList);
		if (!list.length || list.length < 1) {
			const emptyMessage = document.createElement('p');
			emptyMessage.innerText = 'No templates found.';
			templateList.appendChild(emptyMessage);
			return;
		}
		const ul = document.createElement('ul');
		const appendTemplateListItem = template => {
			const li = document.createElement('li');
			const span = document.createElement('span');
			const buttonDelete = document.createElement('button');
			const buttonEdit = document.createElement('button');
			const date = new Date(template.CreatedTimestamp);
			span.innerText = `${template.Name}
${date.toLocaleString()}
`;
			buttonDelete.innerText = 'Delete';
			buttonDelete.addEventListener('click', () =>
				confirmDelete(template.Name)
					.then(result => {
						if (result === true) {
							li.parentElement.removeChild(li);
							return deleteTemplate(template.Name);
						}
					})
					.catch(err =>
						console.log(`Error deleting template ${err.message}
`)
					)
			);
			buttonEdit.innerText = 'Edit';
			buttonEdit.addEventListener('click', () =>
				loadTemplate(template.Name).catch(err => console.error(err))
			);
			li.appendChild(span);
			li.appendChild(buttonDelete);
			li.appendChild(document.createTextNode(' '));
			li.appendChild(buttonEdit);
			ul.appendChild(li);
		};
		list.forEach(template => appendTemplateListItem(template));
		templateList.appendChild(ul);
		if (templateData.nextToken) {
			const loadMoreButton = document.createElement('button');
			loadMoreButton.innerText = 'Load more';
			loadMoreButton.setAttribute('data-next-token', templateData.nextToken);
			loadMoreButton.addEventListener('click', event => {
				const nextToken = event.target.getAttribute('data-next-token');
				fetch(
					`${api}
templates?nextToken=${encodeURIComponent(nextToken)}
`,
					{
						headers: {
							'x-api-key': apiKeyInput.value,
						},
						mode: 'cors',
					}
				)
					.then(res => res.json())
					.then(renewedTemplateData => {
						renewedTemplateData.templates.forEach(template =>
							appendTemplateListItem(template)
						);
						if (renewedTemplateData.nextToken) {
							loadMoreButton.setAttribute(
								'data-next-token',
								renewedTemplateData.nextToken
							);
						} else {
							templateList.removeChild(loadMoreButton);
						}
					})
					.catch(err =>
						console.log(`Error loading templates: ${err.message}
`)
					);
			});
			templateList.appendChild(loadMoreButton);
		}
	};
	const fetchTemplates = () => {
		clearElm(templateList);
		const p = document.createElement('p');
		p.innerText = 'Loading';
		templateList.appendChild(p);
		fetch(
			`${api}
templates`,
			{
				headers: {
					'x-api-key': apiKeyInput.value,
				},
				mode: 'cors',
			}
		)
			.then(res => res.json())
			.then(templateData => renderTemplateList(templateData))
			.catch(err => console.log(err));
	};
	listButton.addEventListener('click', fetchTemplates);
	const templateParamMatch = window.location.search.match(/template=(.+)&?/);
	if (templateParamMatch && templateParamMatch[1] && apiKeyInput.value) {
		const templateParam = templateParamMatch[1];
		const getGivenTemplateButton = document.createElement('button');
		getGivenTemplateButton.innerText = `Get template ${templateParam}
`;
		getGivenTemplateButton.addEventListener('click', () =>
			loadTemplate(templateParam).catch(err => console.error(err))
		);
		listButton.parentNode.appendChild(getGivenTemplateButton);
	}
	if (apiKeyInput.value.trim()) {
		fetchTemplates();
	}
	quill = new Quill(editor, {
		theme: 'snow',
		modules: {
			toolbar: [
				[
					{
						header: ['1', '2', '3', false],
					},
				],
				['bold', 'italic', 'underline', 'link'],
				[
					{
						list: 'ordered',
					},
					{
						list: 'bullet',
					},
				],
				['image', 'code-block'],
				['clean'],
			],
		},
	});
	const renewEditor = () => {
		clearElm(templateEditorWrapper);
		editor = document.createElement('div');
		editor.setAttribute('id', 'template-editor');
		templateEditorWrapper.appendChild(editor);
	};
	const clearTemplateEditor = () => {
		quill.root.innerHTML = '<p><br></p>';
		elm('template-name').value = '';
		elm('template-subject').value = '';
	};
	useHtmlEditorCheckbox.checked = false;
	useHtmlEditorCheckbox.addEventListener('click', event => {
		const useHtmlEditor = useHtmlEditorCheckbox.checked;
		if (useHtmlEditor) {
			const html = quill.root.innerHTML.replace(newLinePattern, '$1\n');
			quill = null;
			renewEditor();
			aceEditor = ace.edit(editor);
			aceEditor.setTheme('ace/theme/monokai');
			aceEditor.session.setMode('ace/mode/html');
			aceEditor.session.setValue(html);
		} else {
			const html = aceEditor.session.getValue().replace(/\n/g, '');
			renewEditor();
			quill = new Quill(editor, {
				theme: 'snow',
				modules: {
					toolbar: [
						[
							{
								header: ['1', '2', '3', false],
							},
						],
						['bold', 'italic', 'underline', 'link'],
						[
							{
								list: 'ordered',
							},
							{
								list: 'bullet',
							},
						],
						['image', 'code-block'],
						['clean'],
					],
				},
			});
			quill.root.innerHTML = html;
		}
	});
	elm('template-text').value = quill.getText();
	elm('generate-text-button').addEventListener('click', () => {
		if (quill) {
			elm('template-text').value = quill.getText();
		} else {
			const infoSpan = document.createElement('span');
			infoSpan.innerText = ' Only works for the formatted editor';
			elm('generate-text-button').insertAdjacentElement('afterend', infoSpan);
		}
	});
	elm('create-template-button').addEventListener('click', () => {
		elm('create-template-output').innerText = 'Loading';
		createTemplate()
			.then(res => {
				if (res.ok !== true) {
					elm('create-template-output').innerText = `Error: ${res.statusText}
`;
				} else {
					elm('create-template-output').innerText =
						'Template created/updated.';
				}
			})
			.catch(err =>
				console.log(`Error creating template: ${err.message}
`)
			);
	});
	clearTemplateEditor();
	elm('clear-template-editor-button').addEventListener(
		'click',
		clearTemplateEditor
	);
	const enableButtons = enable => {
		const buttons = document.querySelectorAll('button');
		buttons.forEach(button => {
			if (enable) {
				button.removeAttribute('disabled');
			} else {
				button.setAttribute('disabled', true);
			}
		});
	};
	apiKeyInput.addEventListener('keyup', () => {
		enableButtons(apiKeyInput.value.trim());
	});
	elm('load-existing-template-button').addEventListener('click', () => {
		elm('load-existing-template-status').textContent = '';
		const templateName = elm('template-name').value.trim();
		if (!templateName) {
			return;
		}
		elm('load-existing-template-button').setAttribute('disabled', 'true');
		loadTemplate(templateName)
			.then(() =>
				elm('load-existing-template-button').removeAttribute('disabled')
			)
			.catch(err => {
				elm('load-existing-template-status').textContent = err.message;
				elm('load-existing-template-button').removeAttribute('disabled');
			});
	});
	enableButtons(apiKeyInput.value.trim());
});