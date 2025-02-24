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

; Define a drum pattern using audio samples
(drum-machine :tempo 120 :signature 4 
  (arrangement :active 1 :bars 2 
    (track "kick" '(
      (step 1)  ; Play the kick sample
      (step 0)  ; Silent step
      (step 1 :pitch -2 :volume 0.8)  ; Play kick with lower pitch and higher volume
      (step 0)))
    (track "hihat" '(
      (step 0)
      (step 1 :pitch 4 :duration 0.1)  ; Play hihat with higher pitch and short duration
      (step 0)
      (step 1)))
    (track "snare" '(
      (step 0)
      (step 1)
      (step 0)
      (step 1 :volume 0.5)))))  ; Play snare with medium volume

; Or try this basic melodic example:
(let '(
  [tempo 120]  ; beats per minute
  [beat (/ 60 tempo)]  ; duration of one beat
)
  ; Define a simple melody
  (sequence
    (note "C4" beat)
    (note "E4" beat)
    (note "G4" beat)
    (chord '["C4" "E4" "G4"] (* beat 2))))`);

  return jar;
}; 
