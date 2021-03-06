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

const MAX_SCORE = 300;

class Game extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        lobbyId: this.props.match.params.id,
        players: [],
        currentPlayerId: "",
        tonguetwisters: [],
        currTongueTwisterIndex: 0,
        isUserWinner: false,
        winningPlayer: {},
      }
      this.updateScore = this.updateScore.bind(this);
    }
  
    componentDidMount() {
      var passedState = this.props.location.state;
  
      // Update the local lobby with this user.
      this.setState({
          players : passedState.players,
          currentPlayerId: passedState.sessionId,
      })

      // Update scores.
      socket.on('scoreUpdatedToClient', (data) => {
        this.setState({
          players: data.players,
        })
        // Check if a player won.
        for(var i = 0; i < data.players.length; i++) {
          if(data.players[i].score > MAX_SCORE) {
            socket.emit('gameOverServer', data.players[i])
          }
        }
      })

      // Someone won, determine if this user was winner or loser 
      socket.on('gameOverClient', (data) => {
        if(data.UID == this.state.currentPlayerId) {
          this.setState({
            isUserWinner: true,
            winningPlayer: data
          })
        } else {
          this.setState({
            isUserWinner: false,
            winningPlayer: data
          })
        }
      })

      // Fetch tongue twisters from server
      fetch(SERVER_ENDPOINT + '/api/tonguetwisters', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }).then(response => {
          response.json().then(data => {
            this.setState({
              tonguetwisters: data['tonguetwisters'],
            })
          })
        });
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

    updateScore(userResponse, currentTT, repeatCount) {
      // get user's response without spaces
      var userResponseStripped = userResponse.split(' ').join('').toLowerCase()

      // remove all punctuation, spaces, and multiply it by repeat count
      var currentTTStripped = currentTT.split(' ').join('').replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().repeat(repeatCount)
      
      var levenshteinScore = this.levenshtein(userResponseStripped, currentTTStripped)
      // Low levenshtein score means user got a really good score (inverse relationship). 
      var score = currentTTStripped.length - levenshteinScore
      if (score < 0) {
        score = 0;
      }

      // Update score board
      fetch(SERVER_ENDPOINT + '/api/updateScoreboard', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'state': this.state,
          'score': score, 
        })
      }).then(response => {
        response.json().then(data => {
          socket.emit('scoreUpdatedToServer', data);
        })
      });
    }

    getNextTongueTwister() {
      this.setState({
        currTongueTwisterIndex: this.state.currTongueTwisterIndex + 1,
      })
    }

    render() {
        const { transcript, resetTranscript, browserSupportsSpeechRecognition, startListening, abortListening } = this.props

        if (!browserSupportsSpeechRecognition) {
            return null
        }
        let gamePlay = this.buildGamePlayPage(transcript, resetTranscript, startListening, abortListening);
        
        let pageToDisplay;
        // Check if a player has been determined to be the winner yet
        if(Object.keys(this.state.winningPlayer).length === 0 && this.state.winningPlayer.constructor === Object) {
          pageToDisplay = gamePlay;
        } else {
          if(this.state.isUserWinner) {
            pageToDisplay = <h2>🎉Congrats {this.state.winningPlayer.username}, you won!🎉</h2>
          } else {
            pageToDisplay = <h2>Game over :( you lost to {this.state.winningPlayer.username}</h2>
          }
        }

        return (
          <Container>
            <h1>
            Tongue Twister Racer
            </h1>

            {pageToDisplay}
          </Container> 
        );
    }

    /**
     * Build out the JSX of the Gameplay page. Shows prompt, score, button to record, etc.
     * @param {*} transcript 
     * @param {*} resetTranscript 
     * @param {*} startListening 
     * @param {*} abortListening 
     */
    buildGamePlayPage(transcript, resetTranscript, startListening, abortListening) {
      const userList = this.state.players.map((player) => <li key={player.username}>{player.username}: {player.score}</li>);

      var userResponse;
      if (transcript) {
        userResponse = <div>{transcript}</div>;
      }
      else {
        userResponse = <div>...</div>;
      }

      // Build a prompt from the current Tongue Twister and Repeat Count
      let tongueTwisterPrompt;
      var currentTT;
      var repeatCount;
      if (this.state.tonguetwisters.length > 0) {
        currentTT = this.state.tonguetwisters[this.state.currTongueTwisterIndex]['tonguetwister'];
        repeatCount = this.state.tonguetwisters[this.state.currTongueTwisterIndex]['repeat'];
        if (repeatCount == 1) {
          tongueTwisterPrompt = currentTT;
        }
        else {
          tongueTwisterPrompt = `${currentTT} (Repeat ${repeatCount} times)`;
        }
      }
      else {
        tongueTwisterPrompt = `Loading...`;
      }

      // Wrap everything in a div to return as a JSX element.
      let gamePlay = 
      <div>
        <h2>
          Scoreboard
        </h2>
        <h4>First to {MAX_SCORE} points wins!</h4>
        {userList}
        <br/>

        <h3>Prompt</h3>
        {tongueTwisterPrompt}

        <h3>Your response</h3>
        {userResponse}

        <br />
        <Button onClick={() => { resetTranscript(); startListening(); } }>Record</Button>
        <br />
        <Button onClick={() => { resetTranscript(); abortListening(); this.updateScore(transcript, currentTT, repeatCount); this.getNextTongueTwister(); } }>Stop Recording and Submit</Button>
        <br />
      </div>;
      return gamePlay;
    }
  }

export default SpeechRecognition(options)(Game)