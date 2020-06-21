let shareImageButton = document.querySelector('#share-image-button');
let createPostArea = document.querySelector('#create-post');
let closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
let sharedMomentsArea = document.querySelector('#shared-moments');
let form = document.querySelector('form');
let titleInput = document.querySelector('#title');
let locationInput = document.querySelector('#location');
let videoPlayer = document.querySelector('#player');

let canvasElement = document.querySelector('#canvas');
let captureButton = document.querySelector('#capture-btn');

let imagePicker = document.querySelector('#image-picker');
let imagePickerArea = document.querySelector('#pick-image');

let locationBtn = document.querySelector('#location-btn');
let locationLoader = document.querySelector('#location-loader');

let picture,geocoder,city;

let fetchedLocation = 
{
	lat: 0, 
	lng: 0
};

// const codeLatLng = (lat, lng) =>
// {
// 	let latlng = new google.maps.LatLng(lat, lng);

// 	geocoder.geocode({'latLng': latlng}, (results, status) =>
// 	{
// 		if (status == google.maps.GeocoderStatus.OK) 
// 		{
// 			console.log(results)

// 			if (results[1]) 
// 			{
// 				//formatted address
// 				alert(results[0].formatted_address);

// 				//find country name
// 				for(let i=0; i<results[0].address_components.length; i++) 
// 				{
// 					for(let b=0; b<results[0].address_components[i].types.length;b++) 
// 					{

// 						//there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality 
// 						// type will be more appropriate.
						
// 						if(results[0].address_components[i].types[b] == "administrative_area_level_1") 
// 						{
// 							//this is the object you are looking for

// 							city = results[0].address_components[i];
							
// 							break;
// 						}
// 					}
// 				}
// 			} 
// 			else
// 			{ 
// 				alert("No results found");
// 			}
// 		}
// 		else
// 		{ 
// 			alert("Geocoder failed due to: " + status);
// 		}
// 	});
// }

// function showInMap(pos) {
//     var latlon = pos.coords.latitude + "," + pos.coords.longitude;

//     var img_url = "https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&markers=color:green%7Clabel:G%7C40.711614,-74.012318&markers=color:red%7Clabel:C%7C40.718217,-73.998284&key=";
//     var map = document.querySelector("#mapholder");
//     map.innerHTML = "<img src='"+img_url+"'>";
// }

locationBtn.addEventListener('click', event =>
{
	if( !('geolocation' in navigator) )
	return;
	
	let sawAlert = false;

	locationBtn.style.display = 'none';
	locationLoader.style.display = 'block';

	// Again this will ask for your permission. If you denies it then err block will execute.
	navigator.geolocation.getCurrentPosition(position =>
	{
		locationBtn.style.display = 'inline';
		locationLoader.style.display = 'none';
		
		fetchedLocation = 
		{
			lat: position.coords.latitude, 
			lng: position.coords.longitude
		};

		// showInMap(position);
		// codeLatLng(fetchedLocation.lat, fetchedLocation.lng)

		// Store the fetched address that had been given back by the Google Api. Google api took fetchedLocation and based on that it
		// fetched our address ( parsed address ).
		locationInput.value = "Ranchi";
		
		document.querySelector('#manual-location').classList.add('is-focused');
	},
	err => 
	{
		console.log(err);

		locationBtn.style.display = 'inline';
		locationLoader.style.display = 'none';

		if( !sawAlert ) 
		{
			alert('Couldn\'t fetch location, please enter manually !');
			sawAlert = true;
		}

		fetchedLocation = 
		{
			lat: 0, 
			lng: 0
		};
	}, 
	{
		// This is the third argument which says that for how much time should it will look for the user's location. If until that time
		// if it fails to get the location then err block will execute.
		timeout: 7000
	})
})

const initializeLocation = () => 
{
	if( !('geolocation' in navigator) )
	{
		locationBtn.style.display = 'none';
		geocoder = new google.maps.Geocoder();
	}
}

const initializeMedia = () =>
{
	// This is for the browsers that doesn't support mediaDevices so we added our own mediaDevices propert which is initially blank.
	if( !('mediaDevices' in navigator) )
	navigator.mediaDevices = {};

	// This is for the browsers that kind of support accessing camera but not through modern API like old versions of Mozilla or Safari.
	if( !('getUserMedia' in navigator.mediaDevices) ) 
	{
		// We added our getUserMedia property and intialize it with a function. It will basically use the old implementation as new 
		// modern API is not supported.
		navigator.mediaDevices.getUserMedia = constraints =>
		{
			// webkit is for Safari  and moz is for Mozilla
			let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

			// If the browser doesn't support camera reject it as an error.
			if( !getUserMedia ) 
			return Promise.reject(new Error('getUserMedia is not implemented!'));
			
			return new Promise((resolve, reject) =>
			{
				getUserMedia.call(navigator, constraints, resolve, reject);
			})
		}
	}

	// Before running it first time it asks for the permission whether it can access you media devices. If you decline it then below code
	// will never run.And if got permission then it will never ask again in future.
	navigator.mediaDevices.getUserMedia({ video: true })
	.then(stream =>
	{
		// This will on the camera i.e if using laptop then it will automatically switch on the flash ligh of the webcam.
		videoPlayer.srcObject = stream;
		videoPlayer.style.display = 'block';
	})
	.catch(err => 
	{
		imagePickerArea.style.display = 'block';
	})
}

captureButton.addEventListener('click', event =>
{
	canvasElement.style.display = 'block';
	videoPlayer.style.display = 'none';
	captureButton.style.display = 'none';

	// We are drawing 2D ( our current snapshot )on canvas.
	var context = canvasElement.getContext('2d');

	// 0,0 ---> defining the boundaries (dimensions) which is top=0 and lft=0.
	context.drawImage(videoPlayer, 0, 0, canvas.width, videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width));
	
	// To stop each streams which are running on the current video player which is 'videoPlayer'. getVideoTracks() will give us all 
	// the running video streams on that element.
	videoPlayer.srcObject.getVideoTracks().forEach(track => 
	{
		track.stop();
	})

	// toDataURL() method of canvasElement will given base 64 representation of the canvas image. 
	// dataURItoBlob() is a function defined in utility.js which will convert base 64 URL to a blob (file).
	picture = dataURItoBlob(canvasElement.toDataURL());
})

imagePicker.addEventListener('change', event =>
{
  	picture = event.target.files[0];
})

const openCreatePostModal = () => 
{
	// createPostArea.style.display = 'block';

	setTimeout(() =>
	{
    	createPostArea.style.transform = 'translateY(0)';
  	},1)

  	initializeMedia();
  	initializeLocation();

    if(deferredPrompt)
    {
        deferredPrompt.prompt();

        deferredPrompt.userChoice
        .then(choiceResult =>
        {
            console.log("ChoiceResult ", choiceResult.outcome);

            if(choiceResult.outcome === "dismissed")
            console.log("User cancelled the installation");
            else
            console.log("User added to homescreen");
        })
	}
	
	// if('serviceWorker' in navigator)
	// {
	// 	navigator.serviceWorker.getRegistrations()
	// 	.then(registrations =>
	// 	{
	// 		for(let i=0; i<registrations.length; i++)
	// 		{
	// 			console.log("Service Worker : ",registrations[i]);

	// 			registrations[i].unregister();
	// 		}
	// 	})
	// }
}

const closeCreatePostModal = () => 
{
  	imagePickerArea.style.display = 'none';
	videoPlayer.style.display = 'none';
	canvasElement.style.display = 'none';
	
	locationBtn.style.display = 'inline';
	locationLoader.style.display = 'none';
	captureButton.style.display = 'inline';
	
	if(videoPlayer.srcObject) 
	{
		videoPlayer.srcObject.getVideoTracks().forEach(track =>
		{
			track.stop();
		})
  	}
	
	setTimeout(() =>
	{
		createPostArea.style.transform = 'translateY(100vh)';
	},1)
}

shareImageButton.addEventListener('click', openCreatePostModal);

closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

// const onSaveButtonClicked = event =>
// {
//     console.log("Clicked");

//     if('caches' in window)
//     { console.log("dassda");
//         caches.open('user-requested')
//         .then(cache =>
//         {
//             cache.add('https://httpbin.org/get');
//             cache.add('/src/images/sf-boat.jpg');
//         })
//     }
// }

const clearCards = () =>
{
	while(sharedMomentsArea.hasChildNodes())
	sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
}

const createCard = data => 
{ 
	var cardWrapper = document.createElement('div');
	cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';
	
	var cardTitle = document.createElement('div');
	cardTitle.className = 'mdl-card__title';
	cardTitle.style.backgroundImage = 'url('+ data.image +')';
	cardTitle.style.backgroundSize = 'cover';
	cardTitle.style.height = '180px';
	cardWrapper.appendChild(cardTitle);
	
	var cardTitleTextElement = document.createElement('h2');
	cardTitleTextElement.className = 'mdl-card__title-text';
	cardTitleTextElement.textContent = data.title;
	cardTitle.appendChild(cardTitleTextElement);
	
	var cardSupportingText = document.createElement('div');
	cardSupportingText.className = 'mdl-card__supporting-text';
	cardSupportingText.textContent = data.location;
	cardSupportingText.style.textAlign = 'center';

	// var cardSaveButton = document.createElement('button');
	// cardSaveButton.textContent = "Save";
	// cardSupportingText.appendChild(cardSaveButton);

	// cardSaveButton.addEventListener('click',onSaveButtonClicked);

	cardWrapper.appendChild(cardSupportingText);
	componentHandler.upgradeElement(cardWrapper);
	sharedMomentsArea.appendChild(cardWrapper);
}

const updateUI = data =>
{
	clearCards();
	
	for(let key in data)
	createCard(data[key]);
}

let url = "https://firstfirebase-3e4d9.firebaseio.com/posts.json";
var networkDataReceived = false;

// From here request for url will first go to ' self.addEventListener('fetch', () => {....} ) ' .That is every request is intercepted by
// our service worker and then from there we will get back our response.
fetch(url)
.then(res =>
{
	console.log("feed ",res);

	return res.json();
})
.then(data =>
{
	console.log("From web");
	networkDataReceived = true;

	updateUI(data);
})
.catch(error =>
{
	throw error;
})

// Directly accessing indexedDB from this page without using SW. We can directly use all the methods of the utility.js without importing
// in this page as we have already imported ( using script tag ) in index.html page before importing feed.js .
if("indexedDB" in window)
{
	readAllData('posts')
	.then(data =>
	{
		if( !networkDataReceived )
		{
			console.log("From cache : ", data);

			updateUI(data);
		}
	})
}

const sendData = () =>
{
	var id = new Date().toISOString();
	
	// postData is a variable of type formData which contains key value pair and can also has a file.
	var postData = new FormData();

	postData.append('id', id);
	postData.append('title', titleInput.value);

	postData.append('location', locationInput.value);
	postData.append('rawLocationLat', fetchedLocation.lat);
	postData.append('rawLocationLng', fetchedLocation.lng);

	postData.append('file', picture, id + '.png');

	// This is the url of cloud functions i.e the endpoint where we are sending the request. Though we can directly do it without using cloud
	// functions as we did before.
	fetch('https://us-central1-firstfirebase-3e4d9.cloudfunctions.net/storePostsData', 
	{
		method: 'POST',
		body: postData
	})
	.then(res =>
	{
		console.log('Sent data', res);
		
		updateUI(res);
	})
}

form.addEventListener('submit', event =>
{
	event.preventDefault();
	
	if( titleInput.value.trim() === '' || locationInput.value.trim() === '' )
	{
		alert('Please enter a valid data');

		return;
	}

	closeCreatePostModal();

	// SyncManager interface of the SW API provides an interface for registering and listing sync registrations. It is used for 
	// background synchronisation features.
	if( 'serviceWorker' in navigator && 'SyncManager' in window ) 
	{	
		// navigator.serviceWorker.register('/sw.js',{ scope: './' })
		// .then(() =>
		// {
		// 	console.log("Service worker registered");
		// })
		
		// To access SW we used navigator.serviceWorker.ready and not direclty SW as we are not in sw.js page. Here we can't direclty
		// access the Sw so we used this approach. 'ready' signifies that when sW becomes ready.
		navigator.serviceWorker.ready
		.then(sw =>
		{
			let post = 
			{
				id: new Date().toISOString(),
				title: titleInput.value,
				location: locationInput.value,
				picture: picture,
          		rawLocation: fetchedLocation
			};

			// The sync manager doesn't have a built-in database, so we need to use one of the databases we already have so we used indexedDB.
			writeData('sync-posts', post)
			.then(() =>
			{
				// sync means 'SyncManager' and it allows us to register a synchronization task with the SW. register() accepts one 
				// argument : an id which clearly identifies a given synchronization task. It will trigger the 'sync' event in sw.js page.
				return sw.sync.register('sync-new-posts');
			})
			.then(() => 
			{
				// This then() is optional as in here we just showed the message with the help of material-lite.
				var snackbarContainer = document.querySelector('#confirmation-toast');
				var data = { message: 'Your Post was saved for syncing!' }

				snackbarContainer.MaterialSnackbar.showSnackbar(data);
			})
			.catch(err =>
			{
				console.log(err);
			});
		})
	} 
	else 
	{
		sendData();
	}
})