// Editor setup and configuration
const initEditor = () => {
    const editor = document.querySelector('#editor');
    const jar = CodeJar(editor, withLineNumbers(Prism.highlightElement), {
        tab: '  ',
        indentOn: /[{]/
    });

    // Set initial content
    jar.updateCode(`; Example Lisp-like code
(play 
  (note "C4" 0.5)
  (chord ["E4" "G4"] 1))
`);

    return jar;
}; 