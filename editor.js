// Editor setup and configuration
const initEditor = () => {
    const editor = document.querySelector('#editor');
    const jar = CodeJar(editor, withLineNumbers(Prism.highlightElement), {
        tab: '  ',
        indentOn: /[{]/
    });

    // Set initial content
    jar.updateCode(`; Welcome to Code of Music!
; Here's an example of what you can do:

(let [[tempo 120]  ; beats per minute
      [beat (/ 60 tempo)]]  ; duration of one beat
  
  ; Define a simple melody
  (sequence
    (note "C4" beat)
    (note "E4" beat)
    (note "G4" beat)
    (chord ["C4" "E4" "G4"] (* beat 2)))
  
  ; Play two melodies in parallel
  (parallel
    (sequence
      (note "C3" beat)
      (note "G3" beat))
    (sequence
      (note "E4" :duration 0.5)
      (note "G4" :duration 0.5))))`);

    return jar;
}; 