import { Elm } from './hsh/Elm';

export const createTemplateListElm = (
	templateList: { Name: string }[],
	clickEvent: (templateName: string) => any,
	selectButtonText: string = 'Use'
): Elm => {
	return new Elm(
		{
			type: 'ul',
			attrs: { class: 'template-list' },
		},
		templateList.map(
			(template) =>
				new Elm({ type: 'li' }, [
					new Elm({
						type: 'span',
						class: 'template-name',
						text: template.Name,
					}),
					' ',
					new Elm({
						type: 'button',
						class: 'button minor inline',
						text: selectButtonText,
						events: {
							click: () => {
								clickEvent(template.Name);
							},
						},
					}),
				])
		)
	);
};
