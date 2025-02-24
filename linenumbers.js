const withLineNumbers = (highlight, options = {}) => {
    const opts = {
        class: 'line-numbers',
        wrapClass: 'wrapper',
        width: '35px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '',
        ...options
    };

    let lineNumbers;
    let wrapper;

    return (editor) => {
        if (!lineNumbers) {
            lineNumbers = document.createElement('div');
            lineNumbers.className = opts.class;
            lineNumbers.style.width = opts.width;
            lineNumbers.style.backgroundColor = opts.backgroundColor;
            if (opts.color) lineNumbers.style.color = opts.color;

            wrapper = document.createElement('div');
            wrapper.className = opts.wrapClass;
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'row';
            wrapper.style.alignItems = 'stretch';
            wrapper.style.width = '100%';
            wrapper.style.height = '100%';

            // Move editor content to wrapper
            const parent = editor.parentNode;
            wrapper.appendChild(lineNumbers);
            parent.insertBefore(wrapper, editor);
            wrapper.appendChild(editor);
            editor.style.flex = 1;
        }

        const code = editor.textContent;
        const linesCount = code.split('\n').length;
        let text = '';
        for (let i = 0; i < linesCount; i++) {
            text += (i + 1) + '\n';
        }
        lineNumbers.textContent = text;

        highlight(editor);
    };
}; 