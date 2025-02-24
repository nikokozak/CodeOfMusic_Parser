(track "kick" '(
  (step 1)
  (step 0)
  (step 1)
  (step 0)
))

(drum-machine :tempo 120 :signature 4 
  (arrangement :active 1 :bars 2 
    (track "kick" '(
      (step 1)
      (step 0)
      (step 1 :pitch -2 :volume 0.8)
      (step 0)))
    (track "hihat" '(
      (step 0)
      (step 1 :pitch 4 :duration 0.1)
      (step 0)
      (step 1)))
    (track "snare" '(
      (step 0)
      (step 1)
      (step 0)
      (step 1 :volume 0.5)))))
