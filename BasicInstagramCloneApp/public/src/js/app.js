var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if(!window.Promise) 
{
  window.Promise = Promise;
}

// We are registering SW here in app.js file because this file is imported in all html files ( by script tag ) so that user can open whichever
// html page he wants else you need to write in each and every html page .

var deferredPrompt;

// Check that browser supports the SW or not. 'navigator' is simply a browser and we check that 'serviceWorker' is present in a browser or not.
if('serviceWorker' in navigator)
{
    navigator.serviceWorker.register('./sw.js')
    .then(() =>
    {
        console.log("Service worker registered");
    })
}

window.addEventListener("beforeinstallprompt", event =>
{
    event.preventDefault();
    deferredPrompt = event;

    return false;
})

const displayConfirmNotification = () => 
{
    if('serviceWorker' in navigator) 
    {
        // What things ( from options object ) to show to user depends on the user's device like mobile, pc etc.
        var options = 
        {
            body: 'You successfully subscribed to our Notification service!',
            icon: '/src/images/icons/app-icon-96x96.png',
            image: '/src/images/sf-boat.jpg',
            dir: 'ltr',
            lang: 'en-US', // BCP 47,
            
            // vibrate has an array where every adjacent elements signify vibrate and pause. Here 100ms for vibration , 50 ms for pause
            // and again 200 ms for vibration. 
            vibrate: [100, 50, 200],
            badge: '/src/images/icons/app-icon-96x96.png',
            
            // tag acts like an id for the notification. If you send more notifications from the same tag then they will not be displayed
            // within each other but stack onto each other. So basically, the latest information with the same tag will replace the previous
            // one with the same tag if you set your tag. Else notifications will be displayed beneath each other.
            tag: 'confirm-notification',
            
            // renotify if set to true ensures that even if you use the same tag, a new notification will still vibrate and alert the user.
            renotify: true,
            actions: 
            [
                { 
                    action: 'confirm', 
                    title: 'Okay', 
                    icon: 'https://cdn.pixabay.com/photo/2017/05/03/23/39/ok-2282499_960_720.png' 
                },
                { 
                    action: 'cancel', 
                    title: 'Cancel', 
                    icon: 'https://image.shutterstock.com/image-vector/cancel-icon-flat-illustration-vector-260nw-1474229684.jpg' 
                }
            ]
        };

        // ready will give you the current SW registration which is active ( 'swreg' say SW registration which is an active SW ).
        navigator.serviceWorker.ready
        .then(swreg =>
        {
            swreg.showNotification('Successfully subscribed !', options);
        })
    }
    else
    {
        var options = 
        {
            body: 'You successfully subscribed to our Notification service!'
        };

        new Notification('Successfully subscribed!', options);
    }
}

const configurePushSub = () =>
{
    if( !('serviceWorker' in navigator) ) 
    return;

    var reg;

    navigator.serviceWorker.ready
    .then(swreg =>
    {
        reg = swreg;

        // getSubscription() will return any existing subscriptions. Each browser device combination yields one subscription. If we
        // open two browsers in a same device then we will give separate SWs for separate browsers. Here we are checking this only.
        // Does this SW handled through this browser have an exisiting subscription for this device ?
        return swreg.pushManager.getSubscription();
    })
    .then(sub =>
    {
        // Creating a new subscription as no exisiting subscription is found as sub is undefined.
        if(sub === null) 
        { 
            var vapidPublicKey = 'BFQKaSkkkAkPyFrGpFxflHgW96RoPbhoNytaBCDAsFEdSXwSGHbJ5V6-_yHsx_kF758FDhZssuJ9AJRkEK9tLEI';
            
            // urlBase64ToUint8Array() will convert the URL base 64 to an array of unit 8 values. We are converting it because subscribe()
            // function accepts an array of unit 8 values.
            var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
            
            // subscribe() create a new subscription for the given browser on this device. If we have the old existing subscription then
            // it will render the old one useless. Subscription contains the endpoint of that browser vendor server to which we push our
            // push messages. Anyone with this endpoint can send msg to that server and this server will forward them our web app. If 
            // anyone finds out what our endpoints URL is, he can start sending msgs to our users in our app and these messages look like
            // they are coming from us therefore we need to protect this and we do it in two ways. Passing configuration to subscribe() :
            
            // if userVisibleOnly is set to true says that push notifications sent through our service are only visible to this user
            return reg.pushManager.subscribe(
            {
                userVisibleOnly: true,
                applicationServerKey: convertedVapidPublicKey
            });
        }
        else 
        {
            // We have a subscription
        }
    })
    .then(newSub =>
    {
        // Data stored in firebase will be in some other pattern. See once firebase to know about the pattern.
        return fetch('https://firstfirebase-3e4d9.firebaseio.com/subscriptions.json', 
        {
            method: 'POST',
            headers: 
            {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(newSub)
        })
    })
    .then(res =>
    {
        if( res.ok ) 
        {
            displayConfirmNotification();
        }
    })
    .catch(err =>
    {
        console.log(err);
    });
}

const askForNotificationPermission = () =>
{
    // requestPermission will show a prompt to the user asking him whether he wants to give us this permission to send or to display
    // notifications or not. If you ask for notifications permission you implicitly also get push permission. Push is the technique
    // of pushing messages from a server to the browser vendor server to your web app.
    Notification.requestPermission(result =>
    {
        console.log('User Choice', result);

        if( result !== 'granted' )
        console.log('No notification permission granted!');
        else
        configurePushSub();
    });
}

if( 'Notification' in window && 'serviceWorker' in navigator) 
{
    for(var i = 0; i < enableNotificationsButtons.length; i++) 
    {
        enableNotificationsButtons[i].style.display = 'inline-block';
        enableNotificationsButtons[i].addEventListener('click', askForNotificationPermission);
    }
}

// var promise = new Promise(function(resolve, reject) {
//   setTimeout(function() {
//     //resolve('This is executed once the timer is done!');
//     reject({code: 500, message: 'An error occurred!'});
//     //console.log('This is executed once the timer is done!');
//   }, 3000);
// });

// var xhr = new XMLHttpRequest();
// xhr.open('GET', 'https://httpbin.org/ip');
// xhr.responseType = 'json';

// xhr.onload = function() {
//   console.log(xhr.response);
// };

// xhr.onerror = function() {
//   console.log('Error!');
// };

// xhr.send();

// fetch('https://httpbin.org/ip')
//   .then(function(response) {
//     console.log(response);
//     return response.json();
//   })
//   .then(function(data) {
//     console.log(data);
//   })
//   .catch(function(err) {
//     console.log(err);
//   });

// fetch('https://httpbin.org/post', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json'
//   },
//   mode: 'cors',
//   body: JSON.stringify({message: 'Does this work?'})
// })
//   .then(function(response) {
//     console.log(response);
//     return response.json();
//   })
//   .then(function(data) {
//     console.log(data);
//   })
//   .catch(function(err) {
//     console.log(err);
//   });

// promise.then(function(text) {
//   return text;
// }, function(err) {
//   console.log(err.code, err.message)
// }).then(function(newText) {
//   console.log(newText);
// });

// promise.then(function(text) {
//   return text;
// }).then(function(newText) {
//   console.log(newText);
// }).catch(function(err) {
//   console.log(err.code, err.message);
// });

// console.log('This is executed right after setTimeout()');
