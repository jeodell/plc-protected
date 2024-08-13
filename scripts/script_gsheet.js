window.plcOrange = '#E8881D'
window.plcBlue = '#69B1BE'
window.plcLightGreen = '#88C82F'
window.plcDarkGreen = '#345B30'

// This will let you use the .remove() function later on
if (!('remove' in Element.prototype)) {
  Element.prototype.remove = function () {
    if (this.parentNode) {
      this.parentNode.removeChild(this)
    }
  }
}

mapboxgl.accessToken = 'pk.eyJ1IjoiamVvZGVsbCIsImEiOiJja2ZmdG9lemkwMzZyMnRxcWRyZXhrNTMzIn0.EUuvg_jlbqbDeSKkNfIe0w'
const googleSheetsUrl =
  'https://docs.google.com/spreadsheets/d/1yl5b3J34iC5UncrGnsJxKMCSdpZKXubcwh03mtxRM7E/gviz/tq?tqx=out:csv&sheet=Sheet1'
const defaultCenter = [-80.1, 36]
const defaultZoom = 8
let allBluewaysList = null

function toggleSlideover() {
  document.getElementById('slideover').classList.toggle('hidden')
}

function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput)
  fillSlider(fromInput, toInput, window.plcLightGreen, window.plcDarkGreeen, controlSlider)
  if (from > to) {
    fromSlider.value = to
    fromInput.value = to
  } else {
    fromSlider.value = from
  }
}

function controlToInput(toSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput)
  fillSlider(fromInput, toInput, window.plcLightGreen, window.plcDarkGreeen, controlSlider)
  if (from <= to) {
    toSlider.value = to
    toInput.value = to
  } else {
    toInput.value = from
  }
}

function controlFromSlider(fromSlider, toSlider, fromInput, fromSpan, filterBlueways) {
  const [from, to] = getParsed(fromSlider, toSlider)
  fillSlider(fromSlider, toSlider, window.plcLightGreen, window.plcDarkGreeen, toSlider)
  if (from >= to) {
    fromSlider.value = to - 1
    fromInput.value = to - 1
    fromSpan.innerHTML = `${to - 1}${to - 1 == 10 ? '+' : ''} miles`
  } else {
    fromInput.value = from
    fromSpan.innerHTML = `${from}${from == 10 ? '+' : ''} miles`
  }
  filterBlueways()
}

function controlToSlider(fromSlider, toSlider, toInput, toSpan, filterBlueways) {
  const [from, to] = getParsed(fromSlider, toSlider)
  fillSlider(fromSlider, toSlider, window.plcLightGreen, window.plcDarkGreeen, toSlider)
  if (to <= from) {
    toSlider.value = from + 1
    toInput.value = from + 1
    toSpan.innerHTML = `${from + 1}${from + 1 == 10 ? '+' : ''} miles`
  } else {
    toInput.value = to
    toSlider.value = to
    toSpan.innerHTML = `${to}${to == 10 ? '+' : ''} miles`
  }
  filterBlueways()
}

function getParsed(currentFrom, currentTo) {
  const from = parseInt(currentFrom.value, 10)
  const to = parseInt(currentTo.value, 10)
  return [from, to]
}

function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
  const rangeDistance = to.max - to.min
  const fromPosition = from.value - to.min
  const toPosition = to.value - to.min
  controlSlider.style.background = `linear-gradient(
    to right,
    ${sliderColor} 0%,
    ${sliderColor} ${(fromPosition / rangeDistance) * 100}%,
    ${rangeColor} ${(fromPosition / rangeDistance) * 100}%,
    ${rangeColor} ${(toPosition / rangeDistance) * 100}%,
    ${sliderColor} ${(toPosition / rangeDistance) * 100}%,
    ${sliderColor} 100%)`
}

// Create the map
const map = new mapboxgl.Map({
  container: 'map',
  // Mapbox outdoors
  style: 'mapbox://styles/mapbox/outdoors-v12',
  center: defaultCenter,
  zoom: defaultZoom,
  attributionControl: false,
})

document.addEventListener('DOMContentLoaded', function () {
  const lightbox = GLightbox({
    selector: '.glightbox',
  })

  // Slider and input controls
  const fromSlider = document.querySelector('#fromSlider')
  const toSlider = document.querySelector('#toSlider')
  const fromInput = document.querySelector('#fromInput')
  const toInput = document.querySelector('#toInput')
  const fromSpan = document.querySelector('#fromSpan')
  const toSpan = document.querySelector('#toSpan')

  fillSlider(fromSlider, toSlider, window.plcLightGreen, window.plcDarkGreeen, toSlider)

  const filterByWaterbody = document.querySelectorAll('#filter-by-waterbody input')
  const filterByDifficulty = document.querySelectorAll('#filter-by-difficulty input')

  // Fetch blueway data from google sheets
  fetch(googleSheetsUrl)
    .then((response) => response.text())
    .then((csvData) => {
      makeGeoJSON(csvData)
    })
    .catch((error) => {
      console.error('Error:', error)
    })

  function makeGeoJSON(csvData) {
    csv2geojson.csv2geojson(
      csvData,
      {
        latfield: 'Lat',
        lonfield: 'Long',
        delimiter: ',',
      },
      function (err, blueways) {
        if (err) {
          console.error(err)
        }

        allBluewaysList = { ...blueways }

        // Assign a unique id to each blueway to be associated with sidebar listing
        blueways.features.forEach(function (blueway, i) {
          blueway.properties.id = i
        })

        map.on('load', function (e) {
          // Add event listeners for filter by waterbody checkboxes
          filterByWaterbody.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
              if (checkbox.value === 'all') {
                filterByWaterbody.forEach((checkbox) => {
                  checkbox.checked = false
                })
                checkbox.checked = true
              } else {
                document.querySelector('#filter-by-waterbody input[value="all"]').checked = false
                const filterByWaterbodyChecked = document.querySelectorAll('#filter-by-waterbody input:checked')
                if (filterByWaterbodyChecked.length === 0) {
                  document.querySelector('#filter-by-waterbody input[value="all"]').checked = true
                }
              }
              filterBlueways()
            })
          })

          // Add event listeners for filter by difficulty checkboxes
          filterByDifficulty.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
              if (checkbox.value === 'all') {
                filterByDifficulty.forEach((checkbox) => {
                  checkbox.checked = false
                })
                checkbox.checked = true
              } else {
                document.querySelector('#filter-by-difficulty input[value="all"]').checked = false
                const filterByDifficultyChecked = document.querySelectorAll('#filter-by-difficulty input:checked')
                if (filterByDifficultyChecked.length === 0) {
                  document.querySelector('#filter-by-difficulty input[value="all"]').checked = true
                }
              }
              filterBlueways()
            })
          })

          // Add event listeners for filter by distance slider and input
          fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput, fromSpan, filterBlueways)
          toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput, toSpan, filterBlueways)
          fromInput.oninput = () => controlFromInput(fromSlider, fromInput, toInput, toSlider)
          toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider)

          map.loadImage(`../images/marker.png`, function (error, image) {
            if (error) throw error

            map.addImage('plc-marker', image)
          })

          addBlueways()

          // var bbox = turf.bbox(blueways)
          // map.fitBounds(bbox, { padding: 50 })

          // Show blueway popup when hovering marker
          map.on('mouseenter', 'access-points', (e) => {
            map.getCanvas().style.cursor = 'pointer'
            createPopUp(e.features[0])
          })

          // Clear popups when mouse leaves marker
          map.on('mouseleave', 'access-points', () => {
            map.getCanvas().style.cursor = ''
            clearPopups()
          })

          // Fly to point, create new popup, and highlight sidebar listing
          map.on('click', 'access-points', (e) => {
            handleMarkerClick(e, e.features[0])
          })

          // Fly to point, create new popup, and highlight sidebar listing
          map.on('touchstart', 'access-points', (e) => {
            handleMarkerClick(e, e.features[0])
          })

          // Add geocoder search control to the map
          const geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
            localGeocoder: forwardGeocoder,
            countries: 'us',
            marker: false,
            zoom: 14,
            bbox: [-81.192711, 34.985003, -79.134634, 36.542191],
          })
          map.addControl(geocoder, 'top-left')

          // Calculate distance from search point
          geocoder.on('result', function (ev) {
            const searchResult = {
              type: 'Feature',
              geometry: ev.result.geometry,
            }
            const options = 'miles'
            blueways.features.forEach(function (blueway) {
              let coordinates
              if (blueway.properties.Long !== undefined && blueway.properties.Lat !== undefined) {
                coordinates = turf.point([blueway.properties.Long, blueway.properties.Lat])
              } else {
                coordinates = turf.point(blueway.geometry.coordinates)
              }
              Object.defineProperty(blueway.properties, 'distance', {
                value: turf.distance(searchResult, coordinates, options),
                writable: true,
                enumerable: true,
                configurable: true,
              })
            })
            sortBluewaysByDistance()

            const listings = document.getElementById('listings')
            while (listings?.firstChild) {
              listings.removeChild(listings.firstChild)
            }
            buildLocationList()
          })

          // Reset if geocoder is exited
          geocoder.on('clear', async function (ev) {
            sortBluewaysByNumber()
            sortBluewaysAlphabetically()
            resetLocationList()
          })

          // Add geolocate control to the map
          const geolocator = new mapboxgl.GeolocateControl({
            showAccuracyCircle: false,
          })
          map.addControl(geolocator, 'top-left')

          // Calculate distance from user
          geolocator.on('geolocate', function (ev) {
            const searchResult = {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [ev.coords.longitude, ev.coords.latitude],
              },
              attributes: {},
            }
            const options = 'miles'
            blueways.features.forEach(function (blueway) {
              let coordinates
              if (blueway.properties.Long !== undefined && blueway.properties.Lat !== undefined) {
                coordinates = turf.point([blueway.properties.Long, blueway.properties.Lat])
              } else {
                coordinates = turf.point(blueway.geometry.coordinates)
              }
              Object.defineProperty(blueway.properties, 'distance', {
                value: turf.distance(searchResult, coordinates, options),
                writable: true,
                enumerable: true,
                configurable: true,
              })
            })
            blueways.features.sort(function (a, b) {
              if (a.properties.distance > b.properties.distance) {
                return 1
              }
              if (a.properties.distance < b.properties.distance) {
                return -1
              }
              return 0
            })

            const listings = document.getElementById('listings')
            while (listings?.firstChild) {
              listings.removeChild(listings.firstChild)
            }

            buildLocationList()
            createPopUp(blueways.features[0])

            // Highlight the listing for the closest blueway
            const activeListing = document.getElementById('listing-' + blueways.features[0].properties.id)
            activeListing?.classList.add('active')
          })

          // Add navigation control to the map
          const nav = new mapboxgl.NavigationControl({
            visualizePitch: true,
          })
          map.addControl(nav, 'top-left')

          // Add scale control to the map.
          const scale = new mapboxgl.ScaleControl({
            unit: 'imperial',
          })
          map.addControl(scale, 'bottom-left')

          sortBluewaysByNumber()
          sortBluewaysAlphabetically()

          buildLocationList()
          showResetMapButton()
          showShowFilterButton()

          function addBlueways() {
            // Add source for blueways
            map.addSource('blueways', {
              type: 'geojson',
              data: blueways,
            })

            map.addLayer({
              id: 'access-points',
              type: 'symbol',
              source: 'blueways',
              layout: {
                'icon-image': 'plc-marker',
                'icon-size': 0.8,
                'icon-allow-overlap': false,
                'icon-ignore-placement': true,
              },
            })
          }

          // Show the reset map button and add event listener
          function showResetMapButton() {
            const resetMapButton = document.querySelector('#reset-map-button')
            resetMapButton?.classList.remove('hidden')
            resetMapButton?.addEventListener('click', resetMap)
          }

          // Show the filter button and add event listener
          function showShowFilterButton() {
            const showFilterButton = document.querySelector('#toggle-filter-button')
            showFilterButton?.classList.remove('hidden')
          }

          // Filter blueways
          function filterBlueways() {
            blueways = { ...allBluewaysList }

            const checkedWaterbodies = []
            for (const outerInput of filterByWaterbody) {
              if (outerInput.value === 'all' && outerInput.checked && checkedWaterbodies.length === 0) {
                for (const innerInput of filterByWaterbody) {
                  checkedWaterbodies.push(innerInput.value.toLowerCase())
                }
                break
              } else if (outerInput.checked) {
                checkedWaterbodies.push(outerInput.value.toLowerCase())
              }
            }

            const checkedDifficulty = []
            for (const outerInput of filterByDifficulty) {
              if (outerInput.value === 'all' && outerInput.checked && checkedDifficulty.length === 0) {
                for (const innerInput of filterByDifficulty) {
                  checkedDifficulty.push(innerInput.value.toLowerCase())
                }
                break
              } else if (outerInput.checked) {
                checkedDifficulty.push(outerInput.value.toLowerCase())
              }
            }

            blueways.features = blueways.features.filter((blueway) => {
              // Matching blueway
              let bluewayWaterbody = blueway.properties.Waterbody
              let hasMatchingWaterbody = false

              if (bluewayWaterbody === undefined) {
                return false
              }

              bluewayWaterbody = bluewayWaterbody.trim().toLowerCase()

              if (checkedWaterbodies.includes(bluewayWaterbody)) {
                hasMatchingWaterbody = true
              }

              // Matching difficulty
              const bluewayDifficulty = blueway.properties.Difficulty
              let hasMatchingDifficulty = false

              if (bluewayDifficulty === undefined) {
                return false
              } else {
                if (checkedDifficulty.includes('all')) {
                  hasMatchingDifficulty = true
                } else {
                  if (checkedDifficulty.includes(bluewayDifficulty.trim().toLowerCase())) {
                    hasMatchingDifficulty = true
                  }
                }
              }

              // Within distance
              const [from, to] = getParsed(fromInput, toInput)
              let hasMatchingDistance = false
              const previousPutInIndex = blueways.features.findIndex((bluewayIterator) => {
                return (
                  bluewayIterator.properties.Waterbody == blueway.properties.Waterbody &&
                  bluewayIterator.properties.RiverOrderNumber == blueway.properties.RiverOrderNumber - 1
                )
              })
              const previousPutIn = previousPutInIndex != -1 ? blueways.features[previousPutInIndex] : null
              if (
                (blueway.properties['Miles to Next'] != '' &&
                  blueway.properties['Miles to Next'] != '-' &&
                  ((blueway.properties['Miles to Next'] >= from && to === 10) ||
                    (blueway.properties['Miles to Next'] >= from && blueway.properties['Miles to Next'] <= to))) ||
                (previousPutIn &&
                  previousPutIn.properties['Miles to Next'] != '' &&
                  previousPutIn.properties['Miles to Next'] != '-' &&
                  previousPutIn.properties['Miles to Next'] >= from &&
                  previousPutIn.properties['Miles to Next'] <= to)
              ) {
                hasMatchingDistance = true
              }

              return hasMatchingWaterbody && hasMatchingDifficulty && hasMatchingDistance
            })

            sortBluewaysByNumber()
            sortBluewaysAlphabetically()
            resetLocationList()
            filterMarkers()
          }

          // Add matching blueways to search results
          function forwardGeocoder(query) {
            const matchingFeatures = []
            for (let i = 0; i < blueways.features.length; i++) {
              const feature = blueways.features[i]
              if (feature.properties.Name.toLowerCase().search(query.toLowerCase()) !== -1) {
                feature['place_name'] = '🛶  ' + feature.properties.Name
                if (feature.properties.Long !== undefined && feature.properties.Lat !== undefined) {
                  feature['center'] = [feature.properties.Long, feature.properties.Lat]
                } else {
                  feature['center'] = feature.geometry.coordinates
                  feature['place_type'] = ['park']
                  matchingFeatures.push(feature)
                }
              }
            }
            return matchingFeatures
          }

          // Clear all popups
          function clearPopups() {
            const popUps = document.getElementsByClassName('mapboxgl-popup')
            if (popUps[0]) popUps[0].remove()
          }

          // On marker click, fly to the point, add popup, and show listing in sidebar
          function handleMarkerClick(e, marker) {
            e.preventDefault()
            flyToBlueway(marker)
            createPopUp(marker)
            const activeItem = document.getElementsByClassName('active')
            if (activeItem[0]) {
              activeItem[0].classList.remove('active')
            }
            const listing = document.getElementById('listing-' + marker.properties.id)
            listing?.classList.add('active')
            showListing(marker)
            listing?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }

          // Add blueways after filtering
          function filterMarkers() {
            map.removeLayer('access-points')
            map.removeSource('blueways')
            addBlueways()
          }

          // Add a listing for each blueway to the sidebar
          function buildLocationList() {
            const listings = document.getElementById('listings')

            if (blueways.features.length === 0) {
              const noResults = listings?.appendChild(document.createElement('div'))
              if (noResults) {
                noResults.className = 'item'
                noResults.innerHTML = 'No results found'
              }
            }

            blueways.features.forEach(function (blueway, i) {
              const prop = blueway.properties

              // Add a new listing section to the sidebar
              const listing = listings?.appendChild(document.createElement('div'))
              if (listing) {
                listing.id = 'listing-' + prop.id
                listing.className = 'item'
              }

              // Add the link to the listing
              const link = listing?.appendChild(document.createElement('a'))
              if (link) {
                link.href = '#'
                // TODO get dis workin
                link.className = 'title'
                link.id = 'link-' + prop.id
                const riverOrderNumber = prop.RiverOrderNumber
                link.innerHTML = `${riverOrderNumber ? riverOrderNumber + ') ' : ''}${prop.Name}`
              }

              // Add waterbody to the listing
              const waterbody = listing?.appendChild(document.createElement('div'))
              if (waterbody) {
                waterbody.classList.add('mt-1')
                const protectLandName = prop.Name.toLowerCase()
                waterbody.innerHTML += `<strong>${protectLandName}</strong>`
              }

              // Add icons to the listing
              const icons = listing?.appendChild(document.createElement('div'))
              if (icons) {
                icons.className = 'listingIcons'
              }

              // Parking
              if (prop.Parking && prop.Parking.trim().toLowerCase() == 'yes') {
                const iconElement = icons?.appendChild(document.createElement('i'))
                if (iconElement) {
                  iconElement.className = 'fas fa-parking listingIcon'
                }
              }

              // Bathrooms
              if (prop.Bathrooms && prop.Bathrooms.trim().toLowerCase() !== 'no' && prop.Bathrooms.trim() !== '-') {
                const iconElement = icons?.appendChild(document.createElement('i'))
                if (iconElement) {
                  iconElement.className = 'fas fa-restroom listingIcon'
                }
              }

              // Kayak Access
              if (prop.KayakAcces && prop.KayakAcces.trim().toLowerCase() == 'yes') {
                const iconElement = icons?.appendChild(document.createElement('i'))
                if (iconElement) {
                  iconElement.outerHTML =
                    '<span class="material-symbols-outlined mr-1" style="font-size: 15px">kayaking</span>'
                }
              }

              // Boat Access
              if (
                prop['Boat Launch Surface'] &&
                prop['Boat Launch Surface'].trim().toLowerCase() !== 'no' &&
                prop['Boat Launch Surface'].trim() !== '-'
              ) {
                const iconElement = icons?.appendChild(document.createElement('i'))
                if (iconElement) {
                  iconElement.className = 'fas fa-ship listingIcon'
                }
              }

              // Add distance from location or searched location to the listing
              if (prop.distance) {
                const distance = listing?.appendChild(document.createElement('div'))
                const roundedDistance = Math.round(prop.distance * 100) / 100
                distance.innerHTML += '<p><strong>' + roundedDistance + ' miles away</strong></p>'
              }

              // Add details to the listing
              const details = listing?.appendChild(document.createElement('div'))
              if (details) {
                // Add address to the listing
                const address = listing?.appendChild(document.createElement('div'))
                if (address && prop.Address && prop.Address.trim() !== '' && prop.Address.trim() !== '-') {
                  details.innerHTML += '<p><strong>Location:</strong> ' + prop.Address + '</p>'
                }
                const description = listing?.appendChild(document.createElement('div'))
                if (
                  description &&
                  prop.Description &&
                  prop.Description.trim() !== '' &&
                  prop.Description.trim() !== '<Null>'
                ) {
                  details.innerHTML += '<p><strong>Description:</strong> ' + prop.Description + '</p>'
                }
                const miles = listing?.appendChild(document.createElement('div'))
                if (miles && prop['Miles to Next'] && prop['Miles to Next'] !== 0) {
                  details.innerHTML +=
                    '<p><strong>Miles To Next Access Point:</strong> ' + prop['Miles to Next'] + '</p>'
                }
                const putIn = listing?.appendChild(document.createElement('div'))
                if (putIn && prop['Put in (River side)'] && prop['Put in (River side)'].trim() !== '') {
                  details.innerHTML += '<p><strong>Put In:</strong> ' + prop['Put in (River side)'] + '</p>'
                }
                const takeOut = listing?.appendChild(document.createElement('div'))
                if (takeOut && prop.TakeOut && prop.TakeOut.trim() !== '') {
                  details.innerHTML += '<p><strong>Take Out:</strong> ' + prop.TakeOut + '</p>'
                }
                const paddle = listing?.appendChild(document.createElement('div'))
                if (paddle && prop.Paddle && prop.Paddle.trim() !== '') {
                  details.innerHTML += '<p><strong>Paddle:</strong> ' + prop.Paddle + '</p>'
                }
                const difficulty = listing?.appendChild(document.createElement('div'))
                if (difficulty && prop.Difficulty && prop.Difficulty.trim() !== '') {
                  details.innerHTML += '<p><strong>Difficulty:</strong> ' + prop.Difficulty + '</p>'
                }
                const tubing = listing?.appendChild(document.createElement('div'))
                if (tubing && prop.Tubing && prop.Tubing.trim() !== '') {
                  details.innerHTML += '<p><strong>Tubing:</strong> ' + prop.Tubing + '</p>'
                }
                const website = listing?.appendChild(document.createElement('div'))
                if (website && prop.Website && prop.Website.trim() !== '' && prop.Website.trim() !== '-') {
                  details.innerHTML +=
                    '<p><strong>Website:</strong> <a class="underline" href="' +
                    prop.Website +
                    '" target="_blank">' +
                    prop.Website +
                    '</a></p>'
                }
                details.className = 'hidden listingDesc'
              }

              // Fly to blueway, create new popup, and highlight sidebar listing
              link?.addEventListener('click', function (e) {
                e.preventDefault()
                const activeItem = document.getElementsByClassName('active')
                if (activeItem[0]) {
                  activeItem[0].classList.remove('active')
                }
                this.parentNode?.classList.add('active')
                for (let i = 0; i < blueways.features.length; i++) {
                  if (this.id === 'link-' + blueways.features[i].properties.id) {
                    const clickedListing = blueways.features[i]
                    flyToBlueway(clickedListing)
                    createPopUp(clickedListing)
                    showListing(clickedListing)
                  }
                }
              })

              // Fly to blueway, create new popup, and highlight sidebar listing
              link?.addEventListener('touchstart', function (e) {
                e.preventDefault()
                const activeItem = document.getElementsByClassName('active')
                if (activeItem[0]) {
                  activeItem[0].classList.remove('active')
                }
                this.parentNode?.classList.add('active')
                for (let i = 0; i < blueways.features.length; i++) {
                  if (this.id === 'link-' + blueways.features[i].properties.id) {
                    const clickedListing = blueways.features[i]
                    flyToBlueway(clickedListing)
                    createPopUp(clickedListing)
                    showListing(clickedListing)
                  }
                }
              })
            })
          }

          // Remove current listings, reset distance, and build new listings
          function resetLocationList() {
            const listings = document.getElementById('listings')
            while (listings?.firstChild) {
              listings.removeChild(listings.firstChild)
            }

            blueways.features.forEach(function (blueway, i) {
              const prop = blueway.properties
              if (prop.distance) {
                prop.distance = undefined
              }
            })

            buildLocationList()
          }

          // Use Mapbox GL JS's `flyTo` to move the camera smoothly a given center point
          function flyToBlueway(blueway) {
            if (blueway.properties.Long !== undefined && blueway.properties.Lat !== undefined) {
              map.flyTo({
                center: {
                  lng: blueway.properties.Long,
                  lat: blueway.properties.Lat,
                },
                zoom: 16,
                bearing: 0,
                pitch: 0,
              })
            } else {
              map.flyTo({
                center: blueway.geometry.coordinates,
                zoom: 16,
                bearing: 0,
                pitch: 0,
              })
            }
          }

          // Create a Mapbox GL JS `Popup`
          function createPopUp(blueway) {
            clearPopups()
            let coordinates
            if (blueway.properties.Long !== undefined && blueway.properties.Lat !== undefined) {
              coordinates = [blueway.properties.Long, blueway.properties.Lat]
              // Ensure that if the map is zoomed out such that multiple
              // copies of the feature are visible, the popup appears
              // over the copy being pointed to.
              while (Math.abs(blueway.properties.Long - coordinates[0]) > 180) {
                coordinates[0] += blueway.properties.Long > coordinates[0] ? 360 : -360
              }
            } else {
              coordinates = blueway.geometry.coordinates.slice()
              // Ensure that if the map is zoomed out such that multiple
              // copies of the feature are visible, the popup appears
              // over the copy being pointed to.
              while (Math.abs(blueway.geometry.coordinates[0] - coordinates[0]) > 180) {
                coordinates[0] += blueway.geometry.coordinates[0] > coordinates[0] ? 360 : -360
              }
            }

            const popupOffsets = {
              top: [0, 0],
              'top-left': [0, 20],
              'top-right': [0, 20],
              bottom: [0, 29],
              'bottom-left': [0, 29],
              'bottom-right': [0, 29],
              left: [15, 19],
              right: [-15, 19],
            }
            let popupHtml = ``
            if (blueway.properties.FeatureImage && blueway.properties.FeatureImage.trim() !== '') {
              popupHtml += `<img class="popupImage" src="${blueway.properties.FeatureImage}">`
            }
            const riverOrderNumber = blueway.properties.RiverOrderNumber
            popupHtml += `<h3>${riverOrderNumber ? riverOrderNumber + ') ' : ''}${blueway.properties.Name}</h3>`
            const protectLandName = blueway.properties.Name.toLowerCase()
            popupHtml += `<h4 class="pt-2 pb-1"><strong>${protectLandName}</strong></h4>`
            if (blueway.properties.Portage && blueway.properties.Portage.trim() !== '') {
              popupHtml += `<h4 class="pb-1"><strong>Portage:</strong> ${blueway.properties.Portage}</h4>`
            }
            if (
              blueway.properties.Address &&
              blueway.properties.Address.trim() !== '' &&
              blueway.properties.Address.trim() !== '-'
            ) {
              popupHtml += `<h4 class="pb-1"><strong>Location:</strong> ${blueway.properties.Address}</h4>`
            }
            if (blueway.properties.Rentals && blueway.properties.Rentals.trim() !== '') {
              popupHtml += `<h4 class="pb-1"><strong>Rentals:</strong> ${blueway.properties.Rentals}</h4>`
            }
            const popup = new mapboxgl.Popup({
              offset: popupOffsets,
              closeOnClick: true,
            })
              .setLngLat(coordinates)
              .setHTML(popupHtml)
              .addTo(map)
          }

          // Hide shown sidebar listings
          function hideShownItems() {
            const shownItems = document.querySelectorAll('.shown')
            shownItems.forEach((item) => {
              item.classList.add('hidden')
              item.classList.remove('shown')
            })
          }

          // Hide active sidebar listings
          function hideActiveItems() {
            const activeItems = document.querySelectorAll('.active')
            activeItems.forEach((item) => {
              item.classList.remove('active')
            })
          }

          // Show description and photos
          function showListing(blueway) {
            const listing = document.getElementById('listing-' + blueway.properties.id)
            hideShownItems()
            const activeHiddenItems = document.querySelectorAll('.active .hidden')
            activeHiddenItems.forEach((item) => {
              item.classList.remove('hidden')
              item.classList.add('shown')
            })
            fetchPhotos(blueway)
            listing?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }

          // Fetch photos for single blueway
          function fetchPhotos(blueway) {
            const bluewayListing = document.getElementById('listing-' + blueway.properties.id)

            // If photos have already been populated, do not fetch again
            if (bluewayListing?.querySelector('.listingPhotos')) {
              return
            }

            const photosElement = document.createElement('div')
            photosElement.className = 'listingPhotos shown'

            const coverPhotoLink = blueway.properties.CoverPhoto
            const photosLinks = blueway.properties.Photos

            const lightboxLinks = []
            const lightboxElements = []

            if (coverPhotoLink && coverPhotoLink.trim() !== '') {
              const idMatch = coverPhotoLink.match(/\/d\/(.*?)\/view/)
              if (idMatch) {
                const id = idMatch[1]
                const newUrl = `https://lh3.googleusercontent.com/d/${id}=w2396-h1646-iv1`
                lightboxLinks.push(newUrl)
                const newButton = document.createElement('button')
                newButton.addEventListener('click', function () {
                  lightbox.open()
                })

                const img = document.createElement('img')
                img.setAttribute('src', newUrl)
                img.setAttribute('class', 'listingImage')

                newButton.appendChild(img)
                photosElement.appendChild(newButton)
              } else {
                console.error('No id match')
              }
              bluewayListing?.appendChild(photosElement)
            }

            if (photosLinks && photosLinks.trim() !== '') {
              if (photosLinks.includes(',')) {
                const photoArray = photosLinks.split(',')
                for (let i = 0; i < photoArray.length; i++) {
                  const idMatch = photoArray[i].match(/\/d\/(.*?)\/view/)
                  if (idMatch) {
                    const id = idMatch[1]
                    const newUrl = `https://lh3.googleusercontent.com/d/${id}=w2396-h1646-iv1`
                    lightboxLinks.push(newUrl)
                  } else {
                    console.error('No id match')
                  }
                }
              } else {
                const idMatch = photosLinks.match(/\/d\/(.*?)\/view/)
                if (idMatch) {
                  const id = idMatch[1]
                  const newUrl = `https://lh3.googleusercontent.com/d/${id}=w2396-h1646-iv1`
                  lightboxLinks.push(newUrl)
                } else {
                  console.error('No id match')
                }
              }
            } else {
              console.error('No additional photos found')
            }

            lightboxLinks.forEach((link) => {
              lightboxElements.push({ href: link, type: 'image' })
            })
            lightbox.setElements(lightboxElements)
          }

          // Scroll to top of sidebar listings
          function scrollToTopOfListings() {
            const listings = document.querySelector('#listings')
            listings?.scrollTo({
              top: 0,
              left: 0,
              behavior: 'smooth',
            })
          }

          // Sort blueways by river order number
          function sortBluewaysByNumber() {
            blueways.features.sort(function (a, b) {
              const aRiverOrderNumber =
                parseInt(a.properties.RiverOrderNumber) !== NaN ? a.properties.RiverOrderNumber : 0
              const bRiverOrderNumber =
                parseInt(b.properties.RiverOrderNumber) !== NaN ? b.properties.RiverOrderNumber : 0
              return aRiverOrderNumber - bRiverOrderNumber
            })
          }

          function sortBluewaysAlphabetically() {
            blueways.features.sort(function (a, b) {
              const aName = a.properties.Name ? a.properties.Name.trim().toLowerCase() : ''
              const bName = b.properties.Name ? b.properties.Name.trim().toLowerCase() : ''
              if (aName > bName) {
                return 1
              }
              if (aName < bName) {
                return -1
              }
              return 0
            })
          }

          function sortBluewaysByDistance() {
            blueways.features.sort(function (a, b) {
              if (a.properties.distance > b.properties.distance) {
                return 1
              }
              if (a.properties.distance < b.properties.distance) {
                return -1
              }
              return 0
            })
          }

          // Reset map to default view
          function resetMap() {
            sortBluewaysByNumber()
            sortBluewaysAlphabetically()
            clearPopups()
            hideShownItems()
            hideActiveItems()
            resetLocationList()
            scrollToTopOfListings()
            geocoder.clear()

            map.flyTo({
              center: defaultCenter,
              zoom: defaultZoom,
              bearing: 0,
              pitch: 0,
            })
          }
        })
      },
    )
  }
})
