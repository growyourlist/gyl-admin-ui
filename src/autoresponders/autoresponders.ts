import 'regenerator-runtime/runtime';

import { onDOMReady, byId, Elm, HSHElement } from '../common/hsh/hsh';
import * as mermaid from 'mermaid';
import { apiRequest } from '../common/apiRequest';
import { confirmDelete } from '../common/confirmDelete';
import { createTemplateListElm } from '../common/createTemplateListElm';
import { loadTemplates } from '../common/loadTemplates';
// eslint-disable-next-line no-unused-vars
import { Autoresponder } from './types/Autoresponder';

const pluralize = (value: number, unit: string): string => {
	if (Math.abs(value) === 1) {
		return unit.substring(0, unit.length - 1);
	}
	return unit;
};

const getHumanTimeParts = (
	milliseconds: number,
	pluralizeUnit: boolean = false
): { timeValue: string; timeUnit: string } => {
	const time = milliseconds;
	if (time % 86400000 === 0) {
		const value = time / 86400000;
		return {
			timeValue: value.toString(),
			timeUnit: pluralizeUnit ? pluralize(value, 'days') : 'days',
		};
	}
	if (time % 3600000 === 0) {
		const value = time / 3600000;
		return {
			timeValue: value.toString(),
			timeUnit: pluralizeUnit ? pluralize(value, 'hours') : 'hours',
		};
	}
	if (time % 60000 === 0) {
		const value = time / 60000;
		return {
			timeValue: value.toString(),
			timeUnit: pluralizeUnit ? pluralize(value, 'minutes') : 'minutes',
		};
	}
	const value = time / 1000;
	return {
		timeValue: Math.round(value).toString(),
		timeUnit: pluralizeUnit ? pluralize(value, 'seconds') : 'seconds',
	};
};

const getMillisecondsNew = (timeValue: string, timeUnit: string): number => {
	const time = parseInt(timeValue);
	if (isNaN(time)) {
		throw Error('Invalid time value');
	}
	switch (timeUnit) {
		case 'days':
			return time * 24 * 60 * 60 * 1000;
		case 'hours':
			return time * 60 * 60 * 1000;
		case 'minutes':
			return time * 60 * 1000;
		case 'seconds':
			return time * 1000;
		default:
			throw new Error('Invaid time unit');
	}
};

const isValidStepName = (stepName: string) => {
	if (!stepName) {
		return false;
	}
	return true;
};

const mermaidAPI = mermaid.default.mermaidAPI;

/** When the dom is ready... */
onDOMReady(async () => {
	let idToStepName: { [key: string]: string } = {};
	let stepNameToId: { [key: string]: string } = {};
	let cachedTemplateList: { Name: string }[] = [];

	const autoresponderContainer = byId('mermaid-container');
	const autoresponderIdElm = byId('autoresponder-id');
	const stepEditorElm = byId('step-editor');
	const autoresponderListElm = byId('autoresponder-list');
	const listStatusElm = byId('autoresponder-list-loading-status');
	const defaultTagReasonElm = byId('autoresponder-default-tag-reason');

	mermaidAPI.initialize({
		startOnLoad: false,
		theme: 'neutral',
		securityLevel: 'loose',
	});

	const definitionElm = byId('autoresponder-definition');
	const getDefinition = (): any => {
		return definitionElm.value && JSON.parse(definitionElm.value);
	};

	const handleTemplateNameClick = (
		templateName: string,
		inputElm: HSHElement,
		changeStepTemplateId: any
	): boolean => {
		inputElm.value = templateName;
		changeStepTemplateId();
		return false;
	};

	const getStep = (stepName: string) => {
		if (!stepName) {
			return undefined;
		}
		const def = getDefinition();
		return def.steps[stepName];
	};

	const showTemplates = (inputElm: HSHElement, changeStepTemplateId: any) => {
		if (inputElm.data['sentTemplateRequest']) {
			return;
		} else {
			inputElm.data['sentTemplateRequest'] = 'true';
		}
		inputElm.insertAfterThis(
			new Elm(
				{ type: 'div' },
				createTemplateListElm(cachedTemplateList, (templateName) =>
					handleTemplateNameClick(templateName, inputElm, changeStepTemplateId)
				)
			)
		);
	};

	const createSubsequentStepInput = (
		getCurrentStepName: () => string,
		prevStep: {
			type: string;
		}
	): Elm => {
		const stepEditorElm = byId('step-editor');
		return new Elm({
			type: 'button',
			class: 'button secondary',
			text: 'Add subsequent step',
			events: {
				click: (event) => {
					stepEditorElm.append([
						new Elm({ type: 'div', class: 'm-b-0p3' }, [
							new Elm({
								type: 'h4',
								class: 'm-b-0p3',
								text: 'Create subsequent step:',
							}),
							new Elm('div', new Elm('label', 'New or existing step name')),
							new Elm({
								type: 'input',
								class: 'input w-100',
								id: 'new-step-name',
								events: {
									change: (event) => {
										const existingStep = getStep(event.target.value);
										const newStepTypeElm = byId('new-step-type');
										if (existingStep) {
											newStepTypeElm.value = existingStep.type;
											newStepTypeElm.disable();
										} else if (newStepTypeElm.isDisabled()) {
											newStepTypeElm.enable();
										}
									},
								},
							}),
						]),
						new Elm({ type: 'div', class: 'm-b-0p3' }, [
							new Elm('div', new Elm('label', 'Step type')),
							new Elm({
								type: 'select',
								id: 'new-step-type',
								class: 'input w-100',
								options:
									prevStep.type === 'wait'
										? ['make choice based on tag']
										: [
												'send email',
												'make choice based on tag',
												'unsubscribe',
												'wait',
											],
							}),
						]),
						new Elm({ type: 'div', class: 'm-b-0p3' }, [
							new Elm('div', new Elm('label', 'Run new next step in')),
							new Elm(
								{
									type: 'div',
									class: 'flex',
								},
								[
									new Elm({
										type: 'input',
										attrs: {
											type: 'number',
										},
										class: 'input min-w-0',
										id: 'new-run-in-value',
										value: '1',
									}),
									new Elm({
										type: 'select',
										class: 'input min-w-0 w-66',
										id: 'new-run-in-unit',
										options: ['days', 'hours', 'minutes', 'seconds'],
									}),
								]
							),
						]),
						new Elm({ type: 'div', class: 'm-b-0p3' }, [
							new Elm('div', new Elm('label', 'Tag reason')),
							new Elm({
								type: 'input',
								class: 'input w-100',
								id: 'new-tag-reason',
								value: defaultTagReasonElm.value,
							}),
						]),
						new Elm({ type: 'div' }, [
							new Elm({
								type: 'button',
								id: 'create-step-button',
								class: 'button secondary',
								text: 'Create new step',
								events: {
									click: () => {
										const newStepError = byId('new-step-error');
										if (newStepError) {
											newStepError.removeSelf();
										}
										const def = getDefinition();
										const stepName = getCurrentStepName();
										const newStepNameElm = byId('new-step-name');
										const newStepName = newStepNameElm.value;
										const createStepButton = byId('create-step-button');
										if (!isValidStepName(newStepName)) {
											createStepButton.insertAfterThis(
												new Elm({
													type: 'div',
													class: 'status error',
													id: 'new-step-error',
													text: 'Invalid step name',
												})
											);
											return;
										}
										const updatePacket = {
											steps: Object.assign({}, def.steps, {
												[stepName]: Object.assign({}, def.steps[stepName], {
													nextAction: newStepName,
													runNextIn: getMillisecondsNew(
														byId('new-run-in-value').value,
														byId('new-run-in-unit').value
													),
												}),
											}),
										};
										if (!getStep(newStepName)) {
											Object.assign(updatePacket.steps, {
												[newStepName]: {
													type: byId('new-step-type').value,
													tagReason: byId('new-tag-reason').value,
												},
											});
										}
										updateDefinition(updatePacket);
										showStepEditor(byId('new-step-name').value);
									},
								},
							}),
						]),
					]);
					new HSHElement(event.target).removeSelf();
				},
			},
		});
	};

	const createNextStepControls = (getCurrentStepName: () => string): Elm[] => {
		const controls: Elm[] = [];
		const def = getDefinition();
		const stepDef = def.steps[getCurrentStepName()];
		if (stepDef.type === 'send email' || stepDef.type === 'wait') {
			return controls.concat([
				createSubsequentStepInput(getCurrentStepName, stepDef),
			]);
		} else if (stepDef.type === 'make choice based on tag') {
			const tagInputControls: Elm[] = [
				new Elm({ type: 'div', class: 'm-b-0p3' }, [
					new Elm('div', new Elm('label', 'Check if subscriber has tag')),
					new Elm({
						type: 'input',
						id: 'tag-to-check',
						class: 'input w-100',
						attrs: { placeholder: 'Name of tag to check' },
						value: stepDef.tagToCheck || '',
						events: {
							keyup: (event) => {
								const def = getDefinition();
								const stepName = getCurrentStepName();
								const steps = Object.assign({}, def.steps, {
									[getCurrentStepName()]: Object.assign(
										{},
										def.steps[stepName],
										{
											tagToCheck: event.target.value,
										}
									),
								});
								updateDefinition({
									steps: steps,
								});
							},
						},
					}),
				]),
			];
			if (stepDef.yesAction && stepDef.noAction) {
				return controls.concat(tagInputControls);
			}
			return controls.concat(tagInputControls, [
				new Elm({ type: 'div', class: 'm-b-0p3' }, [
					new Elm(
						'div',
						new Elm('label', 'If the result of the tag check is:')
					),
					new Elm(() => {
						const options = [];
						if (!stepDef.yesAction) {
							options.push('yes');
						}
						if (!stepDef.noAction) {
							options.push('no');
						}
						return {
							id: 'step-choice',
							type: 'select',
							class: 'input w-100',
							options,
						};
					}),
				]),
				new Elm({ type: 'div', class: 'm-b-0p3' }, [
					new Elm('div', new Elm('label', 'New or existing step name')),
					new Elm({
						type: 'input',
						class: 'input w-100',
						id: 'new-step-name',
						events: {
							change: (event) => {
								const existingStep = getStep(event.target.value);
								const newStepTypeElm = byId('new-step-type');
								if (existingStep) {
									newStepTypeElm.value = existingStep.type;
									newStepTypeElm.disable();
								} else if (newStepTypeElm.isDisabled()) {
									newStepTypeElm.enable();
								}
							},
						},
					}),
				]),
				new Elm({ type: 'div', class: 'm-b-0p3' }, [
					new Elm('div', new Elm('label', 'Step type')),
					new Elm({
						type: 'select',
						class: 'input w-100',
						id: 'new-step-type',
						options: ['send email', 'make choice based on tag', 'unsubscribe'],
					}),
				]),
				new Elm(
					{ type: 'div', class: 'm-b-0p3' },
					new Elm({
						type: 'button',
						id: 'create-step-button',
						class: 'button secondary',
						text: 'Create step',
						events: {
							click: () => {
								const newStepNameElm = byId('new-step-name');
								const newStepName = newStepNameElm.value;
								const newStepError = byId('new-step-error');
								if (newStepError) {
									newStepError.removeSelf();
								}
								if (!isValidStepName(newStepName)) {
									const createStepButton = byId('create-step-button');
									createStepButton.insertAfterThis(
										new Elm({
											type: 'div',
											class: 'status error',
											text: 'Invalid step name',
										})
									);
									return;
								}
								const def = getDefinition();
								const stepName = getCurrentStepName();
								const actionName = `${byId('step-choice').value}Action`;
								const updatePacket = {
									steps: Object.assign({}, def.steps, {
										[stepName]: Object.assign({}, def.steps[stepName], {
											[actionName]: newStepName,
											tagToCheck: byId('tag-to-check').value,
										}),
									}),
								};
								if (!getStep(newStepName)) {
									Object.assign(updatePacket.steps, {
										[newStepName]: {
											type: byId('new-step-type').value,
										},
									});
								}
								updateDefinition(updatePacket);
								showStepEditor(newStepName);
							},
						},
					})
				),
			]);
		}
		return [];
	};

	const drawAutoresponder = () => {
		const definition = getDefinition();
		const { steps } = definition;
		let graph: string = 'graph TD\n';
		graph += 'classDef label font-family:sans-serif,font-size:0.85em;\n';
		stepNameToId = {};
		idToStepName = {};
		const connections: {
			from: string;
			to: string;
			time?: number;
			choiceResult?: 'yes' | 'no';
		}[] = [];
		for (const step in steps) {
			const fromId = step.replace(/\s/g, '');
			stepNameToId[step] = fromId;
			idToStepName[fromId] = step;
			if (steps[step].nextAction) {
				const { nextAction } = steps[step];
				const toId = nextAction.replace(/\s/g, '');
				stepNameToId[nextAction] = toId;
				idToStepName[toId] = nextAction;
				connections.push({
					from: fromId,
					to: toId,
					time: steps[step].runNextIn,
				});
			}
			if (steps[step].yesAction) {
				const { yesAction } = steps[step];
				const toId = yesAction.replace(/\s/g, '');
				stepNameToId[yesAction] = toId;
				idToStepName[toId] = yesAction;
				connections.push({
					from: fromId,
					to: toId,
					choiceResult: 'yes',
				});
			}
			if (steps[step].noAction) {
				const { noAction } = steps[step];
				const toId = noAction.replace(/\s/g, '');
				stepNameToId[noAction] = toId;
				idToStepName[toId] = noAction;
				connections.push({
					from: fromId,
					to: toId,
					choiceResult: 'no',
				});
			}
		}
		for (const step in stepNameToId) {
			if (steps[step].type === 'send email') {
				graph += stepNameToId[step] + '["' + step + '"]\n';
			} else if (steps[step].type === 'make choice based on tag') {
				graph += stepNameToId[step] + '{"' + step + '"}\n';
			} else if (steps[step].type === 'unsubscribe') {
				graph += stepNameToId[step] + '["' + step + '"]\n';
			} else if (steps[step].type === 'wait') {
				graph += stepNameToId[step] + '>"' + step + '"]\n';
			} else {
				throw new Error(`Unrecognised type ${steps[step].type}
      `);
			}
			graph += `click ${stepNameToId[step]} arStepClick\n`;
		}
		for (const connection of connections) {
			if (connection.time === 0 || connection.time) {
				const { timeUnit, timeValue } = getHumanTimeParts(
					connection.time,
					true
				);
				graph += `${connection.from}-->|Wait ${timeValue} ${timeUnit}|${connection.to}\n`;
			} else if (connection.choiceResult) {
				const result = connection.choiceResult;
				graph += `${connection.from}-->|${result}|${connection.to}\n`;
			}
		}
		const id = `mermaid-${Date.now()}`;
		mermaidAPI.render(id, graph, (svgCode, bindFunctions) => {
			autoresponderContainer.html = svgCode;
			bindFunctions(autoresponderContainer.element);
		});
	};

	const updateDefinition = (updatePacket: any, complete = false) => {
		if (complete) {
			definitionElm.value = JSON.stringify(updatePacket);
		} else {
			definitionElm.value = JSON.stringify(
				Object.assign({}, getDefinition(), updatePacket)
			);
		}
		drawAutoresponder();
	};

	const resetDefinition = () => {
		updateDefinition(
			{
				autoresponderId: '',
				defaultTagReason: 'list-default',
				steps: {
					Start: {
						type: 'send email',
						templateId: '',
					},
				},
			},
			true
		);
		autoresponderIdElm.value = '';
		defaultTagReasonElm.value = 'list-default';
	};
	resetDefinition();

	const updateStepName = (oldName: string, newName: string) => {
		const def = getDefinition();
		console.log(oldName);
		console.log(def.steps);
		const newSteps = JSON.parse(JSON.stringify(def.steps));
		console.log(Object.getOwnPropertyDescriptor(newSteps, oldName));
		Object.defineProperty(
			newSteps,
			newName,
			Object.getOwnPropertyDescriptor(newSteps, oldName)
		);
		for (const step in newSteps) {
			if (step !== newName && newSteps[step].nextAction === oldName) {
				newSteps[step].nextAction = newName;
			}
		}
		if (newName !== oldName) {
			delete newSteps[oldName];
		}
		updateDefinition({ steps: newSteps });
	};

	const deleteStep = (stepName: string) => {
		const def = getDefinition();
		const newSteps = JSON.parse(JSON.stringify(def.steps));
		delete newSteps[stepName];
		for (const step in newSteps) {
			if (newSteps[step].nextAction === stepName) {
				delete newSteps[step].nextAction;
				delete newSteps[step].runNextIn;
			}
			if (newSteps[step].yesAction === stepName) {
				delete newSteps[step].yesAction;
			}
			if (newSteps[step].noAction === stepName) {
				delete newSteps[step].noAction;
			}
		}
		updateDefinition({ steps: newSteps });
	};

	const closeStepEditor = () => {
		stepEditorElm.clear();
	};

	const showStepEditor = (stepName: string) => {
		let currentStepName: string = stepName;

		const updateStepDef = (elmId: string, prop: string) => {
			const srcElm = byId(elmId);
			srcElm.value = srcElm.value.replace(/[^a-zA-Z0-9\-_]/g, '');
			srcElm.value = srcElm.value.substring(0, 246);
			const newValue = srcElm.value.trim();
			const def = getDefinition();
			const steps = JSON.parse(JSON.stringify(def.steps));
			steps[currentStepName][prop] = newValue;
			updateDefinition({ steps });
		};

		const def = getDefinition();
		const { steps } = def;
		const stepDef = steps[stepName];
		stepEditorElm.clear();
		const newStepEditorContent = [
			new Elm('div', [
				new Elm(
					{ type: 'h4', attrs: { class: 'm-t-0 m-b-0p3' } },
					'Step Editor'
				),
				new Elm('div', new Elm('label', 'Step name')),
				new Elm(
					{
						type: 'div',
						attrs: { class: 'm-b-0p3' },
					},
					new Elm({
						type: 'input',
						value: stepName,
						attrs: {
							id: 'step-name',
							placeholder: 'e.g. Send follow up email',
							class: 'input w-100',
							readonly: stepName === 'Start',
							title:
								stepName === 'Start'
									? 'Name of Start step cannot be changed'
									: false,
						},
						events: {
							keyup: () => {
								const newName = byId('step-name').value.trim();
								if (!isValidStepName(newName)) {
									return;
								}
								updateStepName(currentStepName, newName);
								currentStepName = newName;
							},
						},
					})
				),
				new Elm('div', new Elm('label', 'Step type')),
				new Elm(
					{
						type: 'div',
						attrs: { class: 'm-b-0p3' },
					},
					new Elm(() => {
						const selectDef: any = {
							type: 'select',
							attrs: { id: 'step-type', class: 'input w-100' },
							options: [
								'send email',
								'make choice based on tag',
								'unsubscribe',
								'wait',
							],
							value: stepDef.type,
							events: {
								change: () => {
									const newType = byId('step-type').value;
									const def = getDefinition();
									const newSteps = JSON.parse(JSON.stringify(def.steps));
									newSteps[currentStepName].type = newType;
									if (
										newType === 'make choice based on tag' ||
										newType === 'wait'
									) {
										delete newSteps[currentStepName].templateId;
									}
									updateDefinition({ steps: newSteps });
									showStepEditor(currentStepName);
								},
							},
						};
						if (stepDef.nextAction || stepDef.yesAction || stepDef.noAction) {
							selectDef.attrs['disabled'] = true;
							selectDef.attrs['title'] =
								'Only able to change step type for last step';
						}
						return selectDef;
					})
				),
				new Elm('div', new Elm('label', 'Tag reason')),
				new Elm(
					{
						type: 'div',
						attrs: { class: 'm-b-0p3' },
					},
					new Elm({
						type: 'input',
						attrs: { id: 'tag-reason', class: 'input w-100' },
						value: stepDef.tagReason || defaultTagReasonElm.value || '',
						events: {
							onchange: () => updateStepDef('tag-reason', 'tagReason'),
							keyup: () => updateStepDef('tag-reason', 'tagReason'),
						},
					})
				),
			]),
		];
		if (stepDef.type === 'send email') {
			const changeStepTemplateId = () => {
				updateStepDef('template-id', 'templateId');
			};
			newStepEditorContent.push(new Elm('div', new Elm('label', 'Email Id')));
			newStepEditorContent.push(
				new Elm(
					{ type: 'div', attrs: { class: 'm-b-0p3' } },
					new Elm({
						type: 'input',
						value: stepDef.templateId || '',
						attrs: { id: 'template-id', class: 'input w-100' },
						events: {
							focus: (event) =>
								showTemplates(
									new HSHElement(event.target),
									changeStepTemplateId
								),
							keyup: () => updateStepDef('template-id', 'templateId'),
						},
					})
				)
			);
			if (stepDef.templateId) {
				newStepEditorContent.push(
					new Elm(
						{ type: 'div', attrs: { class: 'm-b-0p3' } },
						new Elm({
							type: 'a',
							attrs: {
								href: `/emails/index.html?template=${encodeURIComponent(
									stepDef.templateId
								)}`,
								target: '_blank',
							},
							text: 'Open email template (in new tab)',
						})
					)
				);
			}
			newStepEditorContent.push(
				new Elm('div', new Elm('label', 'Tag on open'))
			);
			newStepEditorContent.push(
				new Elm(
					{ type: 'div', attrs: { class: 'm-b-0p3' } },
					new Elm({
						type: 'input',
						value: stepDef.tagOnOpen || '',
						attrs: { id: 'tag-on-open', class: 'input w-100' },
						events: {
							keyup: () => updateStepDef('tag-on-open', 'tagOnOpen'),
						},
					})
				)
			);
			newStepEditorContent.push(
				new Elm('div', new Elm('label', 'Tag on click'))
			);
			newStepEditorContent.push(
				new Elm(
					{ type: 'div', attrs: { class: 'm-b-0p3' } },
					new Elm({
						type: 'input',
						value: stepDef.tagOnClick || '',
						attrs: { id: 'tag-on-click', class: 'input w-100' },
						events: {
							keyup: () => updateStepDef('tag-on-click', 'tagOnClick'),
						},
					})
				)
			);
		}
		if (
			stepName !== 'Start' &&
			!stepDef.nextAction &&
			!(stepDef.yesAction || stepDef.noAction)
		) {
			newStepEditorContent.push(
				new Elm(
					{ type: 'div', attrs: { class: 'm-b-0p3' } },
					new Elm({
						type: 'button',
						text: 'Delete step',
						class: 'button secondary',
						events: {
							click: () => {
								deleteStep(currentStepName);
								closeStepEditor();
							},
						},
					})
				)
			);
		}
		if (stepDef.runNextIn) {
			const { timeValue, timeUnit } = getHumanTimeParts(stepDef.runNextIn);

			const respondToDelayChange = () => {
				const runNextInValueElm = byId('run-next-in-value');
				try {
					runNextInValueElm.style.border = '';
					runNextInValueElm.style.padding = '';
					const runNextInValue = runNextInValueElm.value;
					const newStep = Object.assign({}, stepDef);
					newStep.runNextIn = getMillisecondsNew(
						runNextInValue,
						byId('run-next-in-unit').value
					);
					updateDefinition({
						steps: Object.assign({}, steps, {
							[currentStepName]: newStep,
						}),
					});
				} catch (err) {
					console.error(err);
					runNextInValueElm.style.border = '1px solid red';
					runNextInValueElm.style.padding = '2px';
				}
			};

			newStepEditorContent.push(
				new Elm({ type: 'div', attrs: { class: 'm-b-0p3' } }, [
					new Elm('div', new Elm('label', 'Run next step in')),
					new Elm(
						{
							type: 'div',
							class: 'flex',
						},
						[
							new Elm({
								type: 'input',
								value: timeValue,
								attrs: {
									id: 'run-next-in-value',
									class: 'input min-w-0',
									type: 'number',
								},
								events: {
									keyup: () => {
										respondToDelayChange();
									},
									change: () => {
										respondToDelayChange();
									},
								},
							}),
							new Elm({
								type: 'select',
								class: 'input min-w-0 w-66',
								id: 'run-next-in-unit',
								value: timeUnit,
								options: ['days', 'hours', 'minutes', 'seconds'],
								events: {
									change: () => {
										respondToDelayChange();
									},
								},
							}),
						]
					),
				])
			);
		} else {
			const nextStepControls: Elm[] = createNextStepControls(
				() => currentStepName
			);
			nextStepControls.forEach((control) => newStepEditorContent.push(control));
		}
		stepEditorElm.append(newStepEditorContent);
	};

	(<any>window).arStepClick = (stepId: string) => {
		showStepEditor(idToStepName[stepId]);
	};

	definitionElm.on('change', drawAutoresponder);

	const clearAutoresponderEditor = () => {
		updateDefinition(
			{
				autoresponderId: '',
				defaultTagReason: 'list-default',
				steps: {
					Start: {
						type: 'send email',
						templateId: '',
					},
				},
			},
			true
		);
	};

	clearAutoresponderEditor();

	autoresponderIdElm.on('keyup', (event) => {
		const autoresponderId = (event.target as HTMLInputElement).value.replace(
			/[^a-z0-9]/i,
			''
		);
		autoresponderIdElm.value = autoresponderId;
		updateDefinition({ autoresponderId });
	});

	defaultTagReasonElm.on('keyup', () => {
		const defaultTagReason = defaultTagReasonElm.value;
		const autoresponder = getDefinition();
		const isEmptyAutoresponder =
			Object.keys(autoresponder.steps).length === 1 &&
			autoresponder.steps.Start &&
			autoresponder.steps.Start.templateId === '';
		if (isEmptyAutoresponder) {
			autoresponder.steps.Start.tagReason = defaultTagReasonElm.value;
			autoresponder.defaultTagReason = defaultTagReasonElm.value;
			updateDefinition(autoresponder, true);
			const tagReasonElm = byId('tag-reason');
			if (tagReasonElm) {
				tagReasonElm.value = defaultTagReasonElm.value;
			}
		} else {
			updateDefinition({ defaultTagReason });
		}
		const openNewStepTagReason = byId('new-tag-reason');
		if (openNewStepTagReason) {
			openNewStepTagReason.value = defaultTagReasonElm.value;
		}
	});

	const setEmptyStrToNull = (obj: any) => {
		const keys = Object.keys(obj);
		for (const key of keys) {
			if (obj[key] === '') {
				obj[key] = null;
			} else if (obj[key] && typeof obj[key] === 'object') {
				setEmptyStrToNull(obj[key]);
			}
		}
		return obj;
	};

	const ensureDefaultTagReasonAppliedToEmptyTagReasons = () => {
		const autoresponderData = JSON.parse(definitionElm.value) as Autoresponder;
		const { defaultTagReason, steps } = autoresponderData;
		autoresponderIdElm.value = autoresponderData.autoresponderId;
		defaultTagReasonElm.value = defaultTagReason;
		if (defaultTagReason) {
			Object.keys(steps).forEach(stepName => {
				if (!autoresponderData.steps[stepName].tagReason?.trim()) {
					autoresponderData.steps[stepName].tagReason = defaultTagReason;
				}
			})
		}
		updateDefinition(autoresponderData, true);
	}

	const validateAutoresponder: () => boolean | string = () => {
		const autoresponderData = JSON.parse(definitionElm.value);
		if (!autoresponderData.autoresponderId) {
			return 'Please enter an Autoresponder id';
		}
		const { steps } = autoresponderData;
		const stepNames = Object.keys(steps);
		for (let i = 0; i < stepNames.length; i++) {
			const stepName = stepNames[i];
			if (
				steps[stepName].type === 'send email' &&
				!steps[stepName].templateId
			) {
				return "Please ensure all 'send email' steps have email ids";
			}
		}
		return true;
	};

	const postAutoresponderOutput = byId('post-autoresponder-output');
	const postAutoresponder = async () => {
		const autoresponderData = JSON.parse(definitionElm.value);
		const response = await apiRequest('/admin/autoresponder', {
			method: 'POST',
			body: JSON.stringify(setEmptyStrToNull(autoresponderData)),
		});
		return await response.json();
	};

	const postAutoresponderButton = byId('post-autoresponder-button');
	postAutoresponderButton.on('click', async () => {
		postAutoresponderOutput.clear();
		ensureDefaultTagReasonAppliedToEmptyTagReasons();
		const errorMessage = validateAutoresponder();
		if (typeof errorMessage === 'string') {
			postAutoresponderOutput.append(
				new Elm({
					type: 'div',
					class: 'status m-b-1 error',
					text: errorMessage,
				})
			);
			return;
		}
		postAutoresponderButton.disable();
		postAutoresponderOutput.append(
			new Elm({
				type: 'div',
				class: 'status m-b-1',
				text: 'Loading...',
			})
		);
		try {
			await postAutoresponder();
			postAutoresponderOutput.clear();
			postAutoresponderOutput.append(
				new Elm({
					type: 'div',
					class: 'status success m-b-1',
					text: 'Autoresponder created or updated',
				})
			);
			if (autoresponderListElm.text.indexOf('No autoresponders') >= 0) {
				autoresponderListElm.clear();
			}
			appendAutoresponderListItem({
				autoresponderId: autoresponderIdElm.value.trim(),
			});
		} catch (err) {
			console.error(err);
			postAutoresponderOutput.clear();
			postAutoresponderOutput.append(
				new Elm({
					type: 'div',
					class: 'status error m-b-1',
					text: `Error posting autoresponder: ${err.message}`,
				})
			);
		} finally {
			postAutoresponderButton.enable();
		}
	});

	byId('clear-autoresponder-editor-button').on('click', async () => {
		if (
			await confirmDelete(
				'Are you sure you want to clear the autoresponder editor? All ' +
					'unsaved changes will be lost.'
			)
		) {
			clearAutoresponderEditor();
		}
	});

	const autoConfirmTagsInput = byId('auto-confirm-tags-input');
	const autoConfirmTagsStatusContainer = byId(
		'auto-confirm-tags-status-container'
	);
	const autoConfirmTagsSaveButton = byId('auto-confirm-tags-save-button');
	const loadAutoConfirmTags = async () => {
		try {
			const res = await apiRequest('/admin/auto-confirm-tags');
			console.log(res);
			if (!res.ok) {
				throw new Error(`${res.status} ${res.statusText}`);
			}
			autoConfirmTagsInput.value = (await res.json()).autoConfirmTags || '';
			autoConfirmTagsStatusContainer.clear();
			autoConfirmTagsInput.enable();
		} catch (err) {
			autoConfirmTagsStatusContainer.clear();
			autoConfirmTagsStatusContainer.append(
				new Elm({
					type: 'div',
					class: 'status error',
					text: err.message,
				})
			);
		} finally {
			autoConfirmTagsSaveButton.enable();
		}
	};
	loadAutoConfirmTags();
	autoConfirmTagsSaveButton.on('click', async () => {
		try {
			autoConfirmTagsInput.disable();
			autoConfirmTagsSaveButton.disable();
			autoConfirmTagsStatusContainer.clear();
			autoConfirmTagsStatusContainer.append(
				new Elm({
					type: 'div',
					class: 'status info',
					text: 'Loading...',
				})
			);
			const response = await apiRequest('/admin/auto-confirm-tags', {
				method: 'POST',
				body: JSON.stringify({ autoConfirmTags: autoConfirmTagsInput.value }),
			});
			if (response.ok) {
				autoConfirmTagsStatusContainer.clear();
				autoConfirmTagsStatusContainer.append(
					new Elm({
						type: 'div',
						class: 'status success',
						text: 'Auto confirm tags updated',
					})
				);
			} else {
				throw new Error(`${response.status} ${response.statusText}`);
			}
		} catch (err) {
			autoConfirmTagsStatusContainer.clear();
			autoConfirmTagsStatusContainer.append(
				new Elm({
					type: 'div',
					class: 'status error',
					text: err.message,
				})
			);
		} finally {
			autoConfirmTagsInput.enable();
			autoConfirmTagsSaveButton.enable();
		}
	});

	const loadAutoresponder = async (autoresponderId: string) => {
		const autoresponderResponse = await apiRequest(
			`/admin/autoresponder?autoresponderId=${autoresponderId}`
		);
		const autoresponderData = (await autoresponderResponse.json()) as Autoresponder;
		closeStepEditor();
		const { defaultTagReason, steps } = autoresponderData;
		autoresponderIdElm.value = autoresponderData.autoresponderId;
		defaultTagReasonElm.value = defaultTagReason;
		if (defaultTagReason) {
			Object.keys(steps).forEach(stepName => {
				if (!autoresponderData.steps[stepName].tagReason?.trim()) {
					autoresponderData.steps[stepName].tagReason = defaultTagReason;
				}
			})
		}
		updateDefinition(autoresponderData, true);
	};

	const appendAutoresponderListItem = (autoresponder: any) => {
		autoresponderListElm.append(
			new Elm(
				{
					type: 'li',
					class: 'm-b-0p5',
					id: `autoresponder-li-${autoresponder.autoresponderId.toLocaleLowerCase()}`,
				},
				[
					new Elm('span', autoresponder.autoresponderId),
					' ',
					new Elm({
						type: 'button',
						class: 'button minor inline',
						text: 'Delete',
						events: {
							click: async () => {
								const { autoresponderId } = autoresponder;
								if (
									await confirmDelete(
										'Are you sure you want to delete the autoresponder: ' +
											`${autoresponderId}?`
									)
								) {
									const liElement = byId(
										`autoresponder-li-${autoresponder.autoresponderId.toLocaleLowerCase()}`
									);
									if (liElement.query('.status')) {
										liElement.query('.status').removeSelf();
									}
									liElement.style.color = 'grey';
									liElement.queryAll('button').forEach((btn) => btn.hide());
									try {
										await apiRequest('/admin/autoresponder', {
											method: 'DELETE',
											body: JSON.stringify({ autoresponderId }),
										});
										liElement.removeSelf();
									} catch (err) {
										console.error(err);
										liElement.append(
											new Elm({
												type: 'span',
												class: 'status error m-l-0p5',
												text: `Error deleting autoresponder: ${err.message}`,
											})
										);
									} finally {
										liElement.style.color = '';
										liElement.queryAll('button').forEach((btn) => btn.show());
									}
								}
							},
						},
					}),
					' ',
					new Elm({
						type: 'button',
						class: 'button minor inline',
						text: 'Edit',
						events: {
							click: async () => {
								const liElement = byId(
									`autoresponder-li-${autoresponder.autoresponderId.toLocaleLowerCase()}`
								);
								if (liElement.query('.status')) {
									liElement.query('.status').removeSelf();
								}
								liElement.queryAll('button').forEach((btn) => btn.hide());
								try {
									await loadAutoresponder(autoresponder.autoresponderId);
								} catch (err) {
									console.error(err);
									liElement.append(
										new Elm({
											type: 'span',
											class: 'status error m-l-0p5',
											text: `Error loading autoresponder: ${err.message}`,
										})
									);
								} finally {
									liElement.queryAll('button').forEach((btn) => btn.show());
								}
							},
						},
					}),
				]
			)
		);
	};

	const renderAutoresponderList = (list: any[]) => {
		autoresponderListElm.clear();
		if (!list.length) {
			autoresponderListElm.append(
				new Elm('li', new Elm('em', 'No autoresponders found'))
			);
			return;
		}
		list.forEach((autoresponder) => {
			appendAutoresponderListItem(autoresponder);
		});
	};

	loadTemplates((templates) => (cachedTemplateList = templates));

	const loadAutoresponders = async () => {
		try {
			const nextToken = '';
			listStatusElm.clear();
			listStatusElm.append(
				new Elm({
					type: 'div',
					class: 'status m-b-0p5',
					text: 'Loading...',
				})
			);
			const response = await apiRequest(
				`/admin/autoresponders${
					nextToken && `?nextToken=${encodeURIComponent(nextToken)}`
				}`
			);
			const autoresponders = await response.json();
			renderAutoresponderList(autoresponders);
			listStatusElm.clear();
		} catch (err) {
			console.error(err);
			listStatusElm.clear();
			listStatusElm.append(
				new Elm({
					type: 'div',
					class: 'status error m-b-0p5',
					text: `Error loading autoresponder list: ${err.message}`,
				})
			);
		}
	};

	loadAutoresponders();
});
