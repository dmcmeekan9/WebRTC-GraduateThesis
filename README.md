# WebRTC - Western Illinois University Thesis
###    Dennis McMeekan

## To Use
The signaling server uses Node.js and and can be started as such:
'''
$ npm install
$ npm start
'''
With the server running, visit `https://localhost:8443`.

# Three Different Cases, with an Effort to Establish Covert Channels to Promote Data Integrity using WebRTC
## Cases
- Each case is done using an Acer laptop webcam with a webcam cover (black screen) to ensure consistent results.
- The test is conducted for 2 minutes (120 seconds), and during that duration low and high measurements are taken.
- First data is not recorded until 30 seconds have elapsed to ensure a consistent data stream has been established.
- Test is performed three times, each time having the client/server reset.
- The results are then averaged.
- All performed locally, simulating a Peer-to-Peer connection.
### Case One: Establishing a Peer Connection, without Image Filtering or Random Delays
1) Takes Video Input, establishes a Peer Connection
2) Outputs to Remote Stream

*Averages:*
- Bitrate:    1128 kbits/sec
  * Low:  1008
  * High: 1248
- Jitter:     0.003 milliseconds
  * Low:  0.001
  * High: 0.005
- RTT:        0.009 milliseconds
  * Low:  0.006
  * High: 0.012

### Case Two: Establishing a Peer WebRTC Connection, using Covert Channels with Image Filtering WITHOUT Random Delays
1) Takes Video Input and puts data to the First Canvas
2) Performs a data transformation, then outputs to a Second Canvas, then etablishes a Peer Connection
3) Remote Connection senses the data transformation, reverses the transformation, and then outputs to the Remote Stream
4) This simulates data channel control by an administrator.

*Averages:*
- Bitrate:     kbits/sec
  * Low:  
  * High: 
- Jitter:      milliseconds
  * Low:  
  * High: 
- RTT:         milliseconds
  * Low:  
  * High: 
### Case Three: Establishing a Peer WebRTC Connection, using Covert Channels with Image Filtering AND Random Delays
1) Takes Video Input and puts data to the First Canvas
2) Performs a *random* data transformation, then outputs to a Second Canvas, then etablishes a Peer Connection
3) Remote Connection senses the *random* data transformation, reverses the transformation, and then outputs to the Remote Stream

*Averages:*
- Bitrate:     kbits/sec
  * Low:  
  * High: 
- Jitter:      milliseconds
  * Low:  
  * High: 
- RTT:         milliseconds
  * Low:  
  * High: 
## License
The MIT License - Copyright (c) 2021 Dennis McMeekan
Copyright (c) 2014, The WebRTC project authors. All rights reserved.