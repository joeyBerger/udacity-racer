// The store will hold all information needed globally
var store = {
	track_id: undefined,
	player_id: undefined,
	race_id: undefined,
}

const trackNames = ["MOUNT PANORAMA","CIRCUIT DE LA SARTHE","SUZUKA","SPA-FRANCORCHAMPS","NűRBURGRING NORDSCHLEIFE","SILVERSTONE"];
const carNames = ["SSC TUATARA","BUGATTI CHIRON SUPER SPORT","HENNESSEY VENOM F5","KOENIGSEGG AGERA RS","HENNESSEY VENOM GT"];

document.addEventListener("DOMContentLoaded", function() {
	onPageLoad()
	setupClickHandlers()
})

//load tracks and racers
async function onPageLoad() {
    try {
		getTracks()
			.then(tracks => {                
                tracks.forEach((track,i) => track.name = trackNames[i])
				const html = renderTrackCards(tracks)
				renderAt('#tracks', html)
			})

		getRacers()
			.then((racers) => {
                racers.forEach((racer,i) => racer.driver_name = carNames[i])
				const html = renderRacerCars(racers)
				renderAt('#racers', html)
			})
	} catch(error) {
		console.log("Problem getting tracks and racers ::", error.message)
	}
}

function setupClickHandlers() {
	document.addEventListener('click', function(event) {
		const { target } = event

		// Race track form field
		if (target.matches('.card.track')) {
			handleSelectTrack(target)
		}

		// Podracer form field
		if (target.matches('.card.podracer')) {
			handleSelectPodRacer(target)
		}

		// Submit create race form
		if (target.matches('#submit-create-race')) {
			event.preventDefault()
	
			// start race
			handleCreateRace()
		}

		// Handle acceleration click
		if (target.matches('#gas-peddle')) {
			handleAccelerate(target)
		}

	}, false)
}

async function delay(ms) {
	try {
		return await new Promise(resolve => setTimeout(resolve, ms));
	} catch(error) {
		console.log("an error shouldn't be possible here")
		console.log(error)
	}
}

// This async function controls the flow of the race
async function handleCreateRace() {
    if (store.player_id === undefined || store.track_id === undefined) return

	// render starting UI
	renderAt('#race', renderRaceStartView(trackNames[store.track_id]))

    //get player and track ids
    const {player_id, track_id} = store;
    
	// invoke the API call to create the race, then save the result
    const race = await createRace(player_id, track_id)
    store.race_id = race.ID;

	// The race has been created, now start the countdown
    runCountdown()
        .then(() => startRace(store.race_id-1))
        .then(() => runRace(store.race_id-1))
        .catch(e => console.log(e))
}

function runRace(raceID) {
	return new Promise(resolve => {
        const raceInterval = setInterval(async () => {
            try {
                const res = await getRace(raceID);
                if (res.status === 'in-progress') renderAt('#leaderBoard', raceProgress(res.positions))
                else {
                    clearInterval(raceInterval)
                    renderAt('#race', resultsView(res.positions))
                    resolve(res);
                }
            } catch(e) {console.log(e)}
        },500)
	})
}

async function runCountdown() {
	try {
		// wait for the DOM to load
		await delay(1000)
        let timer = 3;
        
        const displayCountdownHtml = (t) => {document.getElementById('big-numbers').innerHTML = t}

		return new Promise(resolve => {
            let interval = setInterval(() => {
                // DOM manipulation to decrement the countdown for the user
                displayCountdownHtml(--timer);
                if (timer === 0) {
                    clearInterval(interval);
                    resolve()
                }
            }, 1000)
            displayCountdownHtml(--timer);
		})
	} catch(error) {
		console.log(error);
	}
}

function handleSelectPodRacer(target) {
	// remove class selected from all racer options
	const selected = document.querySelector('#racers .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	// add class selected to current target
	target.classList.add('selected')

    // save the selected racer to the store
    store.player_id = parseInt(target.id);
}

function handleSelectTrack(target) {
	// remove class selected from all track options
	const selected = document.querySelector('#tracks .selected')
	if(selected) {
		selected.classList.remove('selected')
	}

	// add class selected to current target
	target.classList.add('selected')

	// save the selected track id to the store
	store.track_id = parseInt(target.id);
}

function handleAccelerate() {
    // Invoke the API call to accelerate
    accelerate(store.race_id-1)
        .catch(e => console.log(e))
}

// HTML VIEWS ------------------------------------------------

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`
	}

	const results = racers.map(renderRacerCard).join('')

	return `
		<ul id="racers">
			${results}
		</ul>
	`
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer

	return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>Speed: ${top_speed}</p>
			<p>Acceleration: ${acceleration}</p>
			<p>Handling: ${handling}</p>
		</li>
	`
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`
	}

	const results = tracks.map(renderTrackCard).join('')

	return `
		<ul id="tracks">
			${results}
		</ul>
	`
}

function renderTrackCard(track) {
	const { id, name } = track

	return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`
}

function renderRaceStartView(trackName, racers) {
	return `
		<header>
			<h1>Race: ${trackName}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`
}

function resultsView(positions) {
	positions.sort((a, b) => (a.final_position > b.final_position) ? 1 : -1)

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`
}

function raceProgress(positions) {
	let userPlayer = positions.find(e => e.id === store.player_id)
    
	userPlayer.driver_name += " (you)"

	positions = positions.sort((a, b) => (a.segment > b.segment) ? -1 : 1)
	let count = 1

	const results = positions.map(p => {
		return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
	}).join('')

	return `
		<main>
			<h3>Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`
}

function renderAt(element, html) {
	const node = document.querySelector(element)

	node.innerHTML = html
}

// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:8000'

function defaultFetchOpts() {
	return {
		mode: 'cors',
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin' : SERVER,
		},
	}
}

// API request to get available tracks
function getTracks() {
    try {
        const tracks = fetch(`${SERVER}/api/tracks`)
            .then(res => res.json())
        return tracks;
    } catch (e) {
        console.log(e)
    }
}

// API request to get available racers
function getRacers() {
    try {
        const racers = fetch(`${SERVER}/api/cars`)
            .then(res => res.json())
        return racers
    } catch(e) {console.log(e)}

}

// API POST request to create new racing environment
function createRace(player_id, track_id) {
	player_id = parseInt(player_id)
	track_id = parseInt(track_id)
	const body = { player_id, track_id }
	
	return fetch(`${SERVER}/api/races`, {
		method: 'POST',
		...defaultFetchOpts(),
		dataType: 'jsonp',
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.catch(err => console.log("Problem with createRace request::", err))
}

// API request to get latest race info
function getRace(id) {
    try {
        const race = fetch(`${SERVER}/api/races/${id}`)
            .then(res => res.json())
        return race;
    } catch(e) {console.log(e)}
}

// API post request to initiate start of race
function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.catch(err => console.log("Problem with getRace request::", err))
}

// on user click, post user click
function accelerate(id) {
    return fetch(`${SERVER}/api/races/${id}/accelerate`, {
		method: 'POST',
		...defaultFetchOpts(),
	})
	.catch(err => console.log("Problem with accerlate::", err))
}
