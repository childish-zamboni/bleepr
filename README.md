# bleepr
Predicting and censoring profanities

Nobody likes hearing profanities. Bleepr predicts if a certain word is about the be stated and then bleeps before it is.

I used Google's Cloud Speech API to record what people say, and I created an algorithm that periodically trains an LSTM network with that information. The application repeatedly predicts the next four letters and beeps if they spell "duck". I used Neataptic, a neural network library for javascript, and node.js.

Demo: https://youtu.be/iZc16SqLRBc
