// DOM Elements
const gameBoard = document.querySelector('.game-cards');
const movesCounter = document.querySelector('.move-counter');
const currentGameMoves = document.querySelector('.current-game-counter');
const timerDisplay = document.querySelector('.timer');
const messageDisplay = document.querySelector('.message');
const resetButton = document.querySelector('.reset-button');
const newGameButton = document.querySelector('.newGame-button');

//Audio Elements
let victoryMusic = new Audio('sounds/victory.mp3');
let cardFlipAudio = new Audio('sounds/card-flip.mp3');
let matchedAudio = new Audio('sounds/match.mp3');

// Game Variables
let cards = [];
let firstCard = null;
let secondCard = null;
const totalPairs = 8;
let moves = 0;
let matchedPairs = 0;
let timerInterval; 
let elapsedTime = 0; 
let hasStarted = false; 
let lockBoard = false 
let totalMoves = parseInt(localStorage.getItem('totalMoves')) || 0; // storing totalMoves in localstorage to track across tabs

// Card image sources (pairs)
const images = [
    'images/black.jpg', 'images/blue.jpg', 'images/red.jpg', 'images/green.jpg',
    'images/lt-blue.jpg', 'images/melon.jpg', 'images/pink.jpg', 'images/yellow.jpg',
    'images/black.jpg', 'images/blue.jpg', 'images/red.jpg', 'images/green.jpg',
    'images/lt-blue.jpg', 'images/melon.jpg', 'images/pink.jpg', 'images/yellow.jpg'
];

// shuffling the images stored in the array
// implementing the Fisher-Yates shuffle
const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// Creating a card element and adding it to the DOM
function createCardElement(image) {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.image = image;

    const cardFront = document.createElement('img');
    cardFront.src = image; // The image to show when flipped
    cardFront.classList.add('card-front');
    cardFront.style.display = 'none'; // Initially hidden

    const cardBack = document.createElement('img');
    cardBack.src = 'images/egg.jpg'; // image source for back of the card
    cardBack.classList.add('card-back');

    card.appendChild(cardFront);
    card.appendChild(cardBack);

    // Event Listener: Card click
    card.addEventListener('click', handleCardClick);
    return card;
}

// Save Game State
//state of cards, timer, and buttons are stored in session storage, total moves in local storage
function saveGameState() {
    const state = {
        moves,
        elapsedTime,
        matchedPairs,
        hasStarted,
        board: cards.map((card) => ({
            image: card.dataset.image,
            matched: card.classList.contains('matched'),
            flipped: card.querySelector('.card-front').style.display === 'block', // True if face-up
        })),
        resetButtonHidden: resetButton.classList.contains('hidden'),
        messageDisplayHidden: messageDisplay.classList.contains('hidden'),
    };
    sessionStorage.setItem('memoryGameState', JSON.stringify(state));
    localStorage.setItem('totalMoves', totalMoves);
}


// Load Game State
//pulling the card, buttons, and timer state from session and number of moves from local storage
function loadGameState() {
    const savedState = JSON.parse(sessionStorage.getItem('memoryGameState'));
    totalMoves = parseInt(localStorage.getItem('totalMoves')) || 0;
    updateMoves();
    
    if (!savedState) return false;

    moves = savedState.moves;
    elapsedTime = savedState.elapsedTime;
    matchedPairs = savedState.matchedPairs;
    hasStarted = savedState.hasStarted;

    updateMoves();
    updateTimer();

    gameBoard.innerHTML = ''; // Clear the board

    cards = savedState.board.map((data) => {
        const card = createCardElement(data.image);

        if (data.matched) {
            card.classList.add('matched');
            card.querySelector('.card-front').style.display = 'block';
            card.querySelector('.card-back').style.display = 'none';
        } else if (data.flipped) { // Ensure non-matched but flipped cards remain flipped
            card.classList.add('flipped');
            card.querySelector('.card-front').style.display = 'block';
            card.querySelector('.card-back').style.display = 'none';
        }

        return card;
    });

    cards.forEach(card => gameBoard.appendChild(card));

    // Restore hidden states of UI elements
    if (savedState.resetButtonHidden) {
        resetButton.classList.add('hidden');
    } else {
        resetButton.classList.remove('hidden');
    }

    if (savedState.messageDisplayHidden) {
        messageDisplay.classList.add('hidden');
    } else {
        messageDisplay.classList.remove('hidden');
    }

    // Restore final move count if game was won
    const finalMoveCount = document.querySelector('.currentMoves');
    const savedFinalMoveCount = sessionStorage.getItem('finalMoveCount');
    if (savedFinalMoveCount) {
        finalMoveCount.textContent = `${savedFinalMoveCount}`;
    }

    if (hasStarted) startTimer();  // Resume timer if game was already started
    return true;
}

// Initialize Game
function initializeGame() {
    if (loadGameState()) return; // If a saved state exists, load it

    cards = shuffle(images).map((image, index) => createCardElement(image, index));
    gameBoard.innerHTML = '';
    cards.forEach((card) => gameBoard.appendChild(card));

    moves = 0;
    matchedPairs = 0;
    elapsedTime = 0;
    hasStarted = false;
    lockBoard = false;

    updateMoves();
    updateTimer();
    saveGameState();
    clearInterval(timerInterval);
}

// Start Timer
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedTime++;
        updateTimer();
        saveGameState();
    }, 1000);
}

// Handle card click
function handleCardClick(event) {
    const clickedCard = event.currentTarget;
    cardFlipAudio.play();

    if (!hasStarted) {
        hasStarted = true;
        startTimer();
    }

    if (lockBoard || clickedCard === firstCard || clickedCard.classList.contains('matched')) {
        cardFlipAudio.pause();
        return; // Prevents double-clicks or clicking matched cards
    }

    // Flip the card
    const cardFront = clickedCard.querySelector('.card-front');
    const cardBack = clickedCard.querySelector('.card-back');
    cardFront.style.display = 'block';
    cardBack.style.display = 'none';

    if (!firstCard) {
        firstCard = clickedCard;
    } else if (!secondCard) {
        secondCard = clickedCard;
        lockBoard = true; //prevents extra card clicks
        checkForMatch();
    }

    saveGameState();
}

// Check for a match
function checkForMatch() {
    moves++;
    totalMoves++;
    updateMoves();
    saveGameState();
    if (firstCard.dataset.image === secondCard.dataset.image) {
        matchedAudio.play();
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        matchedPairs++;
        resetSelections();

        // win condition
        if (matchedPairs === totalPairs) {
            clearInterval(timerInterval);
            matchedAudio.pause();
            victoryMusic.play();

            sessionStorage.setItem('finalMoveCount', moves);

            //hide reset button and display winning message
            resetButton.classList.add('hidden');
            messageDisplay.classList.remove('hidden');
            const finalMoveCount = document.querySelector('.currentMoves');
            finalMoveCount.textContent = `${moves}`
        }
    } else {
        setTimeout(() => {
            const firstFront = firstCard.querySelector('.card-front');
            const firstBack = firstCard.querySelector('.card-back');
            firstFront.style.display = 'none';
            firstBack.style.display = 'block';

            const secondFront = secondCard.querySelector('.card-front');
            const secondBack = secondCard.querySelector('.card-back');
            secondFront.style.display = 'none';
            secondBack.style.display = 'block';

            resetSelections();
        }, 1000); // Flip cards back after delay
    }
}

// Reset card selections after two cards have been clicked on
function resetSelections() {
    lockBoard = false; //allows for card clicks again
    firstCard = null;
    secondCard = null;
}

// keep track of moves
function updateMoves() {
    movesCounter.innerHTML = `<h3>Global Moves: ${totalMoves}</h3>`;
    currentGameMoves.innerHTML = `<h3>Moves this game: ${moves}</h3>`
    localStorage.setItem('totalMoves', totalMoves);
}

// Update timer display
function updateTimer() {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    timerDisplay.innerHTML = `<h3>Time: ${minutes}:${seconds.toString().padStart(2, '0')}</h3>`
}

//clear session/localstorage
resetButton.addEventListener('click', resetAll);
function resetAll() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload(); // Reload the page to reset the game state
}

newGameButton.addEventListener('click', resetGame);
function resetGame(){
    sessionStorage.clear();
    location.reload();
}

// Maintain total moves across all tabs
window.addEventListener('storage', (event) => {
    if (event.key === 'totalMoves') {
        totalMoves = parseInt(event.newValue) || 0;
        updateMoves();
    }
});


// Start the game
document.addEventListener("DOMContentLoaded", () => {
    initializeGame();
});

