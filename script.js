// App State
var state = {
    difficulty: 5,
    rows: 5,
    time: 10,
    timerId: null,
    paused: false,
    timerExpired: false,
    // Statistics tracking
    stats: {
        'Pie to Table': { correct: 0, total: 0 },
        'Table to Pie': { correct: 0, total: 0 },
        'Bar to Table': { correct: 0, total: 0 },
        'Table to Bar': { correct: 0, total: 0 },
        'Line to Table': { correct: 0, total: 0 },
        'Table to Line': { correct: 0, total: 0 }
    },
    // Practice mode
    practiceMode: false,
    practiceType: null
};

// DOM Elements
var difficultyInput = document.getElementById('difficulty');
var rowsInput = document.getElementById('rows');
var timeInput = document.getElementById('time');
var pauseBtn = document.getElementById('pause');
var restartBtn = document.getElementById('restart');
var timerDisplay = document.getElementById('timer');
var questionContainer = document.getElementById('question');
var answersContainer = document.getElementById('answers');
var feedback = document.getElementById('feedback');

// Event Listeners
difficultyInput.addEventListener('change', function(e) {
    state.difficulty = parseInt(e.target.value, 10);
});

rowsInput.addEventListener('change', function(e) {
    state.rows = parseInt(e.target.value, 10);
});

timeInput.addEventListener('change', function(e) {
    state.time = parseFloat(e.target.value);
});

// Data Generation
// Higher difficulty = values are closer together and harder to distinguish
function generateData(forceQuantitative) {
    var isQuantitative = forceQuantitative !== undefined ? forceQuantitative : (Math.random() > 0.5);
    var labels = [];
    var data = [];

    // Percentage-based spread
    // Low difficulty: ratio ~2.0 (values vary up to ±200% of base, very easy)
    // High difficulty: ratio ~0.15 (values vary up to ±15% of base, very hard)
    var ratio = Math.max(0.1, 2.2 - (state.difficulty * 0.2));
    var base = Math.floor(Math.random() * 80) + 20; // base between 20 and 100

    for (var i = 0; i < state.rows; i++) {
        if (isQuantitative) {
            labels.push(i + 1);
        } else {
            labels.push('Thing ' + (i + 1));
        }
        var offset = base * ratio * (Math.random() * 2 - 1); // -ratio to +ratio
        var val = Math.max(1, Math.round(base + offset));
        data.push(val);
    }

    return { labels: labels, data: data, isQuantitative: isQuantitative };
}

// Generate data specifically for pie charts (percentages that sum to 100%)
function generatePieData() {
    var raw = [];
    var total = 0;

    // Difficulty 1: very uneven slices (one slice can be 5x+ another)
    // Difficulty 10: nearly equal slices (hard to distinguish)
    var maxRatio = 1 + (11 - state.difficulty) * 1.0; // 11 at diff 1, 2 at diff 10

    for (var i = 0; i < state.rows; i++) {
        var value = 1 + Math.random() * maxRatio;
        raw.push(value);
        total += value;
    }

    // Shuffle so the order isn't always descending
    for (var i = raw.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = raw[i];
        raw[i] = raw[j];
        raw[j] = tmp;
    }

    return {
        labels: raw.map(function(_, i) { return 'Thing ' + (i + 1); }),
        data: raw.map(function(d) { return (d / total) * 100; }),
        isQuantitative: false
    };
}

function generateGraphAnswers(correctData, isPie) {
    var answers = [correctData];
    for (var i = 0; i < 3; i++) {
        var shuffledData = shallowCopyData(correctData);
        shuffledData.data = shuffle(shuffledData.data.concat([]));
        answers.push(shuffledData);
    }

    shuffle(answers);

    answersContainer.innerHTML = '';
    forEachNodeList(answers, function(answer) {
        var answerEl = document.createElement('div');
        answerEl.classList.add('answer-choice');
        answerEl.dataset.correct = arraysEqual(answer.data, correctData.data) ? 'true' : 'false';
        renderGraph(answerEl, answer, isPie);
        answersContainer.appendChild(answerEl);
    });
}

function generateTableAnswers(correctData) {
    var answers = [correctData];
    for (var i = 0; i < 3; i++) {
        var shuffledData = shallowCopyData(correctData);
        shuffledData.data = shuffle(shuffledData.data.concat([]));
        answers.push(shuffledData);
    }

    shuffle(answers);

    answersContainer.innerHTML = '';
    forEachNodeList(answers, function(answer) {
        var answerEl = document.createElement('div');
        answerEl.classList.add('answer-choice');
        answerEl.dataset.correct = arraysEqual(answer.data, correctData.data) ? 'true' : 'false';
        renderTable(answerEl, answer);
        answersContainer.appendChild(answerEl);
    });
}

function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
    return array;
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
        if (Math.abs(a[i] - b[i]) > 0.01) return false;
    }
    return true;
}

// Helper: shallow copy of data object
function shallowCopyData(data) {
    return {
        labels: data.labels,
        data: data.data,
        isQuantitative: data.isQuantitative
    };
}

// Utility: forEach polyfill on NodeList
function forEachNodeList(list, callback) {
    for (var i = 0; i < list.length; i++) {
        callback(list[i], i);
    }
}

// Game Logic
function generateQuestion() {
    // Clear any existing timer first
    clearInterval(state.timerId);
    
    // Remove low-time warning class
    timerDisplay.classList.remove('low');
    
    // Reset answer choice styles
    var allChoices = answersContainer.querySelectorAll('.answer-choice');
    forEachNodeList(allChoices, function(choice) {
        choice.style.border = '';
        choice.style.backgroundColor = '';
        choice.style.opacity = '';
    });
    
    // Determine question type based on practice mode or randomly
    var isGraph, isPie, data;
    if (state.practiceMode && state.practiceType) {
        // In practice mode, use the selected practice type
        switch(state.practiceType) {
            case 'Pie to Table':
                isGraph = true;
                isPie = true;
                break;
            case 'Table to Pie':
                isGraph = false;
                isPie = true;
                break;
            case 'Bar to Table':
                isGraph = true;
                isPie = false;
                data = generateData(false); // force non-quantitative -> bar chart
                break;
            case 'Table to Bar':
                isGraph = false;
                isPie = false;
                data = generateData(false); // force non-quantitative -> bar chart
                break;
            case 'Line to Table':
                isGraph = true;
                isPie = false;
                data = generateData(true); // force quantitative -> line chart
                break;
            case 'Table to Line':
                isGraph = false;
                isPie = false;
                data = generateData(true); // force quantitative -> line chart
                break;
            default:
                isGraph = Math.random() > 0.5;
                isPie = Math.random() > 0.6; // Less likely to be a pie chart (40% chance)
        }
    } else {
        // In normal mode, choose randomly
        isGraph = Math.random() > 0.5;
        isPie = Math.random() > 0.6; // Less likely to be a pie chart (40% chance)
    }

    // If data wasn't already set by a practice-mode case, generate it now
    if (data === undefined) {
        if (isPie) {
            data = generatePieData();
        } else {
            data = generateData();
        }
    }

    // Determine question type for statistics
    var questionType;
    if (isGraph) {
        // Graph in question, tables in answers
        if (isPie) {
            questionType = 'Pie to Table';
        } else {
            // For line vs bar, we need to determine based on the data type
            questionType = data.isQuantitative ? 'Line to Table' : 'Bar to Table';
        }
        renderGraph(questionContainer, data, isPie);
        generateTableAnswers(data);
    } else {
        // Table in question, graphs in answers
        if (isPie) {
            questionType = 'Table to Pie';
        } else {
            // For line vs bar, we need to determine based on the data type
            questionType = data.isQuantitative ? 'Table to Line' : 'Table to Bar';
        }
        renderTable(questionContainer, data);
        generateGraphAnswers(data, isPie);
    }
    
    // Store the current question type for statistics
    state.currentQuestionType = questionType;
    
    // Start new timer
    startTimer();
}

// User Interaction
function handleAnswerClick(event) {
    // Clear the timer when an answer is clicked
    clearInterval(state.timerId);
    
    var answerEl = event.currentTarget;
    var isCorrect = answerEl.dataset.correct === 'true';
    
    // Record statistics for the current question type
    if (state.currentQuestionType) {
        state.stats[state.currentQuestionType].total++;
        if (isCorrect) {
            state.stats[state.currentQuestionType].correct++;
        }
    }
    
    var style = getComputedStyle(document.body);
    var successColor = style.getPropertyValue('--success').trim();
    var successBg = style.getPropertyValue('--success-bg').trim();
    var dangerColor = style.getPropertyValue('--danger').trim();
    var dangerBg = style.getPropertyValue('--danger-bg').trim();

    if (isCorrect) {
        feedback.textContent = 'Correct!';
        feedback.style.color = successColor;
    } else {
        feedback.textContent = 'Incorrect!';
        feedback.style.color = dangerColor;
    }

    // Show correct answer in green, wrong answers in red, and highlight the clicked answer
    var allChoices = answersContainer.querySelectorAll('.answer-choice');
    forEachNodeList(allChoices, function(choice) {
        if (choice.dataset.correct === 'true') {
            // Correct answer always shown in green
            choice.style.border = '3px solid ' + successColor;
            choice.style.backgroundColor = successBg;
        } else if (choice === answerEl && !isCorrect) {
            // Wrong answer that was clicked - show in red
            choice.style.border = '3px solid ' + dangerColor;
            choice.style.backgroundColor = dangerBg;
        } else {
            // Other wrong answers - dim them
            choice.style.opacity = '0.6';
        }
    });

    // Move to next question after 3 seconds
    setTimeout(function() {
        feedback.textContent = '';
        feedback.style.color = '';
        generateQuestion();
    }, 3000);
}

// Timer and Game Controls
function startTimer() {
    var timeLeft = state.time;
    timerDisplay.textContent = timeLeft.toFixed(1);

    state.timerId = setInterval(function() {
        if (!state.paused) {
            timeLeft -= 0.1;
            timerDisplay.textContent = timeLeft.toFixed(1); // Update display every interval

            // Add pulse class when time is low
            if (timeLeft < 3 && !timerDisplay.classList.contains('low')) {
                timerDisplay.classList.add('low');
            }
            
            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(state.timerId);
                timerDisplay.textContent = '0.0';
                timerDisplay.classList.remove('low');
                var style = getComputedStyle(document.body);
                var sColor = style.getPropertyValue('--success').trim();
                var sBg = style.getPropertyValue('--success-bg').trim();
                var dColor = style.getPropertyValue('--danger').trim();
                feedback.textContent = 'Time\'s up!';
                feedback.style.color = dColor;
                
                // Show the correct answer highlighted in green
                var allChoices = answersContainer.querySelectorAll('.answer-choice');
                forEachNodeList(allChoices, function(choice) {
                    if (choice.dataset.correct === 'true') {
                        choice.style.border = '3px solid ' + sColor;
                        choice.style.backgroundColor = sBg;
                    } else {
                        choice.style.opacity = '0.6';
                    }
                });
                
                // Freeze for 3 seconds then move to next question
                setTimeout(function() {
                    feedback.textContent = '';
                    feedback.style.color = '';
                    generateQuestion();
                }, 3000);
            }
        }
    }, 100);
}

function pauseGame() {
    state.paused = !state.paused;
    pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
}

function restartGame() {
    clearInterval(state.timerId);
    state.paused = false;
    pauseBtn.textContent = 'Pause';
    feedback.textContent = '';
    feedback.style.color = '';
    state.timerExpired = false; // Reset timer expired state
    generateQuestion();
    // startTimer() is called within generateQuestion(), so no need to call it again
}

// Event Listeners
pauseBtn.addEventListener('click', pauseGame);
restartBtn.addEventListener('click', restartGame);
document.getElementById('back').addEventListener('click', function() {
    // Exit practice mode and return to random question mode
    state.practiceMode = false;
    state.practiceType = null;
    generateQuestion();
});
answersContainer.addEventListener('click', function(e) {
    // Find the closest answer-choice element, whether clicking on the div itself or its children
    var answerChoice = e.target.closest('.answer-choice');
    if (answerChoice) {
        // Create a proper event-like object with the necessary properties
        var customEvent = {
            currentTarget: answerChoice,
            target: answerChoice
        };
        handleAnswerClick(customEvent);
    }
});

// Initialize the game
function init() {
    // Validate that DOM elements are properly selected
    if (!feedback) {
        console.error('Feedback element not found!');
        return;
    }
    if (!answersContainer) {
        console.error('Answers container element not found!');
        return;
    }
    
    console.log('DOM elements loaded successfully');
    generateQuestion();
}

// Statistics functionality
var statsBtn = document.getElementById('stats-btn');
var statsOverlay = document.getElementById('stats-overlay');
var closeStats = document.getElementById('close-stats');
var statsList = document.getElementById('stats-list');
var practiceButtons = document.querySelectorAll('.practice-btn');
var exitPracticeBtn = document.getElementById('exit-practice');

// Show statistics overlay
statsBtn.addEventListener('click', function() {
    updateStatsDisplay();
    statsOverlay.classList.remove('hidden');
});

// Close statistics overlay
closeStats.addEventListener('click', function() {
    statsOverlay.classList.add('hidden');
});

// Close overlay when clicking outside content
statsOverlay.addEventListener('click', function(e) {
    if (e.target === statsOverlay) {
        statsOverlay.classList.add('hidden');
    }
});

// Practice mode buttons
practiceButtons.forEach(function(button) {
    button.addEventListener('click', function() {
        var practiceType = button.getAttribute('data-type');
        state.practiceMode = true;
        state.practiceType = practiceType;
        statsOverlay.classList.add('hidden');
        generateQuestion(); // Start practicing the selected type
    });
});

// Exit practice mode
exitPracticeBtn.addEventListener('click', function() {
    state.practiceMode = false;
    state.practiceType = null;
    statsOverlay.classList.add('hidden');
});

// Function to update and display statistics
function updateStatsDisplay() {
    statsList.innerHTML = '';
    
    // Sort stats by accuracy percentage (descending)
    var statsArray = [];
    for (var key in state.stats) {
        if (state.stats.hasOwnProperty(key)) {
            statsArray.push([key, state.stats[key]]);
        }
    }
    var sortedStats = statsArray.sort(function(a, b) {
        var accA = a[1].total > 0 ? (a[1].correct / a[1].total) : 0;
        var accB = b[1].total > 0 ? (b[1].correct / b[1].total) : 0;
        return accB - accA;
    });
    
    sortedStats.forEach(function(item) {
        var type = item[0];
        var stats = item[1];
        var accuracy = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : 0;
        var statItem = document.createElement('div');
        statItem.className = 'stat-item';
        
        statItem.innerHTML = 
            '<span>' + type + ':</span>' +
            '<span>' + stats.correct + '/' + stats.total + ' (' + accuracy + '%)</span>';
        
        statsList.appendChild(statItem);
    });
}

// Refresh database (reset stats) when page is reloaded
window.addEventListener('beforeunload', function() {
    // Optionally save stats to localStorage before page closes
    localStorage.setItem('numberSenseStats', JSON.stringify(state.stats));
});

// Start the game when the page loads
window.addEventListener('load', function() {
    // Optionally restore stats from localStorage if they exist
    var savedStats = localStorage.getItem('numberSenseStats');
    if (savedStats) {
        try {
            state.stats = JSON.parse(savedStats);
        } catch (e) {
            console.warn('Could not parse saved stats, using defaults');
        }
    }
    init();
});

// Initial Log
console.log("Number Sense Training Initialized!");

// Theme toggle
var themeToggle = document.getElementById('theme-toggle');
var savedTheme = localStorage.getItem('nst-theme') || 'dark';
if (savedTheme === 'light') {
    document.body.setAttribute('data-theme', 'light');
    themeToggle.textContent = 'Dark Mode';
}
themeToggle.addEventListener('click', function() {
    if (document.body.getAttribute('data-theme') === 'light') {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = 'Light Mode';
        localStorage.setItem('nst-theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
        themeToggle.textContent = 'Dark Mode';
        localStorage.setItem('nst-theme', 'light');
    }
});
