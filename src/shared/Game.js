import React from 'react'
import SpeechRecognition from 'react-speech-recognition'
import styled from 'styled-components'
import socketIOClient from "socket.io-client";
import { Player } from './Player';

const Button = styled.button`
  background: palevioletred;
  border-radius: 3px;
  border: 2px solid palevioletred;
  color: white;
  margin: 0.5em 1em;
  padding: 0.25em 1em;
  font-size: 16px;
`;

const Container = styled.div`
  text-align: center;
  font-family: "Arial", sans-serif;
`

const options = {
  autoStart: false
}

const SERVER_ENDPOINT = "http://127.0.0.1:3000" 
// Establish a socket connection
const socket = socketIOClient(SERVER_ENDPOINT);

class Game extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        lobbyId: this.props.match.params.id,
        players: [],
      }
      this.updateScore = this.updateScore.bind(this);
    }
  
    componentDidMount() {
      var passedState = this.props.location.state;
  
      // Update the local lobby with this user.
      this.setState({
          players : passedState.players
      })
    }

    levenshtein(a, b){
        // Credit: https://gist.github.com/andrei-m/982927
        if(a.length == 0) return b.length; 
        if(b.length == 0) return a.length; 
      
        var matrix = [];
      
        // increment along the first column of each row
        var i;
        for(i = 0; i <= b.length; i++){
          matrix[i] = [i];
        }
      
        // increment each column in the first row
        var j;
        for(j = 0; j <= a.length; j++){
          matrix[0][j] = j;
        }
      
        // Fill in the rest of the matrix
        for(i = 1; i <= b.length; i++){
          for(j = 1; j <= a.length; j++){
            if(b.charAt(i-1) == a.charAt(j-1)){
              matrix[i][j] = matrix[i-1][j-1];
            } else {
              matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                      Math.min(matrix[i][j-1] + 1, // insertion
                                               matrix[i-1][j] + 1)); // deletion
            }
          }
        }
      
        return matrix[b.length][a.length];
      };

    updateScore(userResponse, currentTT) {
        var userResponseStripped = userResponse.split(' ').join('')
        var currentTTStripped = currentTT.split(' ').join('')
        
        var levenshteinScore = this.levenshtein(userResponseStripped, currentTTStripped)

        // Low levenshtein score means user got a really good score (inverse relationship). 
        var score = currentTTStripped.length - levenshteinScore

        alert('Your score: ' + score)
    }

    render() {
        const { transcript, resetTranscript, browserSupportsSpeechRecognition, startListening, stopListening } = this.props

        if (!browserSupportsSpeechRecognition) {
            return null
        }
        const userList = this.state.players.map((player) =>
            <li key={player.username}>{player.username}: 0</li>
        );

        let userResponse;
        if(transcript) {
            userResponse = <div>{transcript}</div>
        } else {
            userResponse = <div>...</div>
        }

        var currentTT = 'She sells seashells by the seashore'

        return (
            <Container>
            <h1>
            Tongue Twister Racer
            </h1>

            <h2>
                Scoreboard
            </h2>
            <h4>First to 50 points wins!</h4>
            {userList}
            <br/>

            <h3>Prompt</h3>
            {currentTT}

            <h3>Your response</h3>
            {userResponse}

            <br/>
            <Button onClick={() => {resetTranscript(); startListening();}}>Record</Button>
            <br/>
            <Button onClick={() => {stopListening(); this.updateScore(transcript, currentTT); resetTranscript();}}>Stop Recording and Submit</Button>
            <br/>
        </Container> 
        );
    }
}

export default SpeechRecognition(options)(Game)