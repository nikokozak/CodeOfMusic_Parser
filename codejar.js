// CodeJar - Micro Code Editor
const CodeJar = function(editor, highlight, opt = {}) {
    const options = {
        tab: '\t',
        indentOn: /[({\[]$/,
        spellcheck: false,
        catchTab: true,
        preserveIdent: true,
        addClosing: true,
        history: true,
        window: window,
        ...opt
    };

    let listeners = [];
    let history = [];
    let at = -1;
    let focus = false;
    let callback;
    let prev; // code content prior to current changes

    editor.setAttribute('contenteditable', 'plaintext-only');
    editor.setAttribute('spellcheck', options.spellcheck ? 'true' : 'false');
    editor.style.outline = 'none';
    editor.style.overflowWrap = 'break-word';
    editor.style.overflowY = 'auto';
    editor.style.whiteSpace = 'pre-wrap';

    let getCursor = () => {
        let pos = 0;
        let selection = options.window.getSelection();
        if (selection.rangeCount) {
            let range = selection.getRangeAt(0);
            let preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(editor);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            pos = preCaretRange.toString().length;
        }
        return pos;
    };

    let setCursor = (pos) => {
        let selection = options.window.getSelection();
        let range = document.createRange();
        let textNodes = getTextNodes(editor);
        let node;
        let offset;

        if (textNodes.length === 0) {
            node = editor;
            offset = 0;
        } else {
            for (let i = 0; i < textNodes.length; i++) {
                let len = textNodes[i].nodeValue.length;
                if (pos <= len) {
                    node = textNodes[i];
                    offset = pos;
                    break;
                }
                pos -= len;
            }
            if (!node) {
                node = textNodes[textNodes.length - 1];
                offset = node.nodeValue.length;
            }
        }

        range.setStart(node, offset);
        range.setEnd(node, offset);
        selection.removeAllRanges();
        selection.addRange(range);
    };

    let getTextNodes = (node) => {
        let textNodes = [];
        if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node);
        } else {
            let children = node.childNodes;
            for (let i = 0; i < children.length; i++) {
                textNodes.push(...getTextNodes(children[i]));
            }
        }
        return textNodes;
    };

    let toString = () => editor.textContent || '';

    let save = () => {
        prev = toString();
        if (options.history) {
            if (at < history.length - 1) {
                history = history.slice(0, at + 1);
            }
            history.push(prev);
            at = history.length - 1;
        }
    };

    let restore = (text) => {
        editor.textContent = text;
        highlight(editor);
    };

    let recordHistory = (e) => {
        if (!e.inputType || !e.inputType.includes('history')) {
            save();
        }
    };

    let undo = () => {
        if (!options.history || at <= 0) return;
        at--;
        restore(history[at]);
    };

    let redo = () => {
        if (!options.history || at >= history.length - 1) return;
        at++;
        restore(history[at]);
    };

    let handleNewLine = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            let before = toString().slice(0, getCursor());
            let after = toString().slice(getCursor());
            let [indent] = before.match(/[^\n]*$/)[0].match(/^\s*/);
            let newLine = '\n' + indent;
            if (options.indentOn.test(before.split('\n').pop())) {
                newLine += options.tab;
            }
            save();
            restore(before + newLine + after);
            setCursor(before.length + newLine.length);
        }
    };

    let handleTab = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                let before = toString().slice(0, getCursor());
                let after = toString().slice(getCursor());
                let [indent] = before.match(/\s*$/);
                let outdent = Math.min(indent.length, options.tab.length);
                if (outdent === 0) return;
                restore(before.slice(0, -outdent) + after);
                setCursor(before.length - outdent);
            } else {
                let pos = getCursor();
                restore(toString().slice(0, pos) + options.tab + toString().slice(pos));
                setCursor(pos + options.tab.length);
            }
        }
    };

    let handleSelfClosing = (e) => {
        if (options.addClosing && '([{\'\"'.includes(e.key)) {
            e.preventDefault();
            let pos = getCursor();
            let text = toString();
            let before = text.slice(0, pos);
            let after = text.slice(pos);
            let closing = {
                '(': ')',
                '[': ']',
                '{': '}',
                '\'': '\'',
                '"': '"'
            }[e.key];
            if (after[0] === closing) {
                setCursor(pos + 1);
            } else {
                restore(before + e.key + closing + after);
                setCursor(pos + 1);
            }
        }
    };

    let init = () => {
        save();
        editor.addEventListener('keydown', handleNewLine);
        if (options.catchTab) editor.addEventListener('keydown', handleTab);
        if (options.addClosing) editor.addEventListener('keydown', handleSelfClosing);
        editor.addEventListener('input', recordHistory);
        editor.addEventListener('focus', () => {
            focus = true;
        });
        editor.addEventListener('blur', () => {
            focus = false;
        });
        editor.addEventListener('input', () => {
            if (callback) callback(toString());
        });
    };

    let updateCode = (code) => {
        restore(code);
        save();
    };

    let onUpdate = (cb) => {
        callback = cb;
    };

    let destroy = () => {
        for (let listener of listeners) {
            editor.removeEventListener(listener.event, listener.callback);
        }
    };

    init();

    return {
        updateCode,
        onUpdate,
        toString,
        save,
        restore,
        recordHistory,
        destroy,
        undo,
        redo
    };
}; 