# WebRTC - Western Illinois University Thesis
###    Dennis McMeekan

## To Use
The signaling server uses Node.js and and can be started as such:
'''
$ npm install
$ npm start
'''
With the server running, visit `https://localhost:8443`.

## Cases
### Case One:
**Establishing a Peer Connection, without Image Filtering or Random Delays** <br/>
*Averages:*
- Bitrate:    1750-1850 kbits/sec
  * Low:  1676
  * High: 1829
- Jitter:     0.004 milliseconds
  * Low:  0.002
  * High: 0.007
- RTT:        0.015 milliseconds
  * Low:  0.012
  * High: 0.019

### Case Two:
**Establishing a Peer WebRTC Connection, using Covert Channels with Image Filtering WITHOUT Random Delays**
### Case Three:
**Establishing a Peer WebRTC Connection, using Covert Channels with Image Filtering AND Random Delays**


## License
