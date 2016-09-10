// Initialize a map with leaflet
var map = L.map('map', { 
  center: [40.740693, -74.004536], 
  zoom: 11,
  maxZoom: 18,
  inertia: false,
  tap: true
});
L.tileLayer(
  'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', 
  {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
  }).addTo(map);
  
let willWalk = mm(0.5);
let walkCircles = []; 
let stops = [];
let marker;
let markerCircle;
let stationPiesD3;

d3.json('complexesM.json', function(error, mta) {
  stops = mta.features.map(o => {
    o.properties.latlng = L.latLng(o.geometry.coordinates.reverse());
    return o.properties;
  }); 

  walkCircles = stops.map(o => L.circle(o.latlng, 100, 
    { 
      className: 'walk-circle', 
      stroke: false,
      fillOpacity: 1
    }));
  L.featureGroup(walkCircles).addTo(map);

  marker = L.marker([40.740693, -74.004536], { draggable: 'true' })
    .addTo(map)
    .on('drag', onDrag)
    .on('dragend', updateWalkingCircles); 
  markerCircle = L.circle([40.740693, -74.004536], mm(0.5), 
    { 
      className: 'marker-circle',
      stroke: false,
      fillOpacity: 1
    }).addTo(map);

  const stationPies = stops.map(o => {
    const popupContent = document.createElement("div");
    const popupName = document.createElement("h1");
    const popupLines = o.serves.map(line => { 
      const temp = new Image(20, 20);
      temp.src = 'lineImages/' + line + '.png';
      return temp;
    })
    
    popupName.appendChild(document.createTextNode(o.name));
    popupContent.appendChild(popupName);
    popupLines.forEach(l => { popupContent.appendChild(l); })
    
    const popup = L.popup({ closeButton: false, autoPan: false })
      .setLatLng(o.latlng)
      .setContent(popupContent);
      
    const tempIcon = L.divIcon({
      className: 'stop-icon', 
      iconSize: 15,
      html: '<svg class="stop-svg" viewBox="0 0 100 100"></svg>'
    });

    return L.marker(o.latlng, { icon: tempIcon })
      .on('mouseover', () => { popup.openOn(map); })
      .on('mouseout', () => { map.closePopup(); });
  })
  L.featureGroup(stationPies).addTo(map);
  stationPiesD3 = d3.selectAll('.stop-svg').data(stops);
  makePies();
  updateWalkingCircles();
  //onDrag();
  onZoom();
}); // end of d3.json

function makePies() {
  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(50)
    .startAngle(0);    

  stationPiesD3.selectAll('slices')
    .data(d => d.colors).enter()
    .append('path')
    .attr('transform', 'translate(50,50)')
    .attr('d', (d, i, j) => arc({ endAngle: 2 * Math.PI * (1 - i / j.length)}))
    .attr('fill', d => d)
}

// This happens as soon as the distance slider is moved
document.getElementById('distBar').addEventListener('input', distChange);
function distChange(){
  document.getElementById('distText').innerHTML = document.getElementById('distBar').value;
  willWalk = mm(document.getElementById('distBar').value);

  markerCircle.setRadius(willWalk);
  updateWalkingCircles();
}

map.on('click', onMapClick);
function onMapClick(e) {
  marker.setLatLng(e.latlng);
  onDrag();
  updateWalkingCircles();
}

function onDrag() {
  markerCircle.setLatLng(marker.getLatLng());
  //updateWalkingCircles();
}

const visited = [];
const walkFromLine = []; 
function updateWalkingCircles() {
  walkFromLine.fill(0);
  while (visited.length) {
    visited.pop().setRadius(0);
  }
    
  walkCircles.forEach((o, i) => {
  
    if ( o.getLatLng().distanceTo(marker.getLatLng()) <= willWalk ) {
      stops[i].servesIndex.forEach(l => {
        walkFromLine[l] = Math.max(
          walkFromLine[l] || 0, 
          willWalk - o.getLatLng().distanceTo(marker.getLatLng())
        )
      });
    }
    
  })
  
  walkFromLine[0]=0;
  walkCircles.forEach((o, i) => {
    const newWalkRadius = Math.max(...stops[i].servesIndex.map(l => walkFromLine[l] || 0));
    
    visited.push(o);
    o.setRadius(newWalkRadius);
  })
  
}

map.on('zoomend', onZoom);
const zoomLookup = ['20%', '20%','20%','20%','20%','20%','20%','20%','20%',
  '20%','20%','20%','20%','40%','40%','40%','40%','100%','100%']
function onZoom(e) {
  stationPiesD3.attr('width', zoomLookup[map.getZoom()])
}

function helpClick(){
  document.getElementById('helpDiv').style.display = 'none';
  if (document.getElementById('helpCheckbox').checked) {
    document.getElementById('helpDiv').style.display = 'block';
  }
}

function gotItClick() {
  document.getElementById('helpCheckbox').checked = false;
  document.getElementById('helpDiv').style.display = 'none';
}

function mm(miles) {
  return miles * 1609.34;
}

// Leaving this here because it shows the 'servesIndex' conversion
// var lineLookup = ['x0','x1','x2','x3','x4','x5','x6','x7','A','C','E','L','S','B','D',
//                   'F','M','N','Q','R','J','Z','G','W'];