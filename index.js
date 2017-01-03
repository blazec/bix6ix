//mapboxgl.accessToken = 'pk.eyJ1IjoiYmNhbGF5Y2F5IiwiYSI6ImNpdDNiZ3kyNTB1YjkyenFwNW1ydnJzNTcifQ._O_mLliIblnxVLyipCshMQ';
mapboxgl.accessToken = 'pk.eyJ1Ijoic3BvdDI0OTIiLCJhIjoiY2l0NG01MW1yMDBkazd3bGU1cWZlcHd3dSJ9._vbd5XNelE9l-caFJcawLA';
proxyURL = 'https://jsonp.afeld.me/?callback=?&url=';
bikeStationsURL = proxyURL + 'http://feeds.bikesharetoronto.com/stations/stations.json';

bikeStations = {};
linesDrawn = 0;
originCoordinates = null;
destCoordinates = null;
originBikeStationCoordinates = [];
destBikeStationCoordinates = [];

/* Converts the array of Bike Share stations to a point feature collection*/
function convertBikeStationsToFeatureCollection(stations) {

	featureCollection = {
		"type": "FeatureCollection",
		"features": [] };

	stations.forEach( function(station) {
		
		var feature = {
			"type": "Feature",
			"geometry": {
				"type": "Point",
				"coordinates": [station.longitude, station.latitude]
			}
		};

		feature.properties = station;
		featureCollection.features.push(feature);
	});

	return featureCollection;

}


function generateDirectionQuery(mode, origLng, origLat, destLng, destLat, accessToken=mapboxgl.accessToken) {

	return 'https://api.mapbox.com/directions/v5/mapbox/' 
			+ mode + '/'
			+ origLng + "," + origLat + ";" 
			+ destLng + "," + destLat + 
			'?geometries=geojson&steps=true&access_token=' + accessToken;
}


function generateGeocodingQuery(query ,mode='mapbox.places', accessToken=mapboxgl.accessToken) {
		return 'https://api.mapbox.com/geocoding/v5/' 
			+ mode + '/'
			+ query + '.json'
			+ '?access_token=' + accessToken;
}

/**
This function adds a layer showing the route linestring between origin and destination
originCoordinates and destinationCoordinates are both an array of [lng,lat] coordinates.
mode is the mode of transportation according to the MapBox Directions API (e.g. 'walking', 'cycling').
originName and destName are station names as given by Bike Share Toronto
name is for layer naming purposes.
*/
function showDirectionLineAndDetails(originCoordinates, destinationCoordinates, originName, destName, mode, name) {

	var directionQuery = generateDirectionQuery(mode, 
						originCoordinates[0], originCoordinates[1],
						destinationCoordinates[0], destinationCoordinates[1]);
	
	var layerName = 'directions-' + name;
	stepsData = {};
	$('.instruction-header-cycling').remove();
	$('.instruction-header-walking').remove();
	$('.instruction').remove();


	$.getJSON(directionQuery, function(data) {
		
		directions = data;

		if (data.code == "NoRoute") {
			alert("No route found!");
			stepsData = {};
			linesDrawn = 0;

			if ( !(map.getSource('directions-cycling1') === undefined) ) {
				map.removeSource('directions-cycling1');
				map.removeLayer('directions-cycling1');
			}

			if ( !(map.getSource('directions-walking1') === undefined) ) {
				map.removeSource('directions-walking1');
				map.removeLayer('directions-walking1');
			}

			if ( !(map.getSource('directions-walking2') === undefined) ) {
				map.removeSource('directions-walking2');
				map.removeLayer('directions-walking2');
			}

			// Remove highlighted markers if they exist
			if ( !(map.getSource('stations') === undefined) ) {
				map.removeSource('stations');
				map.removeLayer('stations');
			}

					//remove destination marker if it exists

			if ( !(map.getSource('destination') === undefined) ) {
				map.removeSource('destination');
				map.removeLayer('destination');
			}

			if ($('.instruction-container').css('right', '0%'))
				$('.instruction-container').animate({right: '-35%'}, 'slow');

			$('.instruction-header-cycling').remove();
			$('.instruction-header-walking').remove();
			$('.instruction').remove();


			return;
		}

		linesDrawn++;

		var directionsLineFeatureCollection = 
				{"type": "FeatureCollection",
				"features": [
					{"type": "Feature",
					'properties': {}}
					]
				};

		directionsLineFeatureCollection.features[0].geometry = directions.routes[0].geometry;		

				/* Remove direction lines if they exist */
		if ( !(map.getSource(layerName) === undefined) ) {
			map.removeSource(layerName);
			map.removeLayer(layerName);
		}

		map.addSource(layerName, {
			'type': 'geojson',
			'data': directionsLineFeatureCollection
		});

		map.addLayer({
			'id': layerName,
			'type': 'line',
			'source': layerName,
	        "layout": {
	            "line-join": "round",
	            "line-cap": "round",
	            "visibility": "none"
	        },
	        "paint": {
	            "line-color": mode != 'walking' ? "#2b8cbe" : "#fd8d3c",
	            "line-width": mode != 'walking' ? 4 : 5,
	            "line-opacity": .85,//i != 1 ? .85 : .85
	            
	        }
		}, 'stations');

		// We make the layers visible only if the three directions were found
		if (linesDrawn == 3) {
			console.log(linesDrawn);

			if ( !(map.getSource('stations') === undefined) ) {
				map.removeSource('stations');
				map.removeLayer('stations');
			}

			map.addSource('stations',{
				'type': 'geojson',
				'data': featureCollection
			});

			map.addLayer({
				'id':'stations',
				'type': 'symbol',
				'source': 'stations',
				'layout': {
				 	"icon-image": 'mark-green',
					"icon-size" : 1.5,
					"text-field": "{availableBikes}",
				    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
				    "text-size" : 10, 
					"text-anchor": "bottom"
				},
			});

			//Destination markers	 
			featureCollectiond = {
				"type": "FeatureCollection",
				"features": [] };

			var feature = {
				"type": "Feature",
				"geometry": {
				"type": "Point",
				"coordinates": destCoordinates
					}
				};

			featureCollectiond.features.push(feature);

			if ( !(map.getSource('destination') === undefined) ) {
				map.removeSource('destination');
				map.removeLayer('destination');
			}

			map.addSource('destination',{
				'type': 'geojson',
				'data': featureCollectiond
			});

			map.addLayer({
				'id':'destination',
				'type': 'symbol',
				'source': 'destination',
				'layout': {
				 	"icon-image": 'marker-pink',
					"icon-size" : 2,
					
				}, 
			});

			if (map.getLayoutProperty('directions-cycling1', 'visibility') == 'none')
				map.setLayoutProperty('directions-cycling1', 'visibility', 'visible');
			if (map.getLayoutProperty('directions-walking1', 'visibility') == 'none')
				map.setLayoutProperty('directions-walking1', 'visibility', 'visible');
			if (map.getLayoutProperty('directions-walking2', 'visibility') == 'none')
				map.setLayoutProperty('directions-walking2', 'visibility', 'visible');

			linesDrawn = 0;
		}
		// Get steps from server's JSON response
		stepsData[layerName] = {};
		stepsInLayer = stepsData[layerName];
		stepsInLayer['instructions'] = [];
		stepsInLayer['duration'] = [];
		stepsInLayer['distance'] = [];
		stepsInLayer['totalDuration'] = 0;
		stepsInLayer['totalDurationUnit'] = '';
		stepsInLayer['totalDistance'] = 0;
		stepsInLayer['totalDistanceUnit'] = '';
		stepsInLayer['originName'] = originName;
		stepsInLayer['destName'] = destName; 

		steps = directions.routes[0].legs[0].steps;

		// total in minutes
		totalDuration = directions.routes[0].duration;
		totalDistance = directions.routes[0].distance;

		totalDurationInMinutes = Math.ceil(totalDuration / 60);
		totalDistanceInKm = (totalDistance / 1000).toFixed(1);

		if (totalDuration > 59) {
			stepsInLayer.totalDuration = totalDurationInMinutes;
			stepsInLayer.totalDurationUnit = 'minutes';
		}
		else {
			stepsInLayer.totalDuration = totalDuration;
			stepsInLayer.totalDurationUnit = 'seconds';
		}

		if (totalDistance > 999) {
			stepsInLayer.totalDistance = totalDistanceInKm;
			stepsInLayer.totalDistanceUnit = 'kilometers';
		}
		else {
			stepsInLayer.totalDistance = totalDistance;
			stepsInLayer.totalDistanceUnit = 'meters';
		}


		// Add instructions, duration, and distance for each layer
		steps.forEach( function(step) {
			stepsInLayer['instructions'].push(step.maneuver.instruction);
			stepsInLayer['duration'].push(step.duration);
			stepsInLayer['distance'].push(step.distance);
		});


		if (Object.keys(stepsData).length == 3) {
			// Show steps in this order
			var layerNames = ['directions-walking1', 'directions-cycling1', 'directions-walking2'];

			var instructionsContainer = $('.instruction-container');

			layerNames.forEach( function(layerName) {

				currentSteps = stepsData[layerName];
				currMode = layerName == 'directions-cycling1' ? 'Bike' : 'Walk';

				headerContent = currMode + " " + "from " + currentSteps.originName + " to " + currentSteps.destName
								+ "<br><br>" + currentSteps.totalDistance + " " + currentSteps.totalDistanceUnit + "&nbsp; &nbsp;" 
								+ currentSteps.totalDuration + " " + currentSteps.totalDurationUnit;

				if (layerName == 'directions-cycling1') {

					header = "<div class='instruction-header-cycling'>"
							+ headerContent
							+ "</div>";
					instructionsContainer.append(header);
				}
				else {
					header = "<div class='instruction-header-walking'>"
							+ headerContent
							+ "</div>";
					instructionsContainer.append(header);
				}

				instructionsArray = currentSteps.instructions;

				instructionsArray.forEach( function(instr, i) {

					dist = (currentSteps.distance[i] >= 1000 ? (currentSteps.distance[i] / 1000).toFixed(2) : currentSteps.distance[i]);
					distUnit = (currentSteps.distance[i] >= 1000 ? "kilometers" : "meters");
					duration = currentSteps.duration[i] >= 60 ? Math.ceil(currentSteps.duration[i] / 60) :  currentSteps.duration[i];
					durationUnit = currentSteps.duration[i] >= 60 ? "minutes" : "seconds";

					instruction = "<div class='instruction'>" + instr + "<br/><span class='duration-and-distance'>" 
											+ (duration == 0 ? "" : duration) + " " + (duration == 0 ? "" : durationUnit) + "&nbsp; &nbsp;"
											+ (dist == 0 ? "" : dist) + " " + (dist == 0 ? "" : distUnit);
											+ "</span>"
											+ "</div>";
					instructionsContainer.append(instruction);

				});

			});

			// Add a blank div in the bottom so as instructions not obscured by Mapbox copyright
			instructionsContainer.append("<div class='instruction'></div>");

			// animate instructions
			$('.instruction-container').animate({right: '0%'}, 'slow');
			$('.exit-button').css("visibility", "visible");
			map.flyTo({
				center: originCoordinates,
				zoom: 15,
				speed: 0.7
			});
		}


	});

}

/**
Returns the coordinates of the nearest bike station from locationCoordinates 
*/
function getNearestBikeStationWithAvailableBikes(locationCoordinates, bikeStationsFeatureCollection) {

	var nearestBikeStation = turf.nearest(locationCoordinates, bikeStationsFeatureCollection);
	var removedBikeStations = [];

	var stationList = bikeStationsFeatureCollection.features;

	/* Get the nearest station with available bikes */
	while (nearestBikeStation.properties.availableBikes == 0) {
		var id = nearestBikeStation.properties.id;
		
		/* Remove original nearest bike station from array and run nearest again */
		for (i = 0; i < stationList.length; i++) {
			if (stationList[i].properties.id == id) {
				removedBikeStations.push(stationList[i]);
				stationList.splice(i, 1);
				break;
			}
		}

		if (stationList.length == 0){
			alert('No bike station found!');
			break;
		}
		nearestBikeStation = turf.nearest(locationCoordinates, bikeStationsFeatureCollection);

	}
	
	// Put the removed stations back to the list
	removedBikeStations.forEach( function(bikeStation) {
		stationList.push(bikeStation);
	});
	

	return nearestBikeStation;
}


function getNearestBikeStationWithAvailableDocks(locationCoordinates, bikeStationsFeatureCollection) {

	var nearestBikeStation = turf.nearest(locationCoordinates, bikeStationsFeatureCollection);
	var removedBikeStations = [];

	var stationList = bikeStationsFeatureCollection.features;

	/* Get the nearest station with available bikes */
	while (nearestBikeStation.properties.availableDocks == 0) {

		var id = nearestBikeStation.properties.id;
		
		/* Remove original nearest bike station from array and run nearest again */
		for (i = 0; i < stationList.length; i++) {
			if (stationList[i].properties.id == id) {
				removedBikeStations.push(stationList[i]);
				stationList.splice(i, 1);
				break;
			}
		}

		if (stationList.length == 0){
			alert('No bike station found!');
			break;
		}
		nearestBikeStation = turf.nearest(locationCoordinates, bikeStationsFeatureCollection);
	}
	
	// Put the removed stations back to the list
	removedBikeStations.forEach( function(bikeStation) {
		stationList.push(bikeStation);
	});
	

	return nearestBikeStation;
}

// an object with format {address: [lng,lat]}
var originAddressToCoordinates = {};

// Auto complete Origin and get coordinates if address found
$('#origin').on('input', function() {
	originCoordinates = null;
	var inputOrigin = $('#origin').val();
	geocodingQuery = generateGeocodingQuery(inputOrigin);

	if (originAddressToCoordinates.hasOwnProperty(inputOrigin)) {
		originCoordinates = originAddressToCoordinates[inputOrigin];
		return;
	}

	$.getJSON(geocodingQuery, function(geocodingData) {
		
		$('option').remove();
		var dataList = $('#origin-list');

		var addresses = geocodingData.features;

		/* add addresses to dropdown menu */
		addresses.forEach( function(feature) {
			dataList.append($("<option></option>").attr("value", feature.place_name));
			// update addressToCoordinates container
			originAddressToCoordinates[feature.place_name] = feature.geometry.coordinates;
		});

		if (originAddressToCoordinates.hasOwnProperty(inputOrigin)) {
			originCoordinates = originAddressToCoordinates[inputOrigin];
		}

	});	
});

// an object with format {address: [lng,lat]}
var destAddressToCoordinates = {};

// Auto complete destination and get coordinates if address found
$('#destination').on('input', function() {
	destCoordinates = null;
	var inputDestination = $('#destination').val();
	geocodingQuery = generateGeocodingQuery(inputDestination);

	if (destAddressToCoordinates.hasOwnProperty(inputDestination)) {
		destCoordinates = destAddressToCoordinates[inputDestination];
		return;
	}

	$.getJSON(geocodingQuery, function(geocodingData) {
		$('option').remove();
		var dataList = $('#destination-list');

		var addresses = geocodingData.features;

		/* add addresses to dropdown menu */
		addresses.forEach( function(feature) {
			dataList.append($("<option></option>").attr("value", feature.place_name));
			// update addressToCoordinates container
			destAddressToCoordinates[feature.place_name] = feature.geometry.coordinates;
		});

		if (destAddressToCoordinates.hasOwnProperty(inputDestination)) {
			destCoordinates = destAddressToCoordinates[inputDestination];
		}

	});	

});

$(document).on('click', '.exit-button', function(e) {
	$('.instruction-container').animate({right: '-35%'}, 'slow');
	if ($('.exit-button').is(":visible")) {
		$('.exit-button').css("visibility", "hidden");
	}
	else {
		$('.exit-button').css("visibility", "visible");
	}
});

$(document).on('click', '#toggle-cycling', function(e) {
	var visibility = map.getLayoutProperty('directions-cycling1', 'visibility');

	if (visibility == 'visible' || visibility === undefined)
		map.setLayoutProperty('directions-cycling1', 'visibility', 'none');
	else
		map.setLayoutProperty('directions-cycling1', 'visibility', 'visible');

});

$(document).on('click', '#toggle-walking', function(e) {
	var visibility = map.getLayoutProperty('directions-walking1', 'visibility');

	if (visibility == 'visible' || visibility === undefined) {
		map.setLayoutProperty('directions-walking1', 'visibility', 'none');
		map.setLayoutProperty('directions-walking2', 'visibility', 'none');
	}
	else {
		map.setLayoutProperty('directions-walking1', 'visibility', 'visible');
		map.setLayoutProperty('directions-walking2', 'visibility', 'visible');
	}

});

// Show Directions
$('#getDirectionsButton').on('click', function() {
	console.log(originCoordinates);
	if (originCoordinates && destCoordinates){
		var originBikeStation = getNearestBikeStationWithAvailableBikes(originCoordinates, bikeStations);
		var destBikeStation = getNearestBikeStationWithAvailableDocks(destCoordinates, bikeStations);

		originBikeStationCoordinates = originBikeStation.geometry.coordinates;
		destBikeStationCoordinates = destBikeStation.geometry.coordinates;

		showDirectionLineAndDetails(originCoordinates, originBikeStationCoordinates, 'Origin', 'Bike Station at ' + originBikeStation.properties.stationName, 'walking', 'walking1');
		showDirectionLineAndDetails(destBikeStationCoordinates, destCoordinates, 'Bike Station at ' + destBikeStation.properties.stationName, 'Destination', 'walking', 'walking2');
		showDirectionLineAndDetails(originBikeStationCoordinates, destBikeStationCoordinates, 'Bike Station at ' +  originBikeStation.properties.stationName, 'Bike Station at ' + destBikeStation.properties.stationName, 'cycling', 'cycling1');
 
	 	//adding bikejourney markers 	 
		 var stations = [originBikeStation, destBikeStation]
		 	featureCollection = {
			"type": "FeatureCollection",
			"features": [] };

			stations.forEach( function(station) {
				
			featureCollection.features.push(station);

		});
	}
	else
		alert('Invalid origin and/or destination');
});



//Standard set up
var map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/spot2492/civye3b27002j2kotw0pkizmg',
  center: [-79.385811,43.655298],
  zoom: 13
});


map.on('style.load', function(){

   // Get realtime JSON data with fallback to local copy in case proxy is down
   $.ajax({
   		url: bikeStationsURL,
   		dataType: 'json',

   		success: function(data) {

	    	bikeStations = convertBikeStationsToFeatureCollection(data.stationBeanList);

		    map.addSource('bikeStations',{
			   'type': 'geojson',
			   'data': bikeStations
			 });

			map.addLayer({
			    'id':'bikeStations',
			    'type': 'symbol',
			    'source': 'bikeStations',
			    'layout': {
			    	"icon-image": 'marker-15',
		    		"icon-size" : 1.5,
		    		"text-field": "{availableBikes}",
		        	"text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
		        	"text-size" : 10, 
			    	"text-anchor": "bottom" //Changing this will put the text at the bottom of the marker
			    },
			});
   		},

   		error: function(data) {

   			bikeStations = bikeShareStations;
	   		map.addSource('bikeStations',{
			   'type': 'geojson',
			   'data': bikeStations
			});

			map.addLayer({
			    'id':'bikeStations',
			    'type': 'symbol',
			    'source': 'bikeStations',
			    'layout': {
			    	"icon-image": 'marker-15',
		    		"icon-size" : 1.5,
		        	"text-field": "{availableBikes}",
		        	"text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
		        	"text-size" : 10, 
			    	"text-anchor": "bottom" //Changing this will put the text at the bottom of the marker
			    },
			});
   		}

   });
 });

var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
});

map.on('mousemove', function(e) {
    var features = map.queryRenderedFeatures(e.point, { layers: ['bikeStations'] });
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';

    if (!features.length) {
        popup.remove();
        return;
    }

    var feature = features[0];

    // Populate the popup and set its coordinates
    // based on the feature found.
    popup.setLngLat(feature.geometry.coordinates)
        .setHTML(
   			"<center><b>" + feature.properties.stationName + "</b>" + "</center>"
   			+ "<br>"
   			+ "<table>"
			+ "<tr>" + "<td>" + "Available Bikes: " + "</td>" + "<td>" + feature.properties.availableBikes + "</td>"
			+ "<tr>" + "<td>" + "Available Docks: " + "</td>" + "<td>" + feature.properties.availableDocks + "</td>"
			+ "</table>"

			)
        .addTo(map);
});