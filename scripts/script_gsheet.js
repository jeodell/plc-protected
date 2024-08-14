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
let allProtectedLandsList = null

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

function controlFromSlider(fromSlider, toSlider, fromInput, fromSpan, filterProtectedLands) {
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
  filterProtectedLands()
}

function controlToSlider(fromSlider, toSlider, toInput, toSpan, filterProtectedLands) {
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
  filterProtectedLands()
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

  const filterByProtectedLand = document.querySelectorAll('#filter-by-protected-land input')
  const filterByDifficulty = document.querySelectorAll('#filter-by-difficulty input')

  // Fetch protected lands data from google sheets
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
      function (err, protectedLands) {
        if (err) {
          console.error(err)
        }

        allProtectedLandsList = { ...protectedLands }

        // Assign a unique id to each protected land to be associated with sidebar listing
        protectedLands.features.forEach(function (protectedLand, i) {
          protectedLand.properties.id = i
        })

        map.on('load', function (e) {
          // Add event listeners for filter by protected land checkboxes
          filterByProtectedLand.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
              if (checkbox.value === 'all') {
                filterByProtectedLand.forEach((checkbox) => {
                  checkbox.checked = false
                })
                checkbox.checked = true
              } else {
                document.querySelector('#filter-by-protected-land input[value="all"]').checked = false
                const filterByProtectedLandChecked = document.querySelectorAll(
                  '#filter-by-protected-land input:checked',
                )
                if (filterByProtectedLandChecked.length === 0) {
                  document.querySelector('#filter-by-protected-land input[value="all"]').checked = true
                }
              }
              filterProtectedLands()
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
              filterProtectedLands()
            })
          })

          // Add event listeners for filter by distance slider and input
          fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput, fromSpan, filterProtectedLands)
          toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput, toSpan, filterProtectedLands)
          fromInput.oninput = () => controlFromInput(fromSlider, fromInput, toInput, toSlider)
          toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider)

          map.loadImage(`../images/marker.png`, function (error, image) {
            if (error) throw error

            map.addImage('plc-marker', image)
          })

          addProtectedLands()

          // var bbox = turf.bbox(protectedLands)
          // map.fitBounds(bbox, { padding: 50 })

          // Show protected land popup when hovering marker
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
            protectedLands.features.forEach(function (protectedLand) {
              let coordinates
              if (protectedLand.properties.Long !== undefined && protectedLand.properties.Lat !== undefined) {
                coordinates = turf.point([protectedLand.properties.Long, protectedLand.properties.Lat])
              } else {
                coordinates = turf.point(protectedLand.geometry.coordinates)
              }
              Object.defineProperty(protectedLand.properties, 'distance', {
                value: turf.distance(searchResult, coordinates, options),
                writable: true,
                enumerable: true,
                configurable: true,
              })
            })
            sortProtectedLandsByDistance()

            const listings = document.getElementById('listings')
            while (listings?.firstChild) {
              listings.removeChild(listings.firstChild)
            }
            buildLocationList()
          })

          // Reset if geocoder is exited
          geocoder.on('clear', async function (ev) {
            sortProtectedLandsAlphabetically()
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
            protectedLands.features.forEach(function (protectedLand) {
              let coordinates
              if (protectedLand.properties.Long !== undefined && protectedLand.properties.Lat !== undefined) {
                coordinates = turf.point([protectedLand.properties.Long, protectedLand.properties.Lat])
              } else {
                coordinates = turf.point(protectedLand.geometry.coordinates)
              }
              Object.defineProperty(protectedLand.properties, 'distance', {
                value: turf.distance(searchResult, coordinates, options),
                writable: true,
                enumerable: true,
                configurable: true,
              })
            })
            protectedLands.features.sort(function (a, b) {
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
            createPopUp(protectedLands.features[0])

            // Highlight the listing for the closest protected land
            const activeListing = document.getElementById('listing-' + protectedLands.features[0].properties.id)
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

          sortProtectedLandsAlphabetically()

          buildLocationList()
          showResetMapButton()
          showShowFilterButton()

          function addProtectedLands() {
            // Add source for protectedLands
            map.addSource('protectedLands', {
              type: 'geojson',
              data: protectedLands,
            })

            map.addLayer({
              id: 'access-points',
              type: 'symbol',
              source: 'protectedLands',
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

          // Filter protectedLands
          function filterProtectedLands() {
            protectedLands = { ...allProtectedLandsList }

            const checkedProtectedLands = []
            for (const outerInput of filterByProtectedLand) {
              if (outerInput.value === 'all' && outerInput.checked && checkedProtectedLands.length === 0) {
                for (const innerInput of filterByProtectedLand) {
                  checkedProtectedLands.push(innerInput.value.toLowerCase())
                }
                break
              } else if (outerInput.checked) {
                checkedProtectedLands.push(outerInput.value.toLowerCase())
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

            protectedLands.features = protectedLands.features.filter((protectedLand) => {
              // Matching protected land
              const protectedLandName = protectedLand.properties.ProtectedLand
              let hasMatchingProtectedLand = false

              if (!protectedLandName || protectedLandName === undefined) {
                return false
              }

              if (checkedProtectedLands.includes(protectedLandName)) {
                hasMatchingProtectedLand = true
              }

              // Matching difficulty
              const protectedLandDifficulty = protectedLand.properties.Difficulty
              let hasMatchingDifficulty = false

              if (protectedLandDifficulty === undefined) {
                return false
              } else {
                if (checkedDifficulty.includes('all')) {
                  hasMatchingDifficulty = true
                } else {
                  if (checkedDifficulty.includes(protectedLandDifficulty.trim().toLowerCase())) {
                    hasMatchingDifficulty = true
                  }
                }
              }

              // Within distance
              const [from, to] = getParsed(fromInput, toInput)
              let hasMatchingDistance = false

              if (
                protectedLand.properties.Mileage != '' &&
                ((protectedLand.properties.Mileage >= from && to === 10) ||
                  (protectedLand.properties.Mileage >= from && protectedLand.properties.Mileage <= to))
              ) {
                hasMatchingDistance = true
              }

              return hasMatchingProtectedLand && hasMatchingDifficulty && hasMatchingDistance
            })

            sortProtectedLandsAlphabetically()
            resetLocationList()
            filterMarkers()
          }

          // Add matching protectedLands to search results
          function forwardGeocoder(query) {
            const matchingFeatures = []
            for (let i = 0; i < protectedLands.features.length; i++) {
              const feature = protectedLands.features[i]
              if (feature.properties.ProtectedLand.toLowerCase().search(query.toLowerCase()) !== -1) {
                // TODO change icon
                feature['place_name'] = '🛶  ' + feature.properties.ProtectedLand
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
            flyToProtectedLand(marker)
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

          // Add protectedLands after filtering
          function filterMarkers() {
            map.removeLayer('access-points')
            map.removeSource('protectedLands')
            addProtectedLands()
          }

          // Add a listing for each protected land to the sidebar
          function buildLocationList() {
            const listings = document.getElementById('listings')

            if (protectedLands.features.length === 0) {
              const noResults = listings?.appendChild(document.createElement('div'))
              if (noResults) {
                noResults.className = 'item'
                noResults.innerHTML = 'No results found'
              }
            }

            protectedLands.features.forEach(function (protectedLand, i) {
              const prop = protectedLand.properties

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
                link.className = 'title'
                link.id = 'link-' + prop.id
                link.innerText = prop.ProtectedLand
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
                if (prop.Address && prop.Address.trim() !== '') {
                  details.innerHTML += '<p><strong>Location:</strong> ' + prop.Address + '</p>'
                }

                // Add trailhead to the listing
                if (prop.Trailhead && prop.Trailhead.trim() !== '') {
                  details.innerHTML += '<p><strong>Trailhead:</strong> ' + prop.Trailhead + '</p>'
                }

                // Add state park to the listing
                if (prop.Park && prop.Park.trim() !== '') {
                  details.innerHTML += '<p><strong>Park:</strong> ' + prop.Park + '</p>'
                }

                // Add access to the listing
                if (prop.Access && prop.Access.trim() !== '') {
                  details.innerHTML += '<p><strong>Access:</strong> ' + prop.Access + '</p>'
                }

                // Add description to the listing
                if (prop.Description && prop.Description.trim() !== '') {
                  details.innerHTML += '<p><strong>Description:</strong> ' + prop.Description + '</p>'
                }

                // Add mileage to the listing
                if (prop.Mileage && prop.Mileage !== 0) {
                  details.innerHTML += '<p><strong>Miles:</strong> ' + prop.Mileage + '</p>'
                }

                // Add difficulty to the listing
                if (prop.Difficulty && prop.Difficulty.trim() !== '') {
                  details.innerHTML += '<p><strong>Difficulty:</strong> ' + prop.Difficulty + '</p>'
                }

                // Add website to the listing
                if (prop.Website && prop.Website.trim() !== '') {
                  details.innerHTML +=
                    '<p><strong>Website:</strong> <a class="underline" href="' +
                    prop.Website +
                    '" target="_blank">' +
                    prop.Website +
                    '</a></p>'
                }

                details.className = 'hidden listingDesc'
              }

              // Fly to protected land, create new popup, and highlight sidebar listing
              link?.addEventListener('click', function (e) {
                e.preventDefault()
                const activeItem = document.getElementsByClassName('active')
                if (activeItem[0]) {
                  activeItem[0].classList.remove('active')
                }
                this.parentNode?.classList.add('active')
                for (let i = 0; i < protectedLands.features.length; i++) {
                  if (this.id === 'link-' + protectedLands.features[i].properties.id) {
                    const clickedListing = protectedLands.features[i]
                    flyToProtectedLand(clickedListing)
                    createPopUp(clickedListing)
                    showListing(clickedListing)
                  }
                }
              })

              // Fly to protected land, create new popup, and highlight sidebar listing
              link?.addEventListener('touchstart', function (e) {
                e.preventDefault()
                const activeItem = document.getElementsByClassName('active')
                if (activeItem[0]) {
                  activeItem[0].classList.remove('active')
                }
                this.parentNode?.classList.add('active')
                for (let i = 0; i < protectedLands.features.length; i++) {
                  if (this.id === 'link-' + protectedLands.features[i].properties.id) {
                    const clickedListing = protectedLands.features[i]
                    flyToProtectedLand(clickedListing)
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

            protectedLands.features.forEach(function (protectedLand, i) {
              const prop = protectedLand.properties
              if (prop.distance) {
                prop.distance = undefined
              }
            })

            buildLocationList()
          }

          // Use Mapbox GL JS's `flyTo` to move the camera smoothly a given center point
          function flyToProtectedLand(protectedLand) {
            if (protectedLand.properties.Long !== undefined && protectedLand.properties.Lat !== undefined) {
              map.flyTo({
                center: {
                  lng: protectedLand.properties.Long,
                  lat: protectedLand.properties.Lat,
                },
                zoom: 16,
                bearing: 0,
                pitch: 0,
              })
            } else {
              map.flyTo({
                center: protectedLand.geometry.coordinates,
                zoom: 16,
                bearing: 0,
                pitch: 0,
              })
            }
          }

          // Create a Mapbox GL JS `Popup`
          function createPopUp(protectedLand) {
            clearPopups()
            let coordinates
            if (protectedLand.properties.Long !== undefined && protectedLand.properties.Lat !== undefined) {
              coordinates = [protectedLand.properties.Long, protectedLand.properties.Lat]
              // Ensure that if the map is zoomed out such that multiple
              // copies of the feature are visible, the popup appears
              // over the copy being pointed to.
              while (Math.abs(protectedLand.properties.Long - coordinates[0]) > 180) {
                coordinates[0] += protectedLand.properties.Long > coordinates[0] ? 360 : -360
              }
            } else {
              coordinates = protectedLand.geometry.coordinates.slice()
              // Ensure that if the map is zoomed out such that multiple
              // copies of the feature are visible, the popup appears
              // over the copy being pointed to.
              while (Math.abs(protectedLand.geometry.coordinates[0] - coordinates[0]) > 180) {
                coordinates[0] += protectedLand.geometry.coordinates[0] > coordinates[0] ? 360 : -360
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
            if (protectedLand.properties.FeatureImage && protectedLand.properties.FeatureImage.trim() !== '') {
              popupHtml += `<img class="popupImage" src="${protectedLand.properties.FeatureImage}">`
            }
            popupHtml += `<h3>${protectedLand.properties.ProtectedLand}</h3>`
            if (protectedLand.properties.Portage && protectedLand.properties.Portage.trim() !== '') {
              popupHtml += `<h4 class="pb-1"><strong>Portage:</strong> ${protectedLand.properties.Portage}</h4>`
            }
            if (protectedLand.properties.Address && protectedLand.properties.Address.trim() !== '') {
              popupHtml += `<h4 class="pb-1"><strong>Location:</strong> ${protectedLand.properties.Address}</h4>`
            }
            if (protectedLand.properties.Rentals && protectedLand.properties.Rentals.trim() !== '') {
              popupHtml += `<h4 class="pb-1"><strong>Rentals:</strong> ${protectedLand.properties.Rentals}</h4>`
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
          function showListing(protectedLand) {
            const listing = document.getElementById('listing-' + protectedLand.properties.id)
            hideShownItems()
            const activeHiddenItems = document.querySelectorAll('.active .hidden')
            activeHiddenItems.forEach((item) => {
              item.classList.remove('hidden')
              item.classList.add('shown')
            })
            fetchPhotos(protectedLand)
            listing?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }

          // Fetch photos for single protected land
          function fetchPhotos(protectedLand) {
            const protectedLandListing = document.getElementById('listing-' + protectedLand.properties.id)

            // If photos have already been populated, do not fetch again
            if (protectedLandListing?.querySelector('.listingPhotos')) {
              return
            }

            const photosElement = document.createElement('div')
            photosElement.className = 'listingPhotos shown'

            const coverPhotoLink = protectedLand.properties.CoverPhoto
            const photosLinks = protectedLand.properties.Photos

            const lightboxLinks = []
            const lightboxElements = []

            if (coverPhotoLink && coverPhotoLink.trim() !== '') {
              lightboxLinks.push(coverPhotoLink)
              const newButton = document.createElement('button')
              newButton.addEventListener('click', function () {
                lightbox.open()
              })

              const img = document.createElement('img')
              img.setAttribute('src', coverPhotoLink)
              img.setAttribute('class', 'listingImage')

              newButton.appendChild(img)
              photosElement.appendChild(newButton)
              protectedLandListing?.appendChild(photosElement)
            }

            if (photosLinks && photosLinks.trim() !== '') {
              if (photosLinks.includes(',')) {
                const photoArray = photosLinks.split(',')
                for (let i = 0; i < photoArray.length; i++) {
                  lightboxLinks.push(photoArray[i])
                }
              } else {
                lightboxLinks.push(photosLinks)
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

          function sortProtectedLandsAlphabetically() {
            protectedLands.features.sort(function (a, b) {
              const aProtectedLand = a.properties.ProtectedLand ? a.properties.ProtectedLand.trim().toLowerCase() : ''
              const bProtectedLand = b.properties.ProtectedLand ? b.properties.ProtectedLand.trim().toLowerCase() : ''
              if (aProtectedLand > bProtectedLand) {
                return 1
              }
              if (aProtectedLand < bProtectedLand) {
                return -1
              }
              return 0
            })
          }

          function sortProtectedLandsByDistance() {
            protectedLands.features.sort(function (a, b) {
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
            sortProtectedLandsAlphabetically()
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
